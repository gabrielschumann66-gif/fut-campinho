import type { SupabaseClient } from '@supabase/supabase-js'
import { fmt1, nivelRodada, overall } from '@/lib/util'

/** Carrega o craque de uma rodada (ou da última encerrada) com o histórico dele. */
export async function carregarCraque(supabase: SupabaseClient, rodadaId?: number) {
  let q = supabase.from('v_craque_rodada').select('*')
  q = rodadaId ? q.eq('rodada_id', rodadaId) : q.order('data', { ascending: false }).limit(1)
  const { data: craque } = await q.maybeSingle()
  if (!craque) return null

  const [{ data: titulos }, { data: rodadasDele }, { data: perfil }, { data: rodadasCraque }] = await Promise.all([
    supabase.from('v_craque_rodada').select('rodada_id').eq('jogador_id', craque.jogador_id),
    supabase.from('v_stats_rodada').select('pts, rodada_status').eq('jogador_id', craque.jogador_id),
    supabase.from('profiles').select('posicao').eq('id', craque.jogador_id).single(),
    supabase.from('v_craque_rodada').select('rodada_id, numero, data').order('data', { ascending: false }).limit(20),
  ])

  const encerradas = (rodadasDele ?? []).filter((r) => r.rodada_status === 'encerrada')
  const media = encerradas.length ? encerradas.reduce((s, r) => s + r.pts, 0) / encerradas.length : 0
  const melhor = encerradas.reduce((m, r) => Math.max(m, r.pts), 0)

  return {
    craque: craque as {
      rodada_id: number
      numero: number
      data: string
      jogador_id: string
      nome: string
      v: number
      e: number
      d: number
      gols: number
      assist: number
      pts: number
      defesas?: number
      avatar: string | null
    },
    posicao: (perfil?.posicao as string) ?? 'ATA',
    nivel: nivelRodada(craque.pts),
    ovr: overall(craque.pts),
    titulos: titulos?.length ?? 0,
    media,
    mediaFmt: fmt1(media),
    melhor,
    rodadasJogadas: encerradas.length,
    outrasRodadas: (rodadasCraque ?? []) as { rodada_id: number; numero: number; data: string }[],
  }
}
