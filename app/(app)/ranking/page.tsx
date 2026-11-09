import { getContexto, temporadaAtual } from '@/lib/dados'
import { ddmm, ordenarRanking, type Stats } from '@/lib/util'
import RankingView from './RankingView'

export default async function Ranking() {
  const { supabase, perfil } = await getContexto()
  const temporada = temporadaAtual()

  const [{ data: temp }, { data: ultima }, { count: rodadasEncerradas }] = await Promise.all([
    supabase.from('v_ranking_temporada').select('*').eq('temporada', temporada),
    supabase
      .from('rodadas')
      .select('id, numero, data')
      .eq('status', 'encerrada')
      .order('data', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('rodadas').select('id', { count: 'exact', head: true }).eq('temporada', temporada).eq('status', 'encerrada'),
  ])

  let dia: Stats[] = []
  if (ultima) {
    const { data } = await supabase.from('v_stats_rodada').select('*').eq('rodada_id', ultima.id)
    dia = (data ?? []) as Stats[]
  }

  return (
    <RankingView
      meuId={perfil.id}
      temporada={ordenarRanking((temp ?? []) as Stats[])}
      dia={ordenarRanking(dia)}
      subTemporada={`Temporada ${temporada} · ${rodadasEncerradas ?? 0} rodadas`}
      subDia={ultima ? `Rodada ${ultima.numero} · ${ddmm(ultima.data)}` : 'Nenhuma rodada encerrada'}
    />
  )
}
