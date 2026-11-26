-- Fut Campinho — 0009: infrações que tiram pontos
-- * Ação de sebo: -2
-- * Mão proposital: -5
-- Registradas ao vivo pelo capitão, como as ações de defesa.

create table if not exists public.infracoes (
  id bigint generated always as identity primary key,
  partida_id bigint not null references public.partidas on delete cascade,
  lado char(1) not null check (lado in ('A', 'B')),
  jogador_id uuid not null references public.profiles on delete cascade,
  tipo text not null check (tipo in ('sebo', 'mao')),
  minuto int not null default 1,
  criado_em timestamptz not null default now()
);
create index if not exists infracoes_partida_idx on public.infracoes (partida_id);
create index if not exists infracoes_jogador_idx on public.infracoes (jogador_id);

alter table public.infracoes enable row level security;
revoke all on public.infracoes from anon;
revoke truncate, references, trigger on public.infracoes from authenticated;
drop policy if exists "ler" on public.infracoes;
create policy "ler" on public.infracoes for select to authenticated using (true);
drop policy if exists "admin escreve" on public.infracoes;
create policy "admin escreve" on public.infracoes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

do $$ begin
  alter publication supabase_realtime add table public.infracoes;
exception when duplicate_object then null; end $$;

-- Estatísticas: novas colunas no fim (sebo, mao) e pontos com os descontos
drop view if exists public.v_craque_rodada;
drop view if exists public.v_ranking_temporada;
drop view if exists public.v_stats_rodada;

create view public.v_stats_rodada with (security_invoker = true) as
with eventos as (
  select p.rodada_id, pj.jogador_id,
         (p.status = 'encerrada' and not p.conferir and ((pj.lado = 'A' and pl.gols_a > pl.gols_b) or (pj.lado = 'B' and pl.gols_b > pl.gols_a)))::int as v,
         (p.status = 'encerrada' and not p.conferir and pl.gols_a = pl.gols_b)::int as e,
         (p.status = 'encerrada' and not p.conferir and ((pj.lado = 'A' and pl.gols_a < pl.gols_b) or (pj.lado = 'B' and pl.gols_b < pl.gols_a)))::int as d,
         1 as jogos, 0 as gols, 0 as assist, 0 as defesas, 0 as sebo, 0 as mao
  from public.partida_jogadores pj
  join public.partidas p on p.id = pj.partida_id
  join public.v_partida_placar pl on pl.id = p.id
  union all
  select p.rodada_id, g.autor_id, 0, 0, 0, 0, 1, 0, 0, 0, 0
  from public.gols g join public.partidas p on p.id = g.partida_id
  union all
  select p.rodada_id, g.assist_id, 0, 0, 0, 0, 0, 1, 0, 0, 0
  from public.gols g join public.partidas p on p.id = g.partida_id
  where g.assist_id is not null
  union all
  select p.rodada_id, df.jogador_id, 0, 0, 0, 0, 0, 0, 1, 0, 0
  from public.defesas df join public.partidas p on p.id = df.partida_id
  union all
  select p.rodada_id, i.jogador_id, 0, 0, 0, 0, 0, 0, 0, (i.tipo = 'sebo')::int, (i.tipo = 'mao')::int
  from public.infracoes i join public.partidas p on p.id = i.partida_id
)
select ev.rodada_id, r.temporada, r.numero, r.data, r.status as rodada_status, ev.jogador_id,
       coalesce(nullif(pr.apelido, ''), pr.nome) as nome,
       sum(ev.v)::int as v, sum(ev.e)::int as e, sum(ev.d)::int as d,
       sum(ev.jogos)::int as jogos, sum(ev.gols)::int as gols, sum(ev.assist)::int as assist,
       (sum(ev.v) * 4 + sum(ev.e) * 2 + sum(ev.gols) * 8 + sum(ev.assist) * 5 + sum(ev.defesas) * 2
        - sum(ev.sebo) * 2 - sum(ev.mao) * 5)::int as pts,
       pr.avatar,
       sum(ev.defesas)::int as defesas,
       sum(ev.sebo)::int as sebo,
       sum(ev.mao)::int as mao
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
       sum(defesas)::int as defesas,
       sum(sebo)::int as sebo,
       sum(mao)::int as mao
from public.v_stats_rodada
group by temporada, jogador_id, nome, avatar;

create view public.v_craque_rodada with (security_invoker = true) as
select distinct on (rodada_id) *
from public.v_stats_rodada
where rodada_status = 'encerrada'
order by rodada_id, pts desc, gols desc, assist desc, v desc;

revoke all on public.v_stats_rodada, public.v_ranking_temporada, public.v_craque_rodada from anon;
grant select on public.v_stats_rodada, public.v_ranking_temporada, public.v_craque_rodada to authenticated;
