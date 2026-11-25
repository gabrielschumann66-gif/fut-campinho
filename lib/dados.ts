import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { CONFIG_PADRAO, type Config } from '@/lib/config'
import type { Perfil } from '@/lib/util'

/** Configuração completa do grupo (local, horário, valores): só para quem está logado. */
export const getConfig = cache(async (): Promise<Config> => {
  const supabase = await createClient()
  const { data: c } = await supabase.from('config').select('*').eq('id', 1).maybeSingle()
  if (!c) return CONFIG_PADRAO
  return { ...CONFIG_PADRAO, ...c, valor_mensalidade: Number(c.valor_mensalidade ?? CONFIG_PADRAO.valor_mensalidade) }
})

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
