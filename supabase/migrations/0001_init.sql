-- Fut Campinho — schema inicial
-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > colar > Run.

-- =====================================================================
-- Tipos e tabelas
-- =====================================================================

create type public.papel_tipo as enum ('jogador', 'capitao', 'financeiro', 'presidente');

create table public.config (
  id int primary key default 1 check (id = 1),
  nome_grupo text not null default 'Fut Campinho',
  local_padrao text not null default 'Quadra',
  horario_padrao time not null default '20:30',
  vagas int not null default 18 check (vagas > 0),
  valor_mensalidade numeric(10,2) not null default 50 check (valor_mensalidade >= 0),
  dia_vencimento int not null default 5 check (dia_vencimento between 1 and 28)
);
insert into public.config default values;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nome text not null,
  apelido text,
  posicao text not null default 'MEI' check (posicao in ('GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA')),
  papel public.papel_tipo not null default 'jogador',
  mensalista boolean not null default true,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.rodadas (
  id bigint generated always as identity primary key,
  temporada int not null default extract(year from now())::int,
  numero int not null,
  data date not null,
  horario time not null,
  local text not null,
  status text not null default 'agendada' check (status in ('agendada', 'em_andamento', 'encerrada')),
  criado_em timestamptz not null default now(),
  unique (temporada, numero)
);

create table public.presencas (
  rodada_id bigint not null references public.rodadas on delete cascade,
  jogador_id uuid not null references public.profiles on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (rodada_id, jogador_id)
);

create table public.partidas (
  id bigint generated always as identity primary key,
  rodada_id bigint not null references public.rodadas on delete cascade,
  numero int not null,
  cor_a text not null,
  cor_b text not null,
  status text not null default 'ao_vivo' check (status in ('ao_vivo', 'encerrada')),
  iniciada_em timestamptz not null default now(),
  encerrada_em timestamptz,
  unique (rodada_id, numero)
);

create table public.partida_jogadores (
  partida_id bigint not null references public.partidas on delete cascade,
  jogador_id uuid not null references public.profiles on delete cascade,
  lado char(1) not null check (lado in ('A', 'B')),
  primary key (partida_id, jogador_id)
);

create table public.gols (
  id bigint generated always as identity primary key,
  partida_id bigint not null references public.partidas on delete cascade,
  lado char(1) not null check (lado in ('A', 'B')),
  autor_id uuid not null references public.profiles on delete cascade,
  assist_id uuid references public.profiles on delete set null,
  minuto int not null default 1,
  criado_em timestamptz not null default now(),
  check (assist_id is null or assist_id <> autor_id)
);

create table public.pagamentos (
  id bigint generated always as identity primary key,
  jogador_id uuid not null references public.profiles on delete cascade,
  competencia date not null, -- sempre o dia 1 do mês
  valor numeric(10,2) not null,
  pago_em date not null default current_date,
  metodo text not null default 'Pix',
  registrado_por uuid references public.profiles on delete set null,
  unique (jogador_id, competencia)
);

create table public.regras (
  id bigint generated always as identity primary key,
  ordem int not null default 0,
  categoria text not null check (categoria in ('Jogo', 'Times', 'Pagamento', 'Conduta')),
  titulo text not null,
  texto text not null,
  atualizado_por uuid references public.profiles on delete set null,
  atualizado_em timestamptz not null default now()
);

create index on public.partidas (rodada_id);
create index on public.gols (partida_id);
create index on public.gols (autor_id);
create index on public.gols (assist_id);
create index on public.partida_jogadores (jogador_id);
create index on public.pagamentos (competencia);

-- =====================================================================
-- Funções de papel
-- =====================================================================

