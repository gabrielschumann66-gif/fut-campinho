-- Fut Campinho — 0003: "O jogo em 4 números" da página de Regras (editável em Gestão > Grupo)

alter table public.config add column if not exists duracao_min int not null default 7 check (duracao_min between 1 and 90);
alter table public.config add column if not exists gols_limite int not null default 2 check (gols_limite between 0 and 20);
alter table public.config add column if not exists formato text not null default '5×5';
alter table public.config add column if not exists max_vitorias int not null default 2 check (max_vitorias between 0 and 20);
