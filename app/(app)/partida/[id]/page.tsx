import { notFound } from 'next/navigation'
import { getContexto } from '@/lib/dados'
import { isAdmin, nomeExibicao, type Perfil } from '@/lib/util'
import AoVivo from './AoVivo'

export default async function PartidaAoVivo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ modo?: string }>
}) {
  const { id } = await params
  const { modo } = await searchParams
  const { supabase, perfil } = await getContexto()

  const { data: partida } = await supabase
    .from('partidas')
    .select('*, rodadas(numero), partida_jogadores(jogador_id, lado, profiles(nome, apelido))')
    .eq('id', Number(id))
    .maybeSingle()
  if (!partida) notFound()

  const admin = isAdmin(perfil.papel)
  const [{ data: gols }, { data: defesas }, { data: placares }, { data: elenco }] = await Promise.all([
    supabase.from('gols').select('*').eq('partida_id', partida.id).order('id', { ascending: false }),
    supabase.from('defesas').select('*').eq('partida_id', partida.id).order('id', { ascending: false }),
    supabase.from('v_partida_placar').select('*').eq('rodada_id', partida.rodada_id).eq('status', 'encerrada'),
    admin ? supabase.from('profiles').select('*').eq('ativo', true).order('nome') : Promise.resolve({ data: [] as Perfil[] }),
  ])

  const vitorias: Record<string, number> = {}
  for (const p of placares ?? []) {
    if (p.conferir || p.gols_a === p.gols_b) continue
    const cor = p.gols_a > p.gols_b ? p.cor_a : p.cor_b
    vitorias[cor] = (vitorias[cor] ?? 0) + 1
  }

  type PJ = { jogador_id: string; lado: 'A' | 'B'; profiles: { nome: string; apelido: string | null } | null }
  const jogadores = (partida.partida_jogadores as PJ[]).map((j) => ({
    id: j.jogador_id,
    lado: j.lado,
    nome: j.profiles ? nomeExibicao(j.profiles) : '?',
  }))
  // Quem aparece nos gols mas não está na escalação (jogos lançados sem os times)
  const nomes = new Map(((elenco ?? []) as Perfil[]).map((p) => [p.id, nomeExibicao(p)]))
  const faltando = new Set<string>()
  for (const g of gols ?? []) {
    for (const x of [g.autor_id, g.assist_id]) if (x && !jogadores.some((j) => j.id === x)) faltando.add(x)
  }
  if (faltando.size) {
    const { data: extra } = await supabase.from('profiles').select('id, nome, apelido').in('id', [...faltando])
    for (const p of extra ?? []) nomes.set(p.id, nomeExibicao(p))
    // Jogo a conferir: mostra quem marcou/assistiu no time do lance, para dar para corrigir
    if (partida.conferir) {
      for (const g of [...(gols ?? [])].reverse()) {
        for (const x of [g.autor_id, g.assist_id] as (string | null)[]) {
          if (x && !jogadores.some((j) => j.id === x)) jogadores.push({ id: x, lado: g.lado, nome: nomes.get(x) ?? '?' })
        }
      }
    }
  }

  return (
    <AoVivo
      partida={{
        id: partida.id,
        numero: partida.numero,
        rodada: (partida.rodadas as { numero: number } | null)?.numero ?? 0,
        corA: partida.cor_a,
        corB: partida.cor_b,
        status: partida.status,
        conferir: partida.conferir,
        iniciadaEm: partida.iniciada_em,
        encerradaEm: partida.encerrada_em,
      }}
      jogadores={jogadores}
      nomes={Object.fromEntries(nomes)}
      elenco={((elenco ?? []) as Perfil[]).map((p) => ({ id: p.id, nome: nomeExibicao(p) }))}
      gols={(gols ?? []).map((g) => ({ id: g.id, lado: g.lado, autorId: g.autor_id, assistId: g.assist_id, minuto: g.minuto }))}
      defesas={(defesas ?? []).map((d) => ({ id: d.id, lado: d.lado, jogadorId: d.jogador_id, minuto: d.minuto }))}
      vitorias={vitorias}
      podeEditar={admin}
      lancar={modo === 'lancar'}
    />
  )
}