create function public.tem_papel(papeis public.papel_tipo[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and papel = any (papeis));
$$;

create function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.tem_papel(array['capitao', 'presidente']::public.papel_tipo[]);
$$;

create function public.is_financeiro()
returns boolean language sql stable security definer set search_path = public as $$
  select public.tem_papel(array['financeiro', 'presidente']::public.papel_tipo[]);
$$;

-- Cria o perfil quando alguém se cadastra. O primeiro usuário vira presidente.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, papel)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    case when exists (select 1 from public.profiles) then 'jogador'::public.papel_tipo
         else 'presidente'::public.papel_tipo end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Jogador comum pode editar nome/apelido/posição, mas não papel, mensalidade ou status.
create function public.proteger_campos_perfil()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() and (
       new.papel is distinct from old.papel
    or new.mensalista is distinct from old.mensalista
    or new.ativo is distinct from old.ativo) then
    raise exception 'Somente capitão ou presidente pode alterar papel, mensalidade ou status.';
  end if;
  if auth.uid() is not null and new.papel = 'presidente' and old.papel <> 'presidente'
     and not public.tem_papel(array['presidente']::public.papel_tipo[]) then
    raise exception 'Somente o presidente pode nomear outro presidente.';
  end if;
  return new;
end $$;

create trigger profiles_proteger
  before update on public.profiles
  for each row execute function public.proteger_campos_perfil();

-- =====================================================================
-- Views de estatística (respeitam RLS de quem consulta)
-- =====================================================================

create view public.v_partida_placar with (security_invoker = true) as
select p.id, p.rodada_id, p.numero, p.cor_a, p.cor_b, p.status, p.iniciada_em, p.encerrada_em,
       count(g.id) filter (where g.lado = 'A')::int as gols_a,
       count(g.id) filter (where g.lado = 'B')::int as gols_b
from public.partidas p
left join public.gols g on g.partida_id = p.id
group by p.id;

-- Pontos: vitória 3 · empate 1 · gol 2 · assistência 1
create view public.v_stats_rodada with (security_invoker = true) as
with eventos as (
  select p.rodada_id, pj.jogador_id,
         (p.status = 'encerrada' and ((pj.lado = 'A' and pl.gols_a > pl.gols_b) or (pj.lado = 'B' and pl.gols_b > pl.gols_a)))::int as v,
         (p.status = 'encerrada' and pl.gols_a = pl.gols_b)::int as e,
         (p.status = 'encerrada' and ((pj.lado = 'A' and pl.gols_a < pl.gols_b) or (pj.lado = 'B' and pl.gols_b < pl.gols_a)))::int as d,
         1 as jogos, 0 as gols, 0 as assist
  from public.partida_jogadores pj
  join public.partidas p on p.id = pj.partida_id
  join public.v_partida_placar pl on pl.id = p.id
  union all
  select p.rodada_id, g.autor_id, 0, 0, 0, 0, 1, 0
  from public.gols g join public.partidas p on p.id = g.partida_id
  union all
  select p.rodada_id, g.assist_id, 0, 0, 0, 0, 0, 1
  from public.gols g join public.partidas p on p.id = g.partida_id
  where g.assist_id is not null
)
select ev.rodada_id, r.temporada, r.numero, r.data, r.status as rodada_status, ev.jogador_id,
       coalesce(nullif(pr.apelido, ''), pr.nome) as nome,
       sum(ev.v)::int as v, sum(ev.e)::int as e, sum(ev.d)::int as d,
       sum(ev.jogos)::int as jogos, sum(ev.gols)::int as gols, sum(ev.assist)::int as assist,
       (sum(ev.v) * 3 + sum(ev.e) + sum(ev.gols) * 2 + sum(ev.assist))::int as pts
from eventos ev
join public.rodadas r on r.id = ev.rodada_id
join public.profiles pr on pr.id = ev.jogador_id
group by ev.rodada_id, r.temporada, r.numero, r.data, r.status, ev.jogador_id, pr.apelido, pr.nome;

