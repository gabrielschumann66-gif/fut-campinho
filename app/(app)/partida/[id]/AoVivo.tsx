'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { IconLixo, IconVoltar } from '@/components/icons'
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
  iniciadaEm: string
  encerradaEm: string | null
}
type Jogador = { id: string; lado: Lado; nome: string }
type Gol = { id: number; lado: Lado; autorId: string; assistId: string | null; minuto: number }

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function AoVivo({
  partida,
  jogadores,
  gols,
  vitorias,
  podeEditar,
}: {
  partida: Partida
  jogadores: Jogador[]
  gols: Gol[]
  vitorias: Record<string, number>
  podeEditar: boolean
}) {
  const router = useRouter()
  const [lado, setLado] = useState<Lado>('A')
  const [autor, setAutor] = useState<string | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const aoVivo = partida.status === 'ao_vivo'
  const editavel = podeEditar && aoVivo

  // Cronômetro
  useEffect(() => {
    if (!aoVivo) return
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [aoVivo])

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

  const nome = (id: string | null) => jogadores.find((j) => j.id === id)?.nome ?? '?'
  const golsDe = (l: Lado) => gols.filter((g) => g.lado === l).length
  const fim = partida.encerradaEm ? new Date(partida.encerradaEm).getTime() : agora
  const decorrido = fim - new Date(partida.iniciadaEm).getTime()
  const elenco = jogadores.filter((j) => j.lado === lado)

  async function registrar(assistId: string | null) {
    if (!autor) return
    setOcupado(true)
    setErro(null)
    const minuto = Math.max(1, Math.ceil(decorrido / 60000))
    const { error } = await createClient()
      .from('gols')
      .insert({ partida_id: partida.id, lado, autor_id: autor, assist_id: assistId, minuto })
    setOcupado(false)
    if (error) return setErro(erroMsg(error))
    setAutor(null)
    router.refresh()
  }

  function tocar(id: string) {
    if (!editavel || ocupado) return
    if (!autor) setAutor(id)
    else if (autor === id) setAutor(null)
    else registrar(id)
  }

  async function desfazer(g: Gol) {
    if (!confirm(`Apagar o gol de ${nome(g.autorId)}?`)) return
    const { error } = await createClient().from('gols').delete().eq('id', g.id)
    if (error) return setErro(erroMsg(error))
    router.refresh()
  }

  async function encerrar() {
    const a = golsDe('A')
    const b = golsDe('B')
    const resultado = a === b ? 'empate' : `vitória do ${a > b ? partida.corA : partida.corB}`
    if (!confirm(`Encerrar o jogo ${a} × ${b} (${resultado})?`)) return
    setOcupado(true)
    const { error } = await createClient()
      .from('partidas')
      .update({ status: 'encerrada', encerrada_em: new Date().toISOString() })
      .eq('id', partida.id)
    setOcupado(false)
    if (error) return setErro(erroMsg(error))
    router.push('/partida')
    router.refresh()
  }

  const time = (cor: string, l: Lado) => {
    const v = vitorias[cor] ?? 0
    return (
      <div className="col" style={{ alignItems: 'center', gap: 6 }}>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: corHex(cor), boxShadow: '0 0 0 1px #4A4A45' }} />
        <span className="bold" style={{ fontSize: 14 }}>{cor}</span>
        <span className="mut" style={{ fontSize: 11 }}>
          {v} {v === 1 ? 'vitória' : 'vitórias'} hoje · {jogadores.filter((j) => j.lado === l).length} jog.
        </span>
      </div>
    )
  }

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
          {aoVivo ? (
            <span className="row bold org" style={{ gap: 6, fontSize: 14 }}>
              <span className="ao-vivo-dot" />
              AO VIVO · {mmss(decorrido)}
            </span>
          ) : (
            <span className="bold mut" style={{ fontSize: 14 }}>ENCERRADO · {mmss(decorrido)}</span>
          )}
        </div>
        {editavel ? (
          <button className="btn sm" style={{ height: 44, borderRadius: 22 }} onClick={encerrar} disabled={ocupado}>
            Encerrar
          </button>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      <div className="card grid-3" style={{ alignItems: 'center', borderRadius: 24, padding: '18px 16px' }}>
        {time(partida.corA, 'A')}
        <div className="cond row" style={{ justifyContent: 'center', gap: 8, fontSize: 60 }} aria-live="polite">
          <span>{golsDe('A')}</span>
          <span style={{ color: 'var(--dim)', fontSize: 40 }}>:</span>
          <span>{golsDe('B')}</span>
        </div>
        {time(partida.corB, 'B')}
      </div>

      {editavel && (
        <>
          <div className="seg">
            {(['A', 'B'] as Lado[]).map((l) => (
              <button
                key={l}
                className={lado === l ? 'on' : ''}
                onClick={() => {
                  setLado(l)
                  setAutor(null)
                }}
                style={{ height: 44 }}
              >
                Gol do {l === 'A' ? partida.corA : partida.corB}
              </button>
            ))}
          </div>

          <div className="col gap-8">
            <span className="s13 mut bold">{autor ? 'Agora toque em quem deu a assistência' : 'Toque em quem fez o gol'}</span>
            <div className="grid-3">
              {elenco.map((j) => {
                const g = gols.filter((x) => x.autorId === j.id).length
                const ehAutor = autor === j.id
                return (
                  <button
                    key={j.id}
                    onClick={() => tocar(j.id)}
                    disabled={ocupado}
                    style={{
                      height: 64,
                      borderRadius: 16,
                      border: `1px solid ${ehAutor ? 'var(--yel)' : 'var(--line)'}`,
                      background: ehAutor ? '#3A3410' : 'var(--card)',
                      color: 'var(--txt)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      padding: '0 4px',
                    }}
                  >
                    <span className="bold ellipsis" style={{ fontSize: 14, maxWidth: '100%' }}>{j.nome}</span>
                    <span className="mut" style={{ fontSize: 11 }}>
                      {ehAutor ? 'marcou' : g ? `${g} ${g > 1 ? 'gols' : 'gol'}` : '—'}
                    </span>
                  </button>
                )
              })}
            </div>
            {autor && (
              <button className="btn ghost full" style={{ height: 44 }} onClick={() => registrar(null)} disabled={ocupado}>
                Sem assistência
              </button>
            )}
          </div>
        </>
      )}
      {erro && <span className="erro" role="alert">{erro}</span>}

      <section className="col gap-8">
        <h2 className="h2" style={{ fontSize: 18 }}>LANCES</h2>
        {gols.length === 0 && <div className="vazio">Nenhum gol ainda.</div>}
        {gols.map((g) => (
          <div key={g.id} className="item">
            <span style={{ width: 10, height: 10, borderRadius: 5, background: corHex(g.lado === 'A' ? partida.corA : partida.corB), boxShadow: '0 0 0 1px #4A4A45' }} />
            <div className="col flex-1">
              <span className="bold" style={{ fontSize: 14 }}>Gol de {nome(g.autorId)}</span>
              <span className="small mut">{g.assistId ? `Assist. de ${nome(g.assistId)}` : 'Sem assistência'}</span>
            </div>
            <span className="small mut">{String(g.minuto).padStart(2, '0')}&apos;</span>
            {podeEditar && (
              <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label={`Apagar gol de ${nome(g.autorId)}`} onClick={() => desfazer(g)}>
                <IconLixo />
              </button>
            )}
          </div>
        ))}
      </section>
    </main>
  )
}
