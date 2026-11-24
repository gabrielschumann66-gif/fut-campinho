import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Perfil } from '@/lib/util'

export { getConfig } from '@/lib/config'

/**
 * Cliente + usuário logado + perfil. Redireciona para /login se não houver sessão.
 * Usa getClaims (valida o token localmente) em vez de getUser (ida e volta ao Supabase a cada página).
 */
export const getContexto = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const uid = data?.claims?.sub
  if (!uid) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('*').eq('user_id', uid).maybeSingle()
  if (!perfil) redirect('/login?sair=1')
  return { supabase, user: { id: uid }, perfil: perfil as Perfil }
})

export const temporadaAtual = () => new Date().getFullYear()
