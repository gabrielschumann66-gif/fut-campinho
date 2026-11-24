-- Fut Campinho — 0007
-- * Nova pontuação: Vitória 4 · Empate 2 · Gol 8 · Assistência 5 · Ação de defesa 2
-- * Ações de defesa registradas ao vivo (desarme, corte, defesa do goleiro)
-- * Foto de perfil (bucket "avatares"); tema das iniciais fica em profiles.avatar como "tema:<id>"
-- * Cor de fundo da arte do craque (o app em si mantém sempre a marca Fut Campinho)

-- =====================================================================
-- Ações de defesa
-- =====================================================================
create table if not exists public.defesas (
  id bigint generated always as identity primary key,
  partida_id bigint not null references public.partidas on delete cascade,
  lado char(1) not null check (lado in ('A', 'B')),
  jogador_id uuid not null references public.profiles on delete cascade,
  minuto int not null default 1,
  criado_em timestamptz not null default now()
);
create index if not exists defesas_partida_idx on public.defesas (partida_id);
create index if not exists defesas_jogador_idx on public.defesas (jogador_id);

alter table public.defesas enable row level security;
drop policy if exists "ler" on public.defesas;
create policy "ler" on public.defesas for select to authenticated using (true);
drop policy if exists "admin escreve" on public.defesas;
create policy "admin escreve" on public.defesas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

do $$ begin
  alter publication supabase_realtime add table public.defesas;
exception when duplicate_object then null; end $$;

-- =====================================================================
-- Estatísticas com a pontuação nova
-- =====================================================================
drop view if exists public.v_craque_rodada;
drop view if exists public.v_ranking_temporada;
drop view if exists public.v_stats_rodada;

create view public.v_stats_rodada with (security_invoker = true) as
with eventos as (
  select p.rodada_id, pj.jogador_id,
         (p.status = 'encerrada' and not p.conferir and ((pj.lado = 'A' and pl.gols_a > pl.gols_b) or (pj.lado = 'B' and pl.gols_b > pl.gols_a)))::int as v,
         (p.status = 'encerrada' and not p.conferir and pl.gols_a = pl.gols_b)::int as e,
         (p.status = 'encerrada' and not p.conferir and ((pj.lado = 'A' and pl.gols_a < pl.gols_b) or (pj.lado = 'B' and pl.gols_b < pl.gols_a)))::int as d,
         1 as jogos, 0 as gols, 0 as assist, 0 as defesas
  from public.partida_jogadores pj
  join public.partidas p on p.id = pj.partida_id
  join public.v_partida_placar pl on pl.id = p.id
  union all
  select p.rodada_id, g.autor_id, 0, 0, 0, 0, 1, 0, 0
  from public.gols g join public.partidas p on p.id = g.partida_id
  union all
  select p.rodada_id, g.assist_id, 0, 0, 0, 0, 0, 1, 0
  from public.gols g join public.partidas p on p.id = g.partida_id
  where g.assist_id is not null
  union all
  select p.rodada_id, df.jogador_id, 0, 0, 0, 0, 0, 0, 1
  from public.defesas df join public.partidas p on p.id = df.partida_id
)
select ev.rodada_id, r.temporada, r.numero, r.data, r.status as rodada_status, ev.jogador_id,
       coalesce(nullif(pr.apelido, ''), pr.nome) as nome,
       sum(ev.v)::int as v, sum(ev.e)::int as e, sum(ev.d)::int as d,
       sum(ev.jogos)::int as jogos, sum(ev.gols)::int as gols, sum(ev.assist)::int as assist,
       (sum(ev.v) * 4 + sum(ev.e) * 2 + sum(ev.gols) * 8 + sum(ev.assist) * 5 + sum(ev.defesas) * 2)::int as pts,
       pr.avatar,
       sum(ev.defesas)::int as defesas
from eventos ev
join public.rodadas r on r.id = ev.rodada_id
join public.profiles pr on pr.id = ev.jogador_id
group by ev.rodada_id, r.temporada, r.numero, r.data, r.status, ev.jogador_id, pr.apelido, pr.nome, pr.avatar;

create view public.v_ranking_temporada with (security_invoker = true) as
select temporada, jogador_id, nome,
       sum(v)::int as v, sum(e)::int as e, sum(d)::int as d, sum(jogos)::int as jogos,
       sum(gols)::int as gols, sum(assist)::int as assist, sum(pts)::int as pts,
       count(*)::int as rodadas,
       avatar,
       sum(defesas)::int as defesas
from public.v_stats_rodada
group by temporada, jogador_id, nome, avatar;

create view public.v_craque_rodada with (security_invoker = true) as
select distinct on (rodada_id) *
from public.v_stats_rodada
where rodada_status = 'encerrada'
order by rodada_id, pts desc, gols desc, assist desc, v desc;

grant select on public.v_stats_rodada, public.v_ranking_temporada, public.v_craque_rodada to authenticated;

-- =====================================================================
-- Marca fixa do app + cor da arte do craque
-- =====================================================================
alter table public.config add column if not exists cor_arte text not null default '#FD6201';
update public.config set cor_primaria = '#FDE819', cor_destaque = '#FD6201';

-- Avatares antigos (desenhos) viram iniciais no tema padrão
update public.profiles set avatar = null where avatar is not null and avatar not like 'tema:%' and avatar not like 'http%';

-- =====================================================================
-- Foto de perfil
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatares: dono ou admin envia" on storage.objects;
create policy "avatares: dono ou admin envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and ((storage.foldername(name))[1] = public.meu_perfil_id()::text or public.is_admin()));
drop policy if exists "avatares: dono ou admin troca" on storage.objects;
create policy "avatares: dono ou admin troca" on storage.objects for update to authenticated
  using (bucket_id = 'avatares' and ((storage.foldername(name))[1] = public.meu_perfil_id()::text or public.is_admin()));
drop policy if exists "avatares: dono ou admin apaga" on storage.objects;
create policy "avatares: dono ou admin apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and ((storage.foldername(name))[1] = public.meu_perfil_id()::text or public.is_admin()));
