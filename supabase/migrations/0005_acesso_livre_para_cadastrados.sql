-- Fut Campinho — 0005: todo jogador cadastrado com celular já pode entrar.
-- No primeiro acesso ele só cria o PIN e já vê os próprios números. O capitão pode bloquear alguém se precisar.
alter table public.profiles alter column login_liberado set default true;
update public.profiles set login_liberado = true where not login_liberado;
