import { notFound } from 'next/navigation'
import { getContexto } from '@/lib/dados'
import { isAdmin, nomeExibicao } from '@/lib/util'
import AoVivo from './AoVivo'

export default async function PartidaAoVivo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, perfil } = await getContexto()

  const { data: partida } = await supabase
    .from('partidas')
    .select('*, rodadas(numero), partida_jogadores(jogador_id, lado, profiles(nome, apelido))')
    .eq('id', Number(id))
    .maybeSingle()
  if (!partida) notFound()

  const [{ data: gols }, { data: placares }] = await Promise.all([
    supabase.from('gols').select('*').eq('partida_id', partida.id).order('id', { ascending: false }),
    supabase.from('v_partida_placar').select('*').eq('rodada_id', partida.rodada_id).eq('status', 'encerrada'),
  ])

  // Vitórias de cada cor na rodada
  const vitorias: Record<string, number> = {}
  for (const p of placares ?? []) {
    if (p.gols_a === p.gols_b) continue
    const cor = p.gols_a > p.gols_b ? p.cor_a : p.cor_b
    vitorias[cor] = (vitorias[cor] ?? 0) + 1
  }

  type PJ = { jogador_id: string; lado: 'A' | 'B'; profiles: { nome: string; apelido: string | null } | null }
  const jogadores = (partida.partida_jogadores as PJ[]).map((j) => ({
    id: j.jogador_id,
    lado: j.lado,
    nome: j.profiles ? nomeExibicao(j.profiles) : '?',
  }))

  return (
    <AoVivo
      partida={{
        id: partida.id,
        numero: partida.numero,
        rodada: (partida.rodadas as { numero: number } | null)?.numero ?? 0,
        corA: partida.cor_a,
        corB: partida.cor_b,
        status: partida.status,
        iniciadaEm: partida.iniciada_em,
        encerradaEm: partida.encerrada_em,
      }}
      jogadores={jogadores}
      gols={(gols ?? []).map((g) => ({ id: g.id, lado: g.lado, autorId: g.autor_id, assistId: g.assist_id, minuto: g.minuto }))}
      vitorias={vitorias}
      podeEditar={isAdmin(perfil.papel)}
    />
  )
}
