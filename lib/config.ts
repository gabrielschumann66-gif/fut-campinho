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

/**
 * Configuração do grupo, com cache de 5 min compartilhado entre todas as páginas
 * (tag "config": quem salva a configuração chama `configAtualizada()` para limpar).
 * Lida sem login, então serve também para a tela de entrada.
 */
export const getConfig = cache(async (): Promise<Config> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return CONFIG_PADRAO
  try {
    const r = await fetch(`${url}/rest/v1/config?id=eq.1&select=*`, {
      headers: { apikey: key },
      next: { revalidate: 300, tags: ['config'] },
    })
    if (!r.ok) return CONFIG_PADRAO
    const [c] = (await r.json()) as Partial<Config>[]
    return { ...CONFIG_PADRAO, ...c, valor_mensalidade: Number(c?.valor_mensalidade ?? CONFIG_PADRAO.valor_mensalidade) }
  } catch {
    return CONFIG_PADRAO
  }
})

export const logoDe = (c: Pick<Config, 'logo_url'>) => c.logo_url || '/escudo.svg'

export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const diaSemanaNome = (d: number) => DIAS_SEMANA[d] ?? 'Segunda'
