-- Fut Campinho — 0006: onboarding, identidade do grupo, coletes, agenda semanal e limites de cargos
--
-- * Todo mundo entra como jogador. Cargos: 1 presidente e até 2 capitães.
-- * O presidente configura o grupo (nome, escudo, cores, coletes, dia/horário, mensalidade).
-- * Cada jogador faz um onboarding curto: avatar, posição, apelido e um tour do app.
-- * Rodadas semanais: o app agenda a próxima sozinho e ela começa no horário configurado.
--   O fim da rodada continua manual (às vezes acaba antes, às vezes estende).

-- =====================================================================
-- Configuração do grupo
-- =====================================================================

alter table public.config add column if not exists logo_url text;
alter table public.config add column if not exists cor_primaria text not null default '#FDE819'
  check (cor_primaria ~ '^#[0-9A-Fa-f]{6}$');
alter table public.config add column if not exists cor_destaque text not null default '#FD6201'
  check (cor_destaque ~ '^#[0-9A-Fa-f]{6}$');
alter table public.config add column if not exists coletes text[] not null default '{Preto,Verde}'
  check (cardinality(coletes) >= 2);
alter table public.config add column if not exists dia_semana int not null default 1 check (dia_semana between 0 and 6);
alter table public.config add column if not exists configurado_em timestamptz;

-- Fut Campinho: coletes Preto e Verde, toda segunda às 18h50.
-- configurado_em fica vazio para o presidente revisar tudo no onboarding dele.
update public.config set coletes = '{Preto,Verde}', dia_semana = 1, horario_padrao = '18:50' where id = 1;

-- Nome, escudo e cores aparecem na tela de login (antes de entrar)
drop policy if exists "ler sem login" on public.config;
create policy "ler sem login" on public.config for select to anon using (true);

-- =====================================================================
-- Perfil: avatar e onboarding
-- =====================================================================

alter table public.profiles add column if not exists avatar text;
alter table public.profiles add column if not exists onboarding_em timestamptz;

-- =====================================================================
-- Rodadas: horário real de início e fim
-- =====================================================================

alter table public.rodadas add column if not exists iniciada_em timestamptz;
alter table public.rodadas add column if not exists encerrada_em timestamptz;

create or replace function public.rodada_horarios()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'em_andamento' and (tg_op = 'INSERT' or old.status is distinct from 'em_andamento') then
    new.iniciada_em := coalesce(new.iniciada_em, now());
  end if;
  if new.status = 'encerrada' and (tg_op = 'INSERT' or old.status is distinct from 'encerrada') then
    new.encerrada_em := coalesce(new.encerrada_em, now());
  end if;
  return new;
end $$;
drop trigger if exists rodadas_horarios on public.rodadas;
create trigger rodadas_horarios before insert or update on public.rodadas
  for each row execute function public.rodada_horarios();

-- Coletes antigos do protótipo -> coletes reais do grupo
update public.partidas set cor_a = 'Preto' where cor_a = 'Laranja';
update public.partidas set cor_b = 'Verde' where cor_b = 'Branco';

-- Agenda: chamada ao abrir o app. Começa a rodada no horário e agenda a próxima.
create or replace function public.garantir_rodada()
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.config;
  agora timestamp := now() at time zone 'America/Sao_Paulo';
  hoje date := agora::date;
  d date;
  v_temp int;
  v_num int;
begin
  if auth.uid() is null or public.meu_perfil_id() is null then return; end if;
  perform pg_advisory_xact_lock(780031);
  select * into c from public.config where id = 1;

  -- Rodada agendada que passou sem nenhum jogo: descarta
  delete from public.rodadas r
   where r.status = 'agendada' and r.data < hoje
     and not exists (select 1 from public.partidas p where p.rodada_id = r.id);

  -- Chegou o horário: começa sozinha
  update public.rodadas
     set status = 'em_andamento'
   where status = 'agendada' and (data + horario) <= agora;

  -- Nenhuma rodada em aberto: agenda a próxima no dia da semana do grupo
  if not exists (select 1 from public.rodadas where status in ('agendada', 'em_andamento')) then
    d := hoje + ((c.dia_semana - extract(dow from hoje)::int + 7) % 7);
    if exists (select 1 from public.rodadas where data = d) then d := d + 7; end if;
    v_temp := extract(year from d)::int;
    select coalesce(max(numero), 0) + 1 into v_num from public.rodadas where temporada = v_temp;
    insert into public.rodadas (temporada, numero, data, horario, local)
    values (v_temp, v_num, d, c.horario_padrao, c.local_padrao)
    on conflict (temporada, numero) do nothing;
  end if;
end $$;
revoke all on function public.garantir_rodada() from public, anon;
grant execute on function public.garantir_rodada() to authenticated;

-- =====================================================================
-- Cargos: 1 presidente, até 2 capitães
-- =====================================================================

-- Se já houver mais de um presidente, fica o que já entrou no app
update public.profiles p set papel = 'jogador'
 where p.papel = 'presidente'
   and p.id <> (select id from public.profiles where papel = 'presidente' order by (user_id is null), criado_em limit 1);

create unique index if not exists profiles_um_presidente on public.profiles ((true)) where papel = 'presidente';

create or replace function public.is_presidente()
returns boolean language sql stable security definer set search_path = public as $$
  select public.tem_papel(array['presidente']::public.papel_tipo[]);
$$;
revoke execute on function public.is_presidente() from anon;

