'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { IconLixo, IconMais, IconTroca, IconVoltar } from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import { corHex, erroMsg } from '@/lib/util'

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
  vitorias,
  podeEditar,
  lancar,
}: {
  partida: Partida
  jogadores: Jogador[]
  nomes: Record<string, string>
  elenco: { id: string; nome: string }[]
  gols: Gol[]
  vitorias: Record<string, number>
  podeEditar: boolean
  lancar: boolean
}) {
  const router = useRouter()
  const aoVivo = partida.status === 'ao_vivo'
  const [corrigindo, setCorrigindo] = useState(false)
  const [autor, setAutor] = useState<Jogador | null>(null)
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

  async function tirar(j: Jogador) {
    if (gols.some((g) => g.autorId === j.id || g.assistId === j.id)) {
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
          return (
            <button key={j.id} className="jog-btn" disabled={ocupado} onClick={() => setAutor(j)}>
              <span className="bold ellipsis" style={{ fontSize: 14, maxWidth: '100%' }}>{j.nome}</span>
              <span className="mut" style={{ fontSize: 11 }}>
                {g || a ? [g && `${g}G`, a && `${a}A`].filter(Boolean).join(' · ') : 'tocar = gol'}
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
          <div className="passo">
            <b>{autor ? 2 : 1}</b> {autor ? 'Quem deu a assistência?' : 'Toque em quem fez o gol'}
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
        <h2 className="h2" style={{ fontSize: 18 }}>LANCES</h2>
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
