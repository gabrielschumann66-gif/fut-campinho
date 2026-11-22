import Link from 'next/link'
import { IconMais, IconSeta } from '@/components/icons'
import { getConfig, getContexto, temporadaAtual } from '@/lib/dados'
import { corHex, ddmm, diaSemana, hhmm, isAdmin, nomeExibicao, type Perfil } from '@/lib/util'
import IniciarRodada from './IniciarRodada'
import RodadaControles from './RodadaControles'

export type Placar = {
  id: number
  numero: number
  cor_a: string
  cor_b: string
  status: 'ao_vivo' | 'encerrada'
  gols_a: number
  gols_b: number
  conferir: boolean
}

type Rodada = { id: number; numero: number; data: string; horario: string; local: string; status: string; temporada: number }

export default async function PartidaIndex({ searchParams }: { searchParams: Promise<{ rodada?: string }> }) {
  const { rodada: rodadaParam } = await searchParams
  const { supabase, perfil } = await getContexto()
  const config = await getConfig()
  const admin = isAdmin(perfil.papel)
  const temporada = temporadaAtual()

  const { data: todas } = await supabase.from('rodadas').select('*').order('data', { ascending: false }).limit(30)
  const rodadas = (todas ?? []) as Rodada[]
  const aberta = rodadas.find((r) => r.status === 'em_andamento') ?? [...rodadas].reverse().find((r) => r.status === 'agendada') ?? null
  const rodada = (rodadaParam ? rodadas.find((r) => r.id === Number(rodadaParam)) : null) ?? aberta ?? rodadas.find((r) => r.status === 'encerrada') ?? null
  const proximoNumero = Math.max(0, ...rodadas.filter((r) => r.temporada === temporada).map((r) => r.numero)) + 1

  const [{ data: partidas }, { data: presencas }, { data: todosJog }] = rodada
    ? await Promise.all([
        supabase.from('v_partida_placar').select('*').eq('rodada_id', rodada.id).order('numero', { ascending: false }),
        supabase.from('presencas').select('jogador_id, criado_em').eq('rodada_id', rodada.id).order('criado_em'),
        supabase.from('profiles').select('*').eq('ativo', true).order('nome'),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const lista = (partidas ?? []) as Placar[]
  const aoVivo = lista.find((p) => p.status === 'ao_vivo')
  const encerradas = lista.filter((p) => p.status === 'encerrada')
  const aConferir = encerradas.filter((p) => p.conferir).length
  const confirmadosIds = (presencas ?? []).map((p) => p.jogador_id as string)
  const jogadores = (todosJog ?? []) as Perfil[]
  const outras = rodadas.filter((r) => r.id !== rodada?.id).slice(0, 8)

  // Vitórias por time na rodada
  const vitorias: Record<string, number> = {}
  for (const p of encerradas) {
    if (p.conferir || p.gols_a === p.gols_b) continue
    const cor = p.gols_a > p.gols_b ? p.cor_a : p.cor_b
    vitorias[cor] = (vitorias[cor] ?? 0) + 1
  }

  return (
    <main className="screen">
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div className="col">
          <h1 className="title">JOGOS</h1>
          {rodada && (
            <span className="s13 mut">
              Rodada {rodada.numero} · {diaSemana(rodada.data)} {ddmm(rodada.data)} · {hhmm(rodada.horario)}
            </span>
          )}
        </div>
        {rodada && (
          <span className={`badge ${rodada.status === 'em_andamento' ? 'org' : rodada.status === 'agendada' ? 'yel' : ''}`}>
            {rodada.status === 'em_andamento' ? 'EM ANDAMENTO' : rodada.status === 'agendada' ? 'AGENDADA' : 'ENCERRADA'}
          </span>
        )}
      </div>

      {/* Ações do capitão/presidente */}
      {admin && !aberta && (
        <section className="card col gap-10" style={{ borderColor: 'var(--yel-line)' }}>
          <span className="bold">Dia de jogo?</span>
          <span className="s13 mut">Comece a rodada e registre cada jogo com o botão laranja.</span>
          <IniciarRodada agendadaId={null} proximoNumero={proximoNumero} temporada={temporada} horario={config.horario_padrao} local={config.local_padrao} />
        </section>
      )}
      {admin && aberta && aberta.id === rodada?.id && aberta.status === 'agendada' && (
        <IniciarRodada agendadaId={aberta.id} proximoNumero={proximoNumero} temporada={temporada} horario={config.horario_padrao} local={config.local_padrao} />
      )}
      {admin && rodada?.status === 'em_andamento' && !aoVivo && (
        <Link href="/partida/nova" className="btn org full" style={{ height: 56, fontSize: 16 }}>
          <IconMais size={20} /> Registrar jogo {encerradas.length + 1}
        </Link>
      )}

      {aoVivo && (
        <Link href={`/partida/${aoVivo.id}`} className="card row" style={{ color: 'var(--txt)', borderColor: 'var(--org)' }}>
          <div className="col flex-1 gap-4">
            <span className="row s13 bold org" style={{ gap: 6 }}><span className="ao-vivo-dot" />AO VIVO · JOGO {aoVivo.numero}</span>
            <span className="cond" style={{ fontSize: 30 }}>
              {aoVivo.cor_a} {aoVivo.gols_a} × {aoVivo.gols_b} {aoVivo.cor_b}
            </span>
            {admin && <span className="small mut">Toque para registrar os gols</span>}
          </div>
          <span className="mut"><IconSeta /></span>
        </Link>
      )}

      {admin && aConferir > 0 && (
        <div className="card tight row" style={{ borderColor: 'var(--org)' }}>
          <span className="badge org">{aConferir}</span>
          <span className="s13 flex-1">
            {aConferir === 1 ? 'Um jogo está' : `${aConferir} jogos estão`} com os times a conferir. Abra o jogo e toque em <b>Corrigir</b>.
          </span>
        </div>
      )}

      {rodada ? (
        <section className="col gap-8">
          <h2 className="h2">JOGOS DA RODADA ({encerradas.length})</h2>
          {encerradas.length === 0 && <div className="vazio">Nenhum jogo encerrado ainda.</div>}
          {encerradas.map((p) => {
            const venceu = p.conferir ? null : p.gols_a > p.gols_b ? 'A' : p.gols_b > p.gols_a ? 'B' : null
            return (
              <Link key={p.id} href={`/partida/${p.id}`} className="item">
                <span className="small mut" style={{ width: 46 }}>Jogo {p.numero}</span>
                <span className="row flex-1" style={{ gap: 8, justifyContent: 'center' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: corHex(p.cor_a), boxShadow: '0 0 0 1px var(--dim)' }} />
                  <span className={venceu === 'A' ? 'bold yel' : 'bold'}>{p.cor_a}</span>
                  <span className="cond" style={{ fontSize: 22 }}>{p.gols_a} × {p.gols_b}</span>
                  <span className={venceu === 'B' ? 'bold yel' : 'bold'}>{p.cor_b}</span>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: corHex(p.cor_b), boxShadow: '0 0 0 1px var(--dim)' }} />
                </span>
                {p.conferir ? <span className="badge org">conferir</span> : <span className="mut"><IconSeta size={16} /></span>}
              </Link>
            )
          })}
          {Object.keys(vitorias).length > 0 && (
            <span className="small mut center">
              Vitórias: {Object.entries(vitorias).map(([c, n]) => `${c} ${n}`).join(' · ')}
            </span>
          )}
        </section>
      ) : (
        !admin && <div className="vazio">Nenhuma rodada ainda.</div>
      )}

      {admin && rodada?.status === 'em_andamento' && (
        <RodadaControles rodadaId={rodada.id} status={rodada.status} temAoVivo={!!aoVivo} />
      )}

      {rodada && rodada.status !== 'encerrada' && (
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
                    {i + 1}. {j ? nomeExibicao(j) : '—'}
                  </span>
                )
              })}
            </div>
          )}
        </section>
      )}

      {outras.length > 0 && (
        <section className="col gap-8">
          <h2 className="h2">OUTRAS RODADAS</h2>
          <div className="chips">
            {outras.map((r) => (
              <Link key={r.id} href={`/partida?rodada=${r.id}`} className="chip" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--txt)' }}>
                R{r.numero} · {ddmm(r.data)}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