create view public.v_ranking_temporada with (security_invoker = true) as
select temporada, jogador_id, nome,
       sum(v)::int as v, sum(e)::int as e, sum(d)::int as d, sum(jogos)::int as jogos,
       sum(gols)::int as gols, sum(assist)::int as assist, sum(pts)::int as pts,
       count(*)::int as rodadas
from public.v_stats_rodada
group by temporada, jogador_id, nome;

-- Craque (Man of the Match) de cada rodada encerrada
create view public.v_craque_rodada with (security_invoker = true) as
select distinct on (rodada_id) *
from public.v_stats_rodada
where rodada_status = 'encerrada'
order by rodada_id, pts desc, gols desc, assist desc, v desc;

-- =====================================================================
-- RLS
-- =====================================================================

alter table public.config enable row level security;
alter table public.profiles enable row level security;
alter table public.rodadas enable row level security;
alter table public.presencas enable row level security;
alter table public.partidas enable row level security;
alter table public.partida_jogadores enable row level security;
alter table public.gols enable row level security;
alter table public.pagamentos enable row level security;
alter table public.regras enable row level security;

-- Leitura: qualquer jogador logado
create policy "ler" on public.config for select to authenticated using (true);
create policy "ler" on public.profiles for select to authenticated using (true);
create policy "ler" on public.rodadas for select to authenticated using (true);
create policy "ler" on public.presencas for select to authenticated using (true);
create policy "ler" on public.partidas for select to authenticated using (true);
create policy "ler" on public.partida_jogadores for select to authenticated using (true);
create policy "ler" on public.gols for select to authenticated using (true);
create policy "ler" on public.regras for select to authenticated using (true);
-- Pagamentos: cada um vê o seu; financeiro, presidente e capitão veem todos
create policy "ler" on public.pagamentos for select to authenticated
  using (jogador_id = auth.uid() or public.is_financeiro() or public.is_admin());

-- Escrita
create policy "admin altera" on public.config for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "dono ou admin altera" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy "admin escreve" on public.rodadas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin escreve" on public.partidas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin escreve" on public.partida_jogadores for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin escreve" on public.gols for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin escreve" on public.regras for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "confirma a propria presenca" on public.presencas for insert to authenticated
  with check (jogador_id = auth.uid() or public.is_admin());
create policy "cancela a propria presenca" on public.presencas for delete to authenticated
  using (jogador_id = auth.uid() or public.is_admin());

create policy "financeiro escreve" on public.pagamentos for all to authenticated
  using (public.is_financeiro()) with check (public.is_financeiro());

grant select on public.v_partida_placar, public.v_stats_rodada, public.v_ranking_temporada, public.v_craque_rodada to authenticated;

-- Placar ao vivo
alter publication supabase_realtime add table public.gols, public.partidas;

-- =====================================================================
-- Regras iniciais (do protótipo) — edite no app depois
-- =====================================================================

insert into public.regras (ordem, categoria, titulo, texto) values
  (1, 'Jogo', 'Duração da partida', 'Cada jogo dura 7 minutos ou termina quando um time fizer 2 gols. Empate no tempo: sai quem estava há mais tempo em campo.'),
  (2, 'Times', 'Quem ganha fica', 'O vencedor continua, até o limite de 2 vitórias seguidas. Depois disso, sai para o próximo time entrar.'),
  (3, 'Times', 'Montagem dos times', 'Os times são sorteados na chegada, por ordem de confirmação no app. Quem não confirmou entra na fila de espera.'),
  (4, 'Jogo', 'Goleiro e saída de bola', 'Goleiro fixo por time. Tiro de meta com a mão, sem passar do meio de campo direto.'),
  (5, 'Pagamento', 'Mensalidade e avulso', 'Mensalidade até o dia 5. Quem não é mensalista paga o avulso antes de entrar em campo.'),
  (6, 'Conduta', 'Respeito em campo', 'Sem carrinho e sem discussão com o capitão. Reincidência pode tirar o jogador da próxima rodada.');
