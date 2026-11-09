'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CORES_TIME, erroMsg } from '@/lib/util'

type Jog = { id: string; nome: string; confirmado: boolean }

export default function NovaPartida({
  rodadaId,
  proximoNumero,
  jogadores,
  vencedor,
}: {
  rodadaId: number
  proximoNumero: number
  jogadores: Jog[]
  vencedor: { cor: string; ids: string[] } | null
}) {
  const router = useRouter()
  const [corA, setCorA] = useState('Laranja')
  const [corB, setCorB] = useState('Branco')
  const [lados, setLados] = useState<Record<string, 'A' | 'B'>>({})
  const [verTodos, setVerTodos] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const visiveis = jogadores.filter((j) => verTodos || j.confirmado || lados[j.id])
  const nA = Object.values(lados).filter((l) => l === 'A').length
  const nB = Object.values(lados).filter((l) => l === 'B').length

  function tocar(id: string) {
    setLados((s) => {
      const n = { ...s }
      if (!n[id]) n[id] = 'A'
      else if (n[id] === 'A') n[id] = 'B'
      else delete n[id]
      return n
    })
  }

  function manterVencedor() {
    if (!vencedor) return
    setCorA(vencedor.cor)
    if (corB === vencedor.cor) setCorB(CORES_TIME.find((c) => c.nome !== vencedor.cor)!.nome)
    setLados(Object.fromEntries(vencedor.ids.map((id) => [id, 'A' as const])))
  }

  async function iniciar() {
    if (corA === corB) return setErro('Escolha cores diferentes para os dois times.')
    if (!nA || !nB) return setErro('Coloque pelo menos um jogador em cada time.')
    setSalvando(true)
    setErro(null)
    const supabase = createClient()
    const { data: partida, error } = await supabase
      .from('partidas')
      .insert({ rodada_id: rodadaId, numero: proximoNumero, cor_a: corA, cor_b: corB })
      .select('id')
      .single()
    if (error || !partida) {
      setSalvando(false)
      return setErro(erroMsg(error))
    }
    const { error: e2 } = await supabase
      .from('partida_jogadores')
      .insert(Object.entries(lados).map(([jogador_id, lado]) => ({ partida_id: partida.id, jogador_id, lado })))
    if (e2) {
      await supabase.from('partidas').delete().eq('id', partida.id)
      setSalvando(false)
      return setErro(erroMsg(e2))
    }
    router.push(`/partida/${partida.id}`)
  }

  const seletorCor = (valor: string, set: (c: string) => void, rotulo: string) => (
    <div className="field">
      {rotulo}
      <div className="chips">
        {CORES_TIME.map((c) => (
          <button
            key={c.nome}
            type="button"
            className={`chip${valor === c.nome ? ' on' : ''}`}
            onClick={() => set(c.nome)}
            aria-pressed={valor === c.nome}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 5, background: c.hex, boxShadow: '0 0 0 1px #4A4A45' }} />
            {c.nome}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <section className="card col gap-12">
      <div className="between">
        <h2 className="h2">NOVO JOGO · {proximoNumero}</h2>
        {vencedor && (
          <button className="btn sm" onClick={manterVencedor}>
            Manter {vencedor.cor}
          </button>
        )}
      </div>
      {seletorCor(corA, setCorA, `Time A (${nA})`)}
      {seletorCor(corB, setCorB, `Time B (${nB})`)}

      <span className="s13 mut">Toque no jogador: 1× Time A · 2× Time B · 3× tira</span>
      <div className="grid-3">
        {visiveis.map((j) => {
          const l = lados[j.id]
          const cor = l === 'A' ? corA : l === 'B' ? corB : null
          const hex = cor ? CORES_TIME.find((c) => c.nome === cor)?.hex : undefined
          return (
            <button
              key={j.id}
              onClick={() => tocar(j.id)}
              style={{
                height: 56,
                borderRadius: 14,
                border: `1px solid ${l ? 'var(--yel)' : 'var(--line)'}`,
                background: l ? 'var(--yel-soft)' : 'var(--bg)',
                color: 'var(--txt)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                padding: '0 4px',
              }}
            >
              <span className="bold ellipsis" style={{ fontSize: 13, maxWidth: '100%' }}>{j.nome}</span>
              <span className="small mut row" style={{ gap: 4 }}>
                {hex && <span style={{ width: 8, height: 8, borderRadius: 4, background: hex, boxShadow: '0 0 0 1px #4A4A45' }} />}
                {cor ?? (j.confirmado ? 'confirmado' : '—')}
              </span>
            </button>
          )
        })}
      </div>
      <button className="btn sm" onClick={() => setVerTodos((v) => !v)}>
        {verTodos ? 'Mostrar só confirmados' : 'Mostrar todos os jogadores'}
      </button>
      {erro && <span className="erro">{erro}</span>}
      <button className="btn org full" disabled={salvando} onClick={iniciar}>
        {salvando ? 'Iniciando…' : 'Começar jogo'}
      </button>
    </section>
  )
}
