'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { IconLixo, IconMais, IconTroca, IconVoltar } from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import { PONTOS, corHex, erroMsg } from '@/lib/util'

type Lado = 'A' | 'B'
type Partida = {
  id: number
  numero: number
  rodada: number
  corA: string
  corB: string
  status: 'ao_vivo' | 'encerrada'
  conferir: boolean
  iniciadaEm: string
  encerradaEm: string | null
}
type Jogador = { id: string; lado: Lado; nome: string }
type Gol = { id: number; lado: Lado; autorId: string; assistId: string | null; minuto: number }
type Defesa = { id: number; lado: Lado; jogadorId: string; minuto: number }
type Infracao = { id: number; lado: Lado; jogadorId: string; tipo: 'sebo' | 'mao'; minuto: number }
type Modo = 'gol' | 'defesa' | 'sebo' | 'mao'

const MODOS: { id: Modo; rotulo: string; pts: number }[] = [
  { id: 'gol', rotulo: 'Gol', pts: PONTOS.gol },
  { id: 'defesa', rotulo: 'Defesa', pts: PONTOS.defesa },
  { id: 'sebo', rotulo: 'Sebo', pts: PONTOS.sebo },
  { id: 'mao', rotulo: 'Mão', pts: PONTOS.mao },
]
const INFRACAO_NOME = { sebo: 'Ação de sebo', mao: 'Mão proposital' } as const
const sinal = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`)

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
const outro = (l: Lado): Lado => (l === 'A' ? 'B' : 'A')

export default function AoVivo({
  partida,
  jogadores,
  nomes,
  elenco,
  gols,
  defesas,
  infracoes,
  vitorias,
  podeEditar,
  lancar,
}: {
  partida: Partida
  jogadores: Jogador[]
  nomes: Record<string, string>
  elenco: { id: string; nome: string }[]
  gols: Gol[]
  defesas: Defesa[]
  infracoes: Infracao[]
  vitorias: Record<string, number>
  podeEditar: boolean
  lancar: boolean
}) {
  const router = useRouter()
  const aoVivo = partida.status === 'ao_vivo'
  const [corrigindo, setCorrigindo] = useState(false)
  const [autor, setAutor] = useState<Jogador | null>(null)
  const [modo, setModo] = useState<Modo>('gol')
  const [adicionarEm, setAdicionarEm] = useState<Lado | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const editavel = podeEditar && (aoVivo || corrigindo)
  const cor = (l: Lado) => (l === 'A' ? partida.corA : partida.corB)

  useEffect(() => {
    if (!aoVivo || lancar) return
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [aoVivo, lancar])

  // Placar em tempo real para todo mundo
  useEffect(() => {
    const supabase = createClient()
    const canal = supabase
      .channel(`partida-${partida.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gols', filter: `partida_id=eq.${partida.id}` }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'infracoes', filter: `partida_id=eq.${partida.id}` }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'defesas', filter: `partida_id=eq.${partida.id}` }, () => router.refresh())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partidas', filter: `id=eq.${partida.id}` }, () => router.refresh())
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [partida.id, router])

  const nome = (id: string | null) => (id ? jogadores.find((j) => j.id === id)?.nome ?? nomes[id] ?? '?' : '?')
  const golsDe = (l: Lado) => gols.filter((g) => g.lado === l).length
  const fim = partida.encerradaEm ? new Date(partida.encerradaEm).getTime() : agora
  const decorrido = fim - new Date(partida.iniciadaEm).getTime()

  async function rodar(fn: () => PromiseLike<{ error: unknown }>) {
    setOcupado(true)
    setErro(null)
    const { error } = await fn()
    setOcupado(false)
    if (error) {
      setErro(erroMsg(error))
      return false
    }
    router.refresh()
    return true
  }

  async function registrar(assistId: string | null) {
    if (!autor) return
    const minuto = lancar || !aoVivo ? 1 : Math.max(1, Math.ceil(decorrido / 60000))
    const a = autor
    setAutor(null)
    await rodar(() => createClient().from('gols').insert({ partida_id: partida.id, lado: a.lado, autor_id: a.id, assist_id: assistId, minuto }))
  }

  async function registrarDefesa(j: Jogador) {
    const minuto = lancar || !aoVivo ? 1 : Math.max(1, Math.ceil(decorrido / 60000))
    await rodar(() => createClient().from('defesas').insert({ partida_id: partida.id, lado: j.lado, jogador_id: j.id, minuto }))
  }

  async function apagarDefesa(d: Defesa) {
    if (!confirm(`Apagar a ação de defesa de ${nome(d.jogadorId)}?`)) return
    await rodar(() => createClient().from('defesas').delete().eq('id', d.id))
  }

  async function registrarInfracao(j: Jogador, tipo: 'sebo' | 'mao') {
    const minuto = lancar || !aoVivo ? 1 : Math.max(1, Math.ceil(decorrido / 60000))
    await rodar(() => createClient().from('infracoes').insert({ partida_id: partida.id, lado: j.lado, jogador_id: j.id, tipo, minuto }))
  }

  async function apagarInfracao(x: Infracao) {
    if (!confirm(`Apagar ${INFRACAO_NOME[x.tipo].toLowerCase()} de ${nome(x.jogadorId)}?`)) return
    await rodar(() => createClient().from('infracoes').delete().eq('id', x.id))
  }

  function tocar(j: Jogador) {
    if (modo === 'gol') setAutor(j)
    else if (modo === 'defesa') registrarDefesa(j)
    else registrarInfracao(j, modo)
  }

  async function tirar(j: Jogador) {
    if (
      gols.some((g) => g.autorId === j.id || g.assistId === j.id) ||
      defesas.some((d) => d.jogadorId === j.id) ||
      infracoes.some((x) => x.jogadorId === j.id)
    ) {
      setAutor(null)
      return setErro(`${j.nome} tem lance neste jogo. Apague o lance antes de tirar do time.`)
    }
    setAutor(null)
    await rodar(() => createClient().from('partida_jogadores').delete().eq('partida_id', partida.id).eq('jogador_id', j.id))
  }

  async function adicionar(id: string, lado: Lado) {
    setAdicionarEm(null)
    await rodar(() => createClient().from('partida_jogadores').upsert({ partida_id: partida.id, jogador_id: id, lado }))
  }

  async function apagar(g: Gol) {
    if (!confirm(`Apagar o gol de ${nome(g.autorId)}?`)) return
    await rodar(() => createClient().from('gols').delete().eq('id', g.id))
  }

  /** Corrige o time do gol e leva autor e assistência junto na escalação. */
  async function trocarTime(g: Gol) {
    const novo = outro(g.lado)
    const supabase = createClient()
    await rodar(async () => {
      const r = await supabase.from('gols').update({ lado: novo }).eq('id', g.id)
      if (r.error) return r
      const ids = [g.autorId, g.assistId].filter(Boolean) as string[]
      return supabase.from('partida_jogadores').upsert(ids.map((jogador_id) => ({ partida_id: partida.id, jogador_id, lado: novo })))
    })
  }

  async function encerrar() {
    const a = golsDe('A')
    const b = golsDe('B')
    const resultado = a === b ? 'empate' : `vitória do ${a > b ? partida.corA : partida.corB}`
    if (!confirm(`${lancar ? 'Salvar' : 'Encerrar'} o jogo ${a} × ${b} (${resultado})?`)) return
    const ok = await rodar(() =>
      createClient().from('partidas').update({ status: 'encerrada', encerrada_em: new Date().toISOString() }).eq('id', partida.id),
    )
    if (ok) router.push('/partida')
  }

  /** Jogo lançado sem os times: coloca autores/assistências na escalação e libera vitória/derrota. */
  async function marcarConferido() {
    if (!confirm('Os gols de cada time e quem jogou estão certos? A partir daqui o jogo conta vitória e derrota.')) return
    const supabase = createClient()
    const linhas = new Map<string, Lado>()
    for (const j of jogadores) linhas.set(j.id, j.lado)
    for (const g of gols) for (const x of [g.autorId, g.assistId]) if (x && !linhas.has(x)) linhas.set(x, g.lado)
    const ok = await rodar(async () => {
      if (linhas.size) {
        const r = await supabase
          .from('partida_jogadores')
          .upsert([...linhas].map(([jogador_id, lado]) => ({ partida_id: partida.id, jogador_id, lado })))
        if (r.error) return r
      }
      return supabase.from('partidas').update({ conferir: false }).eq('id', partida.id)
    })
    if (ok) setCorrigindo(false)
  }

  async function excluirJogo() {
    if (!confirm(`Excluir o jogo ${partida.numero} e todos os lances dele?`)) return
    const ok = await rodar(() => createClient().from('partidas').delete().eq('id', partida.id))
    if (ok) router.push('/partida')
  }

  const placarTime = (l: Lado) => {
    const v = vitorias[cor(l)] ?? 0
    return (
      <div className="col" style={{ alignItems: 'center', gap: 6 }}>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: corHex(cor(l)), boxShadow: '0 0 0 1px #4A4A45' }} />
        <span className="bold" style={{ fontSize: 14 }}>{cor(l)}</span>
        <span className="mut" style={{ fontSize: 11 }}>
          {v} {v === 1 ? 'vitória' : 'vitórias'} hoje
        </span>
      </div>
    )
  }

  const colunaTime = (l: Lado) => {
    const elencoTime = jogadores.filter((j) => j.lado === l)
    return (
      <div className="time-col">
        <div className="time-head">
          <span style={{ width: 12, height: 12, borderRadius: 6, background: corHex(cor(l)), boxShadow: '0 0 0 1px #4A4A45' }} />
          <span className="flex-1 ellipsis">{cor(l)}</span>
        </div>
        {elencoTime.map((j) => {
          const g = gols.filter((x) => x.autorId === j.id).length
          const a = gols.filter((x) => x.assistId === j.id).length
          const d = defesas.filter((x) => x.jogadorId === j.id).length
          const s = infracoes.filter((x) => x.jogadorId === j.id && x.tipo === 'sebo').length
          const m = infracoes.filter((x) => x.jogadorId === j.id && x.tipo === 'mao').length
          const resumo = [g && `${g}G`, a && `${a}A`, d && `${d}D`, s && `${s} sebo`, m && `${m} mão`].filter(Boolean).join(' · ')
          return (
            <button
              key={j.id}
              className={`jog-btn${modo === 'defesa' ? ' defesa' : modo === 'sebo' || modo === 'mao' ? ' falta' : ''}`}
              disabled={ocupado}
              onClick={() => tocar(j)}
            >
              <span className="bold ellipsis" style={{ fontSize: 14, maxWidth: '100%' }}>{j.nome}</span>
              <span className="mut" style={{ fontSize: 11 }}>
                {resumo || `tocar = ${MODOS.find((x) => x.id === modo)!.rotulo.toLowerCase()}`}
              </span>
            </button>
          )
        })}
        <button className="btn ghost sm" style={{ height: 40 }} onClick={() => setAdicionarEm(l)} disabled={ocupado}>
          <IconMais size={14} stroke={2.4} /> Jogador
        </button>
      </div>
    )
  }

  const naPartida = new Set(jogadores.map((j) => j.id))

  return (
    <main className="screen" style={{ gap: 16 }}>
      <div className="between">
        <Link href="/partida" className="icon-btn" aria-label="Voltar">
          <IconVoltar />
        </Link>
        <div className="col" style={{ alignItems: 'center' }}>
          <span className="small mut" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Rodada {partida.rodada} · Jogo {partida.numero}
          </span>
          {aoVivo && !lancar ? (
            <span className="row bold org" style={{ gap: 6, fontSize: 14 }}>
              <span className="ao-vivo-dot" />
              AO VIVO · {mmss(decorrido)}
            </span>
          ) : aoVivo ? (
            <span className="bold yel" style={{ fontSize: 14 }}>LANÇANDO RESULTADO</span>
          ) : (
            <span className="bold mut" style={{ fontSize: 14 }}>{corrigindo ? 'CORRIGINDO' : 'ENCERRADO'}</span>
          )}
        </div>
        {podeEditar && !aoVivo ? (
          <button className={`btn sm${corrigindo ? ' yel' : ''}`} style={{ height: 44, borderRadius: 22 }} onClick={() => setCorrigindo((c) => !c)}>
            {corrigindo ? 'Pronto' : 'Corrigir'}
          </button>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      <div className="card grid-3" style={{ alignItems: 'center', borderRadius: 24, padding: '18px 16px' }}>
        {placarTime('A')}
        <div className="cond row" style={{ justifyContent: 'center', gap: 8, fontSize: 60 }} aria-live="polite">
          <span>{golsDe('A')}</span>
          <span style={{ color: 'var(--dim)', fontSize: 40 }}>:</span>
          <span>{golsDe('B')}</span>
        </div>
        {placarTime('B')}
      </div>

      {partida.conferir && (
        <div className="card tight col gap-8" style={{ borderColor: 'var(--org)' }}>
          <span className="bold org">Times a conferir</span>
          <span className="s13 mut">
            Este jogo foi lançado só com os gols. Os gols e assistências já contam no ranking; vitória e derrota só contam
            depois de conferir.{podeEditar ? ' Toque em Corrigir, ajuste o time de cada gol e quem jogou, e marque como conferido.' : ''}
          </span>
          {podeEditar && corrigindo && (
            <button className="btn yel full" disabled={ocupado} onClick={marcarConferido}>Está certo: marcar como conferido</button>
          )}
        </div>
      )}

      {editavel && (
        <>
          <div className="seg" role="tablist" aria-label="O que marcar">
            {MODOS.map((x) => (
              <button
                key={x.id}
                role="tab"
                aria-selected={modo === x.id}
                className={`${modo === x.id ? 'on' : ''}${x.pts < 0 ? ' neg' : ''}`}
                onClick={() => {
                  setAutor(null)
                  setModo(x.id)
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.1, height: 52 }}
              >
                <span>{x.rotulo}</span>
                <span style={{ fontSize: 12 }}>{sinal(x.pts)}</span>
              </button>
            ))}
          </div>
          <div className="passo">
            {modo === 'gol' ? (
              <>
                <b>{autor ? 2 : 1}</b> {autor ? 'Quem deu a assistência?' : 'Toque em quem fez o gol'}
              </>
            ) : modo === 'defesa' ? (
              <>
                <b>1</b> Toque em quem desarmou, cortou ou defendeu. Cada toque vale uma ação.
              </>
            ) : modo === 'sebo' ? (
              <>
                <b>!</b> Toque em quem fez a ação de sebo. Tira {Math.abs(PONTOS.sebo)} pontos.
              </>
            ) : (
              <>
                <b>!</b> Toque em quem pôs a mão na bola de propósito. Tira {Math.abs(PONTOS.mao)} pontos e fica 2 minutos fora.
              </>
            )}
          </div>
          <div className="grid-2" style={{ alignItems: 'start' }}>
            {colunaTime('A')}
            {colunaTime('B')}
          </div>
        </>
      )}
      {erro && <span className="erro" role="alert">{erro}</span>}

      {podeEditar && aoVivo && (
        <button className="btn org full" style={{ height: 52 }} onClick={encerrar} disabled={ocupado}>
          {lancar ? 'Salvar jogo' : 'Encerrar jogo'}
        </button>
      )}

      <section className="col gap-8">
        <h2 className="h2" style={{ fontSize: 18 }}>GOLS</h2>
        {gols.length === 0 && <div className="vazio">Nenhum gol ainda.</div>}
        {gols.map((g) => (
          <div key={g.id} className="item">
            <span style={{ width: 10, height: 10, borderRadius: 5, background: corHex(cor(g.lado)), boxShadow: '0 0 0 1px #4A4A45', flexShrink: 0 }} />
            <div className="col flex-1" style={{ minWidth: 0 }}>
              <span className="bold ellipsis" style={{ fontSize: 14 }}>Gol de {nome(g.autorId)}</span>
              <span className="small mut ellipsis">
                {cor(g.lado)} · {g.assistId ? `assist. de ${nome(g.assistId)}` : 'sem assistência'}
              </span>
            </div>
            {editavel && (
              <>
                <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label={`Passar gol de ${nome(g.autorId)} para o ${cor(outro(g.lado))}`} title="Trocar de time" onClick={() => trocarTime(g)} disabled={ocupado}>
                  <IconTroca />
                </button>
                <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label={`Apagar gol de ${nome(g.autorId)}`} onClick={() => apagar(g)} disabled={ocupado}>
                  <IconLixo />
                </button>
              </>
            )}
          </div>
        ))}
      </section>

      {defesas.length > 0 && (
        <section className="col gap-8">
          <h2 className="h2" style={{ fontSize: 18 }}>AÇÕES DE DEFESA</h2>
          {defesas.map((d) => (
            <div key={d.id} className="item">
              <span style={{ width: 10, height: 10, borderRadius: 5, background: corHex(cor(d.lado)), boxShadow: '0 0 0 1px #4A4A45', flexShrink: 0 }} />
              <div className="col flex-1" style={{ minWidth: 0 }}>
                <span className="bold ellipsis" style={{ fontSize: 14 }}>Defesa de {nome(d.jogadorId)}</span>
                <span className="small mut ellipsis">{cor(d.lado)} · +{PONTOS.defesa} pts</span>
              </div>
              {editavel && (
                <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label={`Apagar defesa de ${nome(d.jogadorId)}`} onClick={() => apagarDefesa(d)} disabled={ocupado}>
                  <IconLixo />
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {infracoes.length > 0 && (
        <section className="col gap-8">
          <h2 className="h2" style={{ fontSize: 18 }}>INFRAÇÕES</h2>
          {infracoes.map((x) => (
            <div key={x.id} className="item">
              <span style={{ width: 10, height: 10, borderRadius: 5, background: corHex(cor(x.lado)), boxShadow: '0 0 0 1px #4A4A45', flexShrink: 0 }} />
              <div className="col flex-1" style={{ minWidth: 0 }}>
                <span className="bold ellipsis" style={{ fontSize: 14 }}>
                  {INFRACAO_NOME[x.tipo]} · {nome(x.jogadorId)}
                </span>
                <span className="small ellipsis" style={{ color: 'var(--neg)' }}>
                  {cor(x.lado)} · {sinal(PONTOS[x.tipo])} pts{x.tipo === 'mao' ? ' · 2 min fora' : ''}
                </span>
              </div>
              {editavel && (
                <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label={`Apagar infração de ${nome(x.jogadorId)}`} onClick={() => apagarInfracao(x)} disabled={ocupado}>
                  <IconLixo />
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {podeEditar && corrigindo && (
        <button className="btn sm" style={{ background: 'transparent', color: 'var(--mut)', alignSelf: 'center' }} onClick={excluirJogo}>
          Excluir este jogo
        </button>
      )}

      {/* Assistência */}
      {autor && (
        <div className="sheet-bg" onClick={(e) => e.target === e.currentTarget && setAutor(null)}>
          <div className="card sheet col gap-12" role="dialog" aria-label={`Gol de ${autor.nome}`}>
            <div className="col gap-4">
              <span className="kicker">Gol do {cor(autor.lado)}</span>
              <span className="cond" style={{ fontSize: 28 }}>{autor.nome.toUpperCase()}</span>
              <span className="s13 mut">Quem deu a assistência?</span>
            </div>
            <div className="grid-2">
              {jogadores
                .filter((j) => j.lado === autor.lado && j.id !== autor.id)
                .map((j) => (
                  <button key={j.id} className="jog-btn" onClick={() => registrar(j.id)} disabled={ocupado}>
                    <span className="bold ellipsis" style={{ maxWidth: '100%' }}>{j.nome}</span>
                  </button>
                ))}
            </div>
            <button className="btn yel full" onClick={() => registrar(null)} disabled={ocupado}>Sem assistência</button>
            <div className="between">
              <button className="btn sm" style={{ background: 'transparent', color: 'var(--mut)' }} onClick={() => tirar(autor)}>
                Tirar {autor.nome} do time
              </button>
              <button className="btn sm" onClick={() => setAutor(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Adicionar jogador ao time */}
      {adicionarEm && (
        <div className="sheet-bg" onClick={(e) => e.target === e.currentTarget && setAdicionarEm(null)}>
          <div className="card sheet col gap-12" role="dialog" aria-label={`Adicionar jogador ao ${cor(adicionarEm)}`}>
            <div className="between">
              <span className="h2">ADICIONAR AO {cor(adicionarEm).toUpperCase()}</span>
              <button className="btn sm" onClick={() => setAdicionarEm(null)}>Fechar</button>
            </div>
            <div className="grid-2">
              {elenco
                .filter((p) => !naPartida.has(p.id))
                .map((p) => (
                  <button key={p.id} className="jog-btn" onClick={() => adicionar(p.id, adicionarEm)} disabled={ocupado}>
                    <span className="bold ellipsis" style={{ maxWidth: '100%' }}>{p.nome}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