create or replace function public.limitar_cargos()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.papel = 'presidente' and exists (select 1 from public.profiles where papel = 'presidente' and id <> new.id) then
    raise exception 'O grupo já tem um presidente. Para trocar, o presidente atual usa "Passar a presidência".';
  end if;
  if new.papel = 'capitao' and (tg_op = 'INSERT' or old.papel is distinct from 'capitao')
     and (select count(*) from public.profiles where papel = 'capitao' and id <> new.id) >= 2 then
    raise exception 'O grupo já tem 2 capitães. Tire um deles antes de nomear outro.';
  end if;
  return new;
end $$;
drop trigger if exists profiles_limitar_cargos on public.profiles;
create trigger profiles_limitar_cargos before insert or update of papel on public.profiles
  for each row execute function public.limitar_cargos();

-- Quem pode mexer em quê no perfil
create or replace function public.proteger_campos_perfil()
returns trigger language plpgsql set search_path = public as $$
declare
  v_transfer boolean := coalesce(current_setting('fut.transfer', true), '') = '1';
  v_reset boolean := coalesce(current_setting('fut.reset', true), '') = '1';
begin
  if auth.uid() is not null and not v_transfer and not public.is_admin() and (
       new.papel is distinct from old.papel
    or new.mensalista is distinct from old.mensalista
    or new.ativo is distinct from old.ativo
    or new.telefone is distinct from old.telefone
    or new.login_liberado is distinct from old.login_liberado
    or (new.user_id is distinct from old.user_id and not v_reset)) then
    raise exception 'Somente capitão ou presidente pode alterar cargo, telefone, acesso, mensalidade ou status.';
  end if;
  if auth.uid() is not null and new.user_id is distinct from old.user_id and not v_reset then
    raise exception 'Use "Resetar acesso" para desligar a conta de um jogador.';
  end if;
  if auth.uid() is not null and not v_transfer and new.papel is distinct from old.papel then
    if new.papel = 'presidente' or old.papel = 'presidente' then
      raise exception 'Para trocar o presidente, o presidente atual usa "Passar a presidência".';
    end if;
    if (new.papel = 'capitao' or old.papel = 'capitao') and not public.is_presidente() then
      raise exception 'Somente o presidente nomeia ou tira capitães.';
    end if;
  end if;
  new.telefone := public.normalizar_telefone(new.telefone);
  return new;
end $$;

-- O presidente passa o cargo para outro jogador e vira jogador
create or replace function public.passar_presidencia(p_novo uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_eu uuid := public.meu_perfil_id();
begin
  if not public.is_presidente() then
    raise exception 'Somente o presidente pode passar a presidência.';
  end if;
  if p_novo is null or p_novo = v_eu then
    raise exception 'Escolha outro jogador.';
  end if;
  if not exists (select 1 from public.profiles where id = p_novo and ativo) then
    raise exception 'Jogador não encontrado ou inativo.';
  end if;
  perform set_config('fut.transfer', '1', true);
  update public.profiles set papel = 'jogador' where id = v_eu;
  update public.profiles set papel = 'presidente' where id = p_novo;
end $$;
revoke all on function public.passar_presidencia(uuid) from public, anon;
grant execute on function public.passar_presidencia(uuid) to authenticated;

-- Configuração só o presidente marca como concluída; capitães continuam ajustando o resto
-- (a política de update de config segue sendo de capitão/presidente)

-- =====================================================================
-- Escudo do grupo (Storage)
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marca', 'marca', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "marca: presidente envia" on storage.objects;
create policy "marca: presidente envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'marca' and public.is_presidente());
drop policy if exists "marca: presidente troca" on storage.objects;
create policy "marca: presidente troca" on storage.objects for update to authenticated
  using (bucket_id = 'marca' and public.is_presidente());
drop policy if exists "marca: presidente apaga" on storage.objects;
create policy "marca: presidente apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'marca' and public.is_presidente());

-- =====================================================================
-- Avatar nas estatísticas (ranking, craque)
-- =====================================================================

create or replace view public.v_stats_rodada with (security_invoker = true) as
with eventos as (
  select p.rodada_id, pj.jogador_id,
         (p.status = 'encerrada' and not p.conferir and ((pj.lado = 'A' and pl.gols_a > pl.gols_b) or (pj.lado = 'B' and pl.gols_b > pl.gols_a)))::int as v,
         (p.status = 'encerrada' and not p.conferir and pl.gols_a = pl.gols_b)::int as e,
         (p.status = 'encerrada' and not p.conferir and ((pj.lado = 'A' and pl.gols_a < pl.gols_b) or (pj.lado = 'B' and pl.gols_b < pl.gols_a)))::int as d,
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
       (sum(ev.v) * 3 + sum(ev.e) + sum(ev.gols) * 2 + sum(ev.assist))::int as pts,
       pr.avatar
from eventos ev
join public.rodadas r on r.id = ev.rodada_id
join public.profiles pr on pr.id = ev.jogador_id
group by ev.rodada_id, r.temporada, r.numero, r.data, r.status, ev.jogador_id, pr.apelido, pr.nome, pr.avatar;

create or replace view public.v_ranking_temporada with (security_invoker = true) as
select temporada, jogador_id, nome,
       sum(v)::int as v, sum(e)::int as e, sum(d)::int as d, sum(jogos)::int as jogos,
       sum(gols)::int as gols, sum(assist)::int as assist, sum(pts)::int as pts,
       count(*)::int as rodadas,
       avatar
from public.v_stats_rodada
group by temporada, jogador_id, nome, avatar;

create or replace view public.v_craque_rodada with (security_invoker = true) as
select distinct on (rodada_id) *
from public.v_stats_rodada
where rodada_status = 'encerrada'
order by rodada_id, pts desc, gols desc, assist desc, v desc;
