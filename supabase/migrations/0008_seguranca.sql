-- Fut Campinho — 0008: endurecimento de segurança
--
-- * Funções internas só para quem está logado (o "revoke from anon" da 0004 não bastava:
--   o EXECUTE continuava liberado via PUBLIC).
-- * Sem login, o banco só mostra nome, escudo e cores do grupo. Nada de local, horário ou valores.
-- * Hierarquia: capitão não mexe no presidente nem em outro capitão (resetar, excluir, telefone, bloquear).
-- * Conta nova só com o e-mail interno do próprio telefone.
-- * Tela de login com limite de tentativas por IP (evita varrer telefones).
-- * Limites de tamanho e formato nos textos e URLs de imagem.
-- * Escudo sem SVG (SVG pode carregar script).

-- =====================================================================
-- 1. Funções
-- =====================================================================

revoke execute on function
  public.is_admin(), public.is_financeiro(), public.is_presidente(), public.meu_perfil_id(),
  public.tem_papel(public.papel_tipo[]), public.garantir_rodada(),
  public.resetar_acesso(uuid), public.passar_presidencia(uuid)
from public, anon;
grant execute on function
  public.is_admin(), public.is_financeiro(), public.is_presidente(), public.meu_perfil_id(),
  public.tem_papel(public.papel_tipo[]), public.garantir_rodada(),
  public.resetar_acesso(uuid), public.passar_presidencia(uuid)
to authenticated, service_role;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Funções novas não nascem executáveis por todo mundo
alter default privileges in schema public revoke execute on functions from public, anon;

-- =====================================================================
-- 2. Tabelas: anon não lê nem escreve nada além do básico da config
-- =====================================================================

revoke all on all tables in schema public from anon;
grant select (id, nome_grupo, logo_url, cor_primaria, cor_destaque, cor_arte) on public.config to anon;
alter default privileges in schema public revoke all on tables from anon;

-- TRUNCATE ignora RLS: ninguém pela API precisa dele
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- =====================================================================
-- 3. Login: limite de consultas de telefone por IP
-- =====================================================================

create table if not exists public.tentativas_acesso (
  ip text not null,
  em timestamptz not null default now()
);
create index if not exists tentativas_acesso_ip_em on public.tentativas_acesso (ip, em);
alter table public.tentativas_acesso enable row level security;
revoke all on public.tentativas_acesso from anon, authenticated;

drop function if exists public.status_acesso(text);
create function public.status_acesso(p_telefone text)
returns table (nome text, status text)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_tel text := public.normalizar_telefone(p_telefone);
  v_h json := nullif(current_setting('request.headers', true), '')::json;
  v_ip text := nullif(trim(coalesce(
    v_h ->> 'cf-connecting-ip', v_h ->> 'x-real-ip', split_part(v_h ->> 'x-forwarded-for', ',', 1))), '');
begin
  if v_ip is not null then
    delete from public.tentativas_acesso where em < now() - interval '1 day';
    if (select count(*) from public.tentativas_acesso where ip = v_ip and em > now() - interval '10 minutes') >= 20 then
      raise exception 'Muitas tentativas. Espere alguns minutos e tente de novo.';
    end if;
    insert into public.tentativas_acesso (ip) values (v_ip);
  end if;
  if v_tel is null or length(v_tel) not between 12 and 13 then return; end if;
  return query
    select split_part(coalesce(nullif(p.apelido, ''), p.nome), ' ', 1),
           case when p.user_id is not null then 'ativo'
                when p.login_liberado then 'primeiro_acesso'
                else 'sem_convite' end
    from public.profiles p
    where p.telefone = v_tel and p.ativo;
end $$;
revoke all on function public.status_acesso(text) from public;
grant execute on function public.status_acesso(text) to anon, authenticated, service_role;

-- =====================================================================
-- 4. Conta nova: e-mail tem que ser o interno do próprio telefone
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tel text := public.normalizar_telefone(new.raw_user_meta_data ->> 'telefone');
  v_id uuid;
begin
  if v_tel is null or lower(new.email) is distinct from v_tel || '@fut.gabrielschumann.com.br' then
    raise exception 'Cadastro inválido.';
  end if;
  update public.profiles
     set user_id = new.id
   where telefone = v_tel and login_liberado and ativo and user_id is null
  returning id into v_id;
  if v_id is null then
    raise exception 'Telefone sem convite. Peça para um capitão liberar seu acesso.';
  end if;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- =====================================================================
-- 5. Hierarquia de cargos
-- =====================================================================

create or replace function public.proteger_campos_perfil()
returns trigger language plpgsql set search_path = public as $$
declare
  v_transfer boolean := coalesce(current_setting('fut.transfer', true), '') = '1';
  v_reset boolean := coalesce(current_setting('fut.reset', true), '') = '1';
