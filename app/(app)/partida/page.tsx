import Link from 'next/link'
import { IconSeta, IconVoltar } from '@/components/icons'
import { getContexto } from '@/lib/dados'
import { corHex, ddmm, diaSemana, hhmm, isAdmin, nomeExibicao, type Perfil } from '@/lib/util'
import NovaPartida from './NovaPartida'
import RodadaControles from './RodadaControles'

export type Placar = {
  id: number
  numero: number
  cor_a: string
  cor_b: string
  status: 'ao_vivo' | 'encerrada'
  gols_a: number
  gols_b: number
}

export default async function PartidaIndex() {
  const { supabase, perfil } = await getContexto()
  const admin = isAdmin(perfil.papel)

  const { data: rodadas } = await supabase
    .from('rodadas')
    .select('*')
    .in('status', ['em_andamento', 'agendada'])
    .order('data')
    .limit(5)
  const rodada = rodadas?.find((r) => r.status === 'em_andamento') ?? rodadas?.[0] ?? null

  if (!rodada) {
    return (
      <main className="screen">
        <div className="row">
          <Link href="/" className="icon-btn" aria-label="Voltar"><IconVoltar /></Link>
          <h1 className="title" style={{ fontSize: 30 }}>PARTIDAS</h1>
        </div>
        <div className="vazio">Nenhuma rodada agendada ou em andamento.</div>
        {admin && <Link href="/admin" className="btn yel full">Agendar rodada</Link>}
      </main>
    )
  }

  const [{ data: partidas }, { data: presencas }, { data: todos }, { data: ultimaComTimes }] = await Promise.all([
    supabase.from('v_partida_placar').select('*').eq('rodada_id', rodada.id).order('numero', { ascending: false }),
    supabase.from('presencas').select('jogador_id, criado_em').eq('rodada_id', rodada.id).order('criado_em'),
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

  const lista = (partidas ?? []) as Placar[]
  const aoVivo = lista.find((p) => p.status === 'ao_vivo')
  const confirmadosIds = (presencas ?? []).map((p) => p.jogador_id as string)
  const jogadores = ((todos ?? []) as Perfil[]).map((j) => ({ id: j.id, nome: nomeExibicao(j), confirmado: confirmadosIds.includes(j.id) }))

  // Vencedor da última partida, para "quem ganha fica"
  let vencedor: { cor: string; ids: string[] } | null = null
  if (ultimaComTimes) {
    const pl = lista.find((p) => p.id === ultimaComTimes.id)
    if (pl && pl.gols_a !== pl.gols_b) {
      const lado = pl.gols_a > pl.gols_b ? 'A' : 'B'
      vencedor = {
        cor: lado === 'A' ? pl.cor_a : pl.cor_b,
        ids: (ultimaComTimes.partida_jogadores as { jogador_id: string; lado: string }[]).filter((x) => x.lado === lado).map((x) => x.jogador_id),
      }
    }
  }

  return (
    <main className="screen">
      <div className="row">
        <Link href="/" className="icon-btn" aria-label="Voltar"><IconVoltar /></Link>
        <div className="col flex-1">
          <h1 className="title" style={{ fontSize: 30 }}>RODADA {rodada.numero}</h1>
          <span className="s13 mut">
            {diaSemana(rodada.data)} · {ddmm(rodada.data)} · {hhmm(rodada.horario)} · {rodada.local}
          </span>
        </div>
      </div>

      {admin && <RodadaControles rodadaId={rodada.id} status={rodada.status} temAoVivo={!!aoVivo} />}

      {aoVivo && (
        <Link href={`/partida/${aoVivo.id}`} className="card row" style={{ color: 'var(--txt)', borderColor: 'var(--org)' }}>
          <div className="col flex-1 gap-4">
            <span className="row s13 bold org" style={{ gap: 6 }}><span className="ao-vivo-dot" />AO VIVO · JOGO {aoVivo.numero}</span>
            <span className="cond" style={{ fontSize: 30 }}>
              {aoVivo.cor_a} {aoVivo.gols_a} × {aoVivo.gols_b} {aoVivo.cor_b}
            </span>
          </div>
          <span className="mut"><IconSeta /></span>
        </Link>
      )}

      {admin && !aoVivo && rodada.status === 'em_andamento' && (
        <NovaPartida rodadaId={rodada.id} proximoNumero={(lista[0]?.numero ?? 0) + 1} jogadores={jogadores} vencedor={vencedor} />
      )}
      {admin && rodada.status === 'agendada' && (
        <div className="vazio">Inicie a rodada para registrar as partidas.</div>
      )}

      <section className="col gap-8">
        <h2 className="h2">JOGOS DA RODADA</h2>
        {lista.filter((p) => p.status === 'encerrada').length === 0 && <div className="vazio">Nenhum jogo encerrado ainda.</div>}
        {lista
          .filter((p) => p.status === 'encerrada')
          .map((p) => (
            <Link key={p.id} href={`/partida/${p.id}`} className="item">
              <span className="small mut" style={{ width: 44 }}>Jogo {p.numero}</span>
              <span className="row flex-1" style={{ gap: 8, justifyContent: 'center' }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, background: corHex(p.cor_a), boxShadow: '0 0 0 1px var(--dim)' }} />
                <span className="bold">{p.cor_a}</span>
                <span className="cond" style={{ fontSize: 22 }}>{p.gols_a} × {p.gols_b}</span>
                <span className="bold">{p.cor_b}</span>
                <span style={{ width: 10, height: 10, borderRadius: 5, background: corHex(p.cor_b), boxShadow: '0 0 0 1px var(--dim)' }} />
              </span>
              <span className="mut"><IconSeta size={16} /></span>
            </Link>
          ))}
      </section>

      <section className="col gap-8">
        <h2 className="h2">CONFIRMADOS ({confirmadosIds.length})</h2>
        {confirmadosIds.length === 0 ? (
          <div className="vazio">Ninguém confirmou ainda.</div>
        ) : (
          <div className="chips">
            {confirmadosIds.map((id, i) => {
              const j = jogadores.find((x) => x.id === id)
              return (
                <span key={id} className="chip" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--txt)' }}>
                  {i + 1}. {j?.nome ?? '—'}
                </span>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
