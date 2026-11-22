import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Perfil } from '@/lib/util'

/** Cliente + usuário logado + perfil. Redireciona para /login se não houver sessão. */
export const getContexto = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
  if (!perfil) redirect('/login?sair=1')
  return { supabase, user, perfil: perfil as Perfil }
})

export const getConfig = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.from('config').select('*').eq('id', 1).single()
  return data as {
    nome_grupo: string
    local_padrao: string
    horario_padrao: string
    vagas: number
    valor_mensalidade: number
    dia_vencimento: number
    duracao_min: number
    gols_limite: number
    formato: string
    max_vitorias: number
  }
})

export const temporadaAtual = () => new Date().getFullYear()
