import Link from 'next/link'
import { redirect } from 'next/navigation'
import { IconVoltar } from '@/components/icons'
import { getConfig, getContexto, temporadaAtual } from '@/lib/dados'
import { isAdmin, nomeExibicao, type Perfil } from '@/lib/util'
import IniciarRodada from '../IniciarRodada'
import NovaPartida from './NovaPartida'

export default async function NovaPartidaPage() {
  const { supabase, perfil } = await getContexto()
  if (!isAdmin(perfil.papel)) redirect('/partida')
  const config = await getConfig()
  const temporada = temporadaAtual()

  const { data: rodadas } = await supabase.from('rodadas').select('*').order('data', { ascending: false }).limit(20)
  const rodada = rodadas?.find((r) => r.status === 'em_andamento') ?? null
  const agendada = [...(rodadas ?? [])].reverse().find((r) => r.status === 'agendada') ?? null
  const proximoNumero = Math.max(0, ...(rodadas ?? []).filter((r) => r.temporada === temporada).map((r) => r.numero)) + 1

  const topo = (
    <div className="row">
      <Link href="/partida" className="icon-btn" aria-label="Voltar"><IconVoltar /></Link>
      <div className="col flex-1">
        <h1 className="title" style={{ fontSize: 30 }}>REGISTRAR JOGO</h1>
        {rodada && <span className="s13 mut">Rodada {rodada.numero}</span>}
      </div>
    </div>
  )

  if (!rodada) {
    return (
      <main className="screen">
        {topo}
        <div className="card col gap-10">
          <span className="bold">Primeiro, comece a rodada de hoje</span>
          <span className="s13 mut">Os jogos ficam agrupados na rodada do dia. É só um toque.</span>
          <IniciarRodada
            agendadaId={agendada?.id ?? null}
            proximoNumero={proximoNumero}
            temporada={temporada}
            horario={config.horario_padrao}
            local={config.local_padrao}
          />
        </div>
      </main>
    )
  }

  const [{ data: partidas }, { data: presencas }, { data: todos }, { data: ultima }] = await Promise.all([
    supabase.from('v_partida_placar').select('*').eq('rodada_id', rodada.id).order('numero', { ascending: false }),
    supabase.from('presencas').select('jogador_id').eq('rodada_id', rodada.id),
    supabase.from('profiles').select('*').eq('ativo', true).order('nome'),
    supabase
      .from('partidas')
      .select('id, cor_a, cor_b, partida_jogadores(jogador_id, lado)')
      .eq('rodada_id', rodada.id)
      .eq('status', 'encerrada')
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const aoVivo = (partidas ?? []).find((p) => p.status === 'ao_vivo')
  if (aoVivo) redirect(`/partida/${aoVivo.id}`)

  const confirmados = new Set((presencas ?? []).map((p) => p.jogador_id as string))
  const jogadores = ((todos ?? []) as Perfil[]).map((j) => ({ id: j.id, nome: nomeExibicao(j), confirmado: confirmados.has(j.id) }))

  let vencedor: { cor: string; ids: string[] } | null = null
  if (ultima) {
    const pl = (partidas ?? []).find((p) => p.id === ultima.id)
    if (pl && pl.gols_a !== pl.gols_b) {
      const lado = pl.gols_a > pl.gols_b ? 'A' : 'B'
      vencedor = {
        cor: lado === 'A' ? pl.cor_a : pl.cor_b,
        ids: (ultima.partida_jogadores as { jogador_id: string; lado: string }[]).filter((x) => x.lado === lado).map((x) => x.jogador_id),
      }
    }
  }

  return (
    <main className="screen">
      {topo}
      <NovaPartida
        rodadaId={rodada.id}
        proximoNumero={Math.max(0, ...(partidas ?? []).map((p) => p.numero)) + 1}
        jogadores={jogadores}
        vencedor={vencedor}
        coletes={config.coletes}
      />
    </main>
  )
}