begin
  new.telefone := public.normalizar_telefone(new.telefone);
  if auth.uid() is null then return new; end if; -- SQL do dono do banco

  if new.id is distinct from old.id then
    raise exception 'O id do perfil não muda.';
  end if;

  if not v_transfer and not public.is_admin() and (
       new.papel is distinct from old.papel
    or new.mensalista is distinct from old.mensalista
    or new.ativo is distinct from old.ativo
    or new.telefone is distinct from old.telefone
    or new.login_liberado is distinct from old.login_liberado
    or (new.user_id is distinct from old.user_id and not v_reset)) then
    raise exception 'Somente capitão ou presidente pode alterar cargo, telefone, acesso, mensalidade ou status.';
  end if;

  if new.user_id is distinct from old.user_id and not v_reset then
    raise exception 'Use "Resetar acesso" para desligar a conta de um jogador.';
  end if;

  -- Capitão não mexe nos dados de acesso do presidente nem de outro capitão
  if not v_transfer and not v_reset and not public.is_presidente()
     and old.papel in ('presidente', 'capitao') and old.user_id is distinct from auth.uid()
     and (new.telefone is distinct from old.telefone
       or new.ativo is distinct from old.ativo
       or new.login_liberado is distinct from old.login_liberado) then
    raise exception 'Somente o presidente altera telefone, acesso ou status de um capitão.';
  end if;

  if not v_transfer and new.papel is distinct from old.papel then
    if new.papel = 'presidente' or old.papel = 'presidente' then
      raise exception 'Para trocar o presidente, o presidente atual usa "Passar a presidência".';
    end if;
    if (new.papel = 'capitao' or old.papel = 'capitao') and not public.is_presidente() then
      raise exception 'Somente o presidente nomeia ou tira capitães.';
    end if;
  end if;

  return new;
end $$;

create or replace function public.resetar_acesso(p_perfil uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_papel public.papel_tipo;
begin
  if not public.is_admin() then
    raise exception 'Somente capitão ou presidente pode resetar acessos.';
  end if;
  select user_id, papel into v_user, v_papel from public.profiles where id = p_perfil;
  if not found then
    raise exception 'Jogador não encontrado.';
  end if;
  if v_user = auth.uid() then
    raise exception 'Você não pode resetar o próprio acesso.';
  end if;
  if v_papel = 'presidente' then
    raise exception 'O acesso do presidente não pode ser resetado pelo app.';
  end if;
  if v_papel = 'capitao' and not public.is_presidente() then
    raise exception 'Somente o presidente reseta o acesso de um capitão.';
  end if;
  perform set_config('fut.reset', '1', true);
  update public.profiles set user_id = null where id = p_perfil;
  if v_user is not null then
    delete from auth.users where id = v_user;
  end if;
end $$;
revoke execute on function public.resetar_acesso(uuid) from public, anon;
grant execute on function public.resetar_acesso(uuid) to authenticated, service_role;

-- Cadastro novo: só o presidente já cria alguém como capitão
create or replace function public.normalizar_telefone_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  new.telefone := public.normalizar_telefone(new.telefone);
  if auth.uid() is not null and new.papel in ('presidente', 'capitao') and not public.is_presidente() then
    raise exception 'Somente o presidente cadastra alguém como capitão.';
  end if;
  if auth.uid() is not null then
    new.user_id := null; -- conta só se liga pelo primeiro acesso
  end if;
  return new;
end $$;

drop policy if exists "admin exclui" on public.profiles;
create policy "admin exclui" on public.profiles for delete to authenticated
  using (
    public.is_admin()
    and user_id is distinct from auth.uid()
    and papel <> 'presidente'
    and (papel <> 'capitao' or public.is_presidente())
  );

-- =====================================================================
-- 6. Tamanho e formato dos campos
-- =====================================================================

alter table public.profiles drop constraint if exists profiles_nome_tam;
alter table public.profiles add constraint profiles_nome_tam check (length(trim(nome)) between 1 and 60);
alter table public.profiles drop constraint if exists profiles_apelido_tam;
alter table public.profiles add constraint profiles_apelido_tam check (apelido is null or length(apelido) <= 30);
alter table public.profiles drop constraint if exists profiles_avatar_formato;
alter table public.profiles add constraint profiles_avatar_formato check (
  avatar is null
  or avatar ~ '^tema:[a-z]{1,20}$'
  or avatar ~ '^/jogadores/[a-z0-9-]{1,40}\.webp$'
  or avatar like 'https://bcwaypzlvhhaeycdbfxz.supabase.co/storage/v1/object/public/avatares/' || id::text || '/%'
);

alter table public.config drop constraint if exists config_textos_tam;
alter table public.config add constraint config_textos_tam check (
  length(nome_grupo) between 1 and 40 and length(local_padrao) <= 80 and length(formato) <= 12
  and cardinality(coletes) <= 8
);
alter table public.config drop constraint if exists config_logo_formato;
alter table public.config add constraint config_logo_formato check (
  logo_url is null
  or logo_url like 'https://bcwaypzlvhhaeycdbfxz.supabase.co/storage/v1/object/public/marca/%'
);
alter table public.config drop constraint if exists config_cor_arte_formato;
alter table public.config add constraint config_cor_arte_formato check (cor_arte ~ '^#[0-9A-Fa-f]{6}$');

alter table public.regras drop constraint if exists regras_tam;
alter table public.regras add constraint regras_tam check (length(titulo) between 1 and 80 and length(texto) between 1 and 1500);

alter table public.pagamentos drop constraint if exists pagamentos_valor;
alter table public.pagamentos add constraint pagamentos_valor check (valor >= 0 and valor < 100000 and length(metodo) <= 30);

-- =====================================================================
-- 7. Escudo: sem SVG
-- =====================================================================

update storage.buckets set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'] where id = 'marca';
update storage.buckets set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'], file_size_limit = 2097152 where id = 'avatares';
