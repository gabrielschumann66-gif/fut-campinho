-- Fut Campinho — 0002: jogadores pré-cadastrados e acesso por convite (telefone + PIN)
--
-- Antes: cada perfil nascia de uma conta (profiles.id = auth.users.id).
-- Agora: capitão/presidente cadastra o jogador (nome + telefone) sem conta.
-- Quando o acesso dele é liberado, ele faz o "primeiro acesso" com o telefone e cria um PIN;
-- a conta é ligada ao perfil pelo telefone (profiles.user_id).

-- =====================================================================
-- Perfis independentes de conta
-- =====================================================================

alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();

alter table public.profiles add column if not exists user_id uuid unique references auth.users on delete set null;
alter table public.profiles add column if not exists telefone text unique check (telefone ~ '^[0-9]{10,13}$');
alter table public.profiles add column if not exists login_liberado boolean not null default false;

-- Contas que já existiam continuam ligadas ao mesmo perfil
update public.profiles set user_id = id, login_liberado = true where user_id is null and exists (select 1 from auth.users u where u.id = profiles.id);

-- Partidas lançadas depois do jogo, com times ainda a conferir
alter table public.partidas add column if not exists conferir boolean not null default false;

-- =====================================================================
-- Funções de papel (agora pelo user_id)
-- =====================================================================

create or replace function public.meu_perfil_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where user_id = auth.uid();
$$;

create or replace function public.tem_papel(papeis public.papel_tipo[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and papel = any (papeis));
$$;

-- Normaliza telefone: só dígitos, com 55 na frente
create or replace function public.normalizar_telefone(t text)
returns text language sql immutable as $$
  select case
    when d is null or d = '' then null
    when length(d) in (10, 11) then '55' || d
    else d
  end
  from (select regexp_replace(coalesce(t, ''), '\D', '', 'g') as d) x;
$$;

-- =====================================================================
-- Nova conta: só entra quem tem convite (telefone cadastrado e acesso liberado)
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tel text := public.normalizar_telefone(new.raw_user_meta_data ->> 'telefone');
  v_id uuid;
begin
  update public.profiles
     set user_id = new.id
   where telefone = v_tel and login_liberado and user_id is null
  returning id into v_id;
  if v_id is null then
    raise exception 'Telefone sem convite. Peça para um capitão liberar seu acesso.';
  end if;
  return new;
end $$;

-- Status do telefone na tela de login (pode ser chamado sem estar logado)
create or replace function public.status_acesso(p_telefone text)
returns table (nome text, status text)
language sql stable security definer set search_path = public as $$
  select split_part(coalesce(nullif(p.apelido, ''), p.nome), ' ', 1),
         case when p.user_id is not null then 'ativo'
              when p.login_liberado then 'primeiro_acesso'
              else 'sem_convite' end
  from public.profiles p
  where p.telefone = public.normalizar_telefone(p_telefone) and p.ativo;
$$;
revoke all on function public.status_acesso(text) from public;
grant execute on function public.status_acesso(text) to anon, authenticated;

-- Capitão/presidente zera o acesso de alguém (esqueceu o PIN, trocou de celular).
-- A pessoa refaz o primeiro acesso com o mesmo telefone.
create or replace function public.resetar_acesso(p_perfil uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if not public.is_admin() then
    raise exception 'Somente capitão ou presidente pode resetar acessos.';
  end if;
  select user_id into v_user from public.profiles where id = p_perfil;
  if v_user = auth.uid() then
    raise exception 'Você não pode resetar o próprio acesso.';
  end if;
  perform set_config('fut.reset', '1', true);
  update public.profiles set user_id = null where id = p_perfil;
  if v_user is not null then
    delete from auth.users where id = v_user;
  end if;
end $$;
revoke all on function public.resetar_acesso(uuid) from public;
grant execute on function public.resetar_acesso(uuid) to authenticated;

-- Jogador comum edita nome/apelido/posição; o resto é com capitão/presidente.
create or replace function public.proteger_campos_perfil()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() and (
       new.papel is distinct from old.papel
    or new.mensalista is distinct from old.mensalista
    or new.ativo is distinct from old.ativo
    or new.telefone is distinct from old.telefone
    or new.login_liberado is distinct from old.login_liberado
    or (new.user_id is distinct from old.user_id and coalesce(current_setting('fut.reset', true), '') <> '1')) then
    raise exception 'Somente capitão ou presidente pode alterar papel, telefone, acesso, mensalidade ou status.';
  end if;
  if auth.uid() is not null and new.user_id is distinct from old.user_id
     and coalesce(current_setting('fut.reset', true), '') <> '1' then
    raise exception 'Use "Resetar acesso" para desligar a conta de um jogador.';
  end if;
  if auth.uid() is not null and new.papel = 'presidente' and old.papel <> 'presidente'
     and not public.tem_papel(array['presidente']::public.papel_tipo[]) then
    raise exception 'Somente o presidente pode nomear outro presidente.';
  end if;
  new.telefone := public.normalizar_telefone(new.telefone);
  return new;
end $$;

create or replace function public.normalizar_telefone_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  new.telefone := public.normalizar_telefone(new.telefone);
  return new;
end $$;
drop trigger if exists profiles_normalizar on public.profiles;
create trigger profiles_normalizar
  before insert on public.profiles
  for each row execute function public.normalizar_telefone_insert();

-- =====================================================================
-- RLS: trocar auth.uid() por meu_perfil_id() onde o alvo é um perfil
-- =====================================================================

drop policy if exists "dono ou admin altera" on public.profiles;
create policy "dono ou admin altera" on public.profiles for update to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "admin cadastra" on public.profiles;
create policy "admin cadastra" on public.profiles for insert to authenticated with check (public.is_admin());
drop policy if exists "admin exclui" on public.profiles;
create policy "admin exclui" on public.profiles for delete to authenticated using (public.is_admin() and user_id is distinct from auth.uid());

drop policy if exists "confirma a propria presenca" on public.presencas;
create policy "confirma a propria presenca" on public.presencas for insert to authenticated
  with check (jogador_id = public.meu_perfil_id() or public.is_admin());
drop policy if exists "cancela a propria presenca" on public.presencas;
create policy "cancela a propria presenca" on public.presencas for delete to authenticated
  using (jogador_id = public.meu_perfil_id() or public.is_admin());

drop policy if exists "ler" on public.pagamentos;
create policy "ler" on public.pagamentos for select to authenticated
  using (jogador_id = public.meu_perfil_id() or public.is_financeiro() or public.is_admin());

-- =====================================================================
-- Estatísticas: partidas "a conferir" não contam vitória/derrota
-- (gols e assistências contam normalmente)
-- =====================================================================

create or replace view public.v_partida_placar with (security_invoker = true) as
select p.id, p.rodada_id, p.numero, p.cor_a, p.cor_b, p.status, p.iniciada_em, p.encerrada_em,
       count(g.id) filter (where g.lado = 'A')::int as gols_a,
       count(g.id) filter (where g.lado = 'B')::int as gols_b,
       p.conferir
from public.partidas p
left join public.gols g on g.partida_id = p.id
group by p.id;

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
       (sum(ev.v) * 3 + sum(ev.e) + sum(ev.gols) * 2 + sum(ev.assist))::int as pts
from eventos ev
join public.rodadas r on r.id = ev.rodada_id
join public.profiles pr on pr.id = ev.jogador_id
group by ev.rodada_id, r.temporada, r.numero, r.data, r.status, ev.jogador_id, pr.apelido, pr.nome;
