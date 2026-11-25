import { cache } from 'react'

export type Config = {
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
  logo_url: string | null
  cor_arte: string
  coletes: string[]
  dia_semana: number
  configurado_em: string | null
}

export const CONFIG_PADRAO: Config = {
  nome_grupo: 'Fut Campinho',
  local_padrao: 'Quadra',
  horario_padrao: '18:50:00',
  vagas: 18,
  valor_mensalidade: 50,
  dia_vencimento: 5,
  duracao_min: 7,
  gols_limite: 2,
  formato: '5×5',
  max_vitorias: 2,
  logo_url: null,
  cor_arte: '#FD6201',
  coletes: ['Preto', 'Verde'],
  dia_semana: 1,
  configurado_em: null,
}

/** Parte da configuração que aparece sem login (tela de entrada, ícone, título). */
export type ConfigPublica = Pick<Config, 'nome_grupo' | 'logo_url' | 'cor_arte'>

/**
 * Nome, escudo e cor do grupo, lidos sem login, com cache de 5 min
 * (tag "config": quem salva a configuração chama `configAtualizada()` para limpar).
 * O banco só libera estas colunas para quem não está logado; o resto vem de getConfig (lib/dados).
 */
export const getConfigPublica = cache(async (): Promise<ConfigPublica> => {
  const padrao: ConfigPublica = { nome_grupo: CONFIG_PADRAO.nome_grupo, logo_url: null, cor_arte: CONFIG_PADRAO.cor_arte }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return padrao
  try {
    const r = await fetch(`${url}/rest/v1/config?id=eq.1&select=nome_grupo,logo_url,cor_arte`, {
      headers: { apikey: key },
      next: { revalidate: 300, tags: ['config'] },
    })
    if (!r.ok) return padrao
    const [c] = (await r.json()) as Partial<ConfigPublica>[]
    return { ...padrao, ...c }
  } catch {
    return padrao
  }
})

export const logoDe = (c: Pick<Config, 'logo_url'>) => c.logo_url || '/escudo.svg'

export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const diaSemanaNome = (d: number) => DIAS_SEMANA[d] ?? 'Segunda'
