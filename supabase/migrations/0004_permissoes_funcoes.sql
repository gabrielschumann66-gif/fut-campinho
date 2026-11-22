-- Fut Campinho — 0004: só status_acesso fica disponível sem login
alter function public.normalizar_telefone(text) set search_path = public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.resetar_acesso(uuid) from anon, public;
revoke execute on function public.meu_perfil_id() from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_financeiro() from anon;
revoke execute on function public.tem_papel(public.papel_tipo[]) from anon;
