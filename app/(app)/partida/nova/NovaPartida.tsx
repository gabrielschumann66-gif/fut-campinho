'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { corHex, erroMsg } from '@/lib/util'

type Jog = { id: string; nome: string; confirmado: boolean }
type Lado = 'A' | 'B'

export default function NovaPartida({
  rodadaId,
  proximoNumero,
  jogadores,
  vencedor,
  coletes,
}: {
  coletes: string[]
  rodadaId: number
  proximoNumero: number
  jogadores: Jog[]
  vencedor: { cor: string; ids: string[] } | null
}) {
  const router = useRouter()
  const [cor, setCor] = useState<Record<Lado, string>>({ A: coletes[0] ?? 'Preto', B: coletes[1] ?? 'Verde' })
  const [lados, setLados] = useState<Record<string, Lado>>({})
  const [busca, setBusca] = useState('')
  const [trocandoCor, setTrocandoCor] = useState<Lado | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const time = (l: Lado) => jogadores.filter((j) => lados[j.id] === l)
  const disponiveis = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return jogadores
      .filter((j) => !lados[j.id] && (!q || j.nome.toLowerCase().includes(q)))
      .sort((a, b) => Number(b.confirmado) - Number(a.confirmado) || a.nome.localeCompare(b.nome))
  }, [jogadores, lados, busca])

  const por = (id: string, l: Lado | null) =>
    setLados((s) => {
      const n = { ...s }
      if (l) n[id] = l
      else delete n[id]
      return n
    })

  function repetirVencedor() {
    if (!vencedor) return
    const outra = coletes.find((c) => c !== vencedor.cor) ?? 'Verde'
    setCor({ A: vencedor.cor, B: cor.B === vencedor.cor ? outra : cor.B })
    setLados(Object.fromEntries(vencedor.ids.map((id) => [id, 'A' as const])))
  }

  async function criar(modo: 'vivo' | 'lancar') {
    if (cor.A === cor.B) return setErro('Escolha cores diferentes para os dois times.')
    if (modo === 'vivo' && (!time('A').length || !time('B').length)) return setErro('Coloque pelo menos um jogador em cada time.')
    setSalvando(true)
    setErro(null)
    const supabase = createClient()
    const { data: partida, error } = await supabase
      .from('partidas')
      .insert({ rodada_id: rodadaId, numero: proximoNumero, cor_a: cor.A, cor_b: cor.B })
      .select('id')
      .single()
    if (error || !partida) {
      setSalvando(false)
      return setErro(erroMsg(error))
    }
    const linhas = Object.entries(lados).map(([jogador_id, lado]) => ({ partida_id: partida.id, jogador_id, lado }))
    if (linhas.length) {
      const { error: e2 } = await supabase.from('partida_jogadores').insert(linhas)
      if (e2) {
        await supabase.from('partidas').delete().eq('id', partida.id)
        setSalvando(false)
        return setErro(erroMsg(e2))
      }
    }
    router.push(`/partida/${partida.id}${modo === 'lancar' ? '?modo=lancar' : ''}`)
  }

  const coluna = (l: Lado) => (
    <div className="time-col">
      <button type="button" className="time-head" style={{ border: 'none', color: 'var(--txt)' }} onClick={() => setTrocandoCor(trocandoCor === l ? null : l)}>
        <span style={{ width: 14, height: 14, borderRadius: 7, background: corHex(cor[l]), boxShadow: '0 0 0 1px #4A4A45' }} />
        <span className="flex-1 ellipsis" style={{ textAlign: 'left' }}>{cor[l]}</span>
        <span className="small mut">{time(l).length}</span>
      </button>
      {time(l).length === 0 && <span className="small mut center" style={{ padding: '10px 0' }}>Nenhum jogador</span>}
      {time(l).map((j) => (
        <button key={j.id} type="button" className="jog-btn on" onClick={() => por(j.id, null)} aria-label={`Tirar ${j.nome} do time`}>
          <span className="bold ellipsis" style={{ fontSize: 13, maxWidth: '100%' }}>{j.nome}</span>
          <span className="small mut">tocar para tirar</span>
        </button>
      ))}
    </div>
  )

  return (
    <>
      <div className="passo"><b>1</b> Monte os dois times</div>

      {vencedor && (
        <button className="btn full" onClick={repetirVencedor}>
          Quem ganhou fica: repetir o {vencedor.cor}
        </button>
      )}

      <section className="card col gap-10">
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {coluna('A')}
          {coluna('B')}
        </div>
        {trocandoCor && (
          <div className="col gap-6">
            <span className="small mut">Cor do time {trocandoCor === 'A' ? 'da esquerda' : 'da direita'}</span>
            <div className="chips">
              {coletes.filter((c) => c !== cor[trocandoCor === 'A' ? 'B' : 'A']).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip${cor[trocandoCor] === c ? ' on' : ''}`}
                  onClick={() => {
                    setCor({ ...cor, [trocandoCor]: c })
                    setTrocandoCor(null)
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: corHex(c), boxShadow: '0 0 0 1px #4A4A45' }} />
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
        {coletes.length > 2 ? (
          <span className="small mut center">Toque no nome do time para trocar o colete</span>
        ) : (
          <button type="button" className="btn sm" style={{ alignSelf: 'center' }} onClick={() => setCor({ A: cor.B, B: cor.A })}>
            Inverter coletes
          </button>
        )}
      </section>

      <section className="col gap-8">
        <input className="input" placeholder="Buscar jogador" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar jogador" />
        {disponiveis.length === 0 && <div className="vazio">{busca ? 'Ninguém com esse nome.' : 'Todos já estão em um time.'}</div>}
        {disponiveis.map((j) => (
          <div key={j.id} className="disp-row">
            <span className="col" style={{ minWidth: 0 }}>
              <span className="bold ellipsis">{j.nome}</span>
              {j.confirmado && <span className="small yel">confirmado</span>}
            </span>
            <button type="button" className="btn" onClick={() => por(j.id, 'A')} aria-label={`${j.nome} no ${cor.A}`}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: corHex(cor.A), boxShadow: '0 0 0 1px #4A4A45' }} />
              {cor.A}
            </button>
            <button type="button" className="btn" onClick={() => por(j.id, 'B')} aria-label={`${j.nome} no ${cor.B}`}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: corHex(cor.B), boxShadow: '0 0 0 1px #4A4A45' }} />
              {cor.B}
            </button>
          </div>
        ))}
      </section>

      <div className="passo"><b>2</b> Escolha como registrar</div>
      {erro && <span className="erro" role="alert">{erro}</span>}
      <div className="col gap-8" style={{ position: 'sticky', bottom: 96, zIndex: 5, background: 'var(--bg)', paddingTop: 8 }}>
        <button className="btn org full" style={{ height: 56, fontSize: 16 }} disabled={salvando} onClick={() => criar('vivo')}>
          {salvando ? 'Criando…' : `Começar jogo ${proximoNumero} ao vivo`}
        </button>
        <button className="btn full" disabled={salvando} onClick={() => criar('lancar')}>
          Lançar jogo que já terminou
        </button>
      </div>
    </>
  )
}
