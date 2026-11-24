'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/Avatar'
import { erroMsg, hojeISO } from '@/lib/util'

type Item = { id: string; nome: string; avatar?: string | null; pago: boolean; pagoEm?: string; metodo?: string }
type Filtro = 'todos' | 'pend' | 'pagos'

const dm = (iso?: string) => (iso ? iso.split('-').reverse().slice(0, 2).join('/') : '')

export default function CaixaLista({
  lista,
  competencia,
  valor,
  vencimento,
  podeEditar,
  registradoPor,
}: {
  lista: Item[]
  competencia: string
  valor: number
  vencimento: string
  podeEditar: boolean
  registradoPor: string
}) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // Resposta imediata: marca na tela e confirma no servidor em seguida
  const [marcados, setMarcados] = useState<Record<string, boolean>>({})
  lista = lista.map((p) => (p.id in marcados ? { ...p, pago: marcados[p.id], pagoEm: marcados[p.id] ? p.pagoEm ?? hojeISO() : undefined, metodo: p.metodo ?? 'Pix' } : p))

  async function alternar(item: Item) {
    if (item.pago && !confirm(`Desmarcar o pagamento de ${item.nome}?`)) return
    setOcupado(item.id)
    setErro(null)
    setMarcados((m) => ({ ...m, [item.id]: !item.pago }))
    const supabase = createClient()
    const { error } = item.pago
      ? await supabase.from('pagamentos').delete().eq('jogador_id', item.id).eq('competencia', competencia)
      : await supabase.from('pagamentos').insert({
          jogador_id: item.id,
          competencia,
          valor,
          pago_em: hojeISO(),
          metodo: 'Pix',
          registrado_por: registradoPor,
        })
    setOcupado(null)
    if (error) {
      setMarcados((m) => ({ ...m, [item.id]: item.pago }))
      return setErro(erroMsg(error))
    }
    router.refresh()
  }

  const visiveis = lista.filter((p) => filtro === 'todos' || (filtro === 'pagos' ? p.pago : !p.pago))
  const FILTROS: [Filtro, string][] = [
    ['todos', 'Todos'],
    ['pend', 'Pendentes'],
    ['pagos', 'Pagos'],
  ]

  return (
    <>
      <div className="chips">
        {FILTROS.map(([k, label]) => (
          <button key={k} className={`chip${filtro === k ? ' on' : ''}`} onClick={() => setFiltro(k)} aria-pressed={filtro === k}>
            {label}
          </button>
        ))}
      </div>
      {erro && <span className="erro">{erro}</span>}
      <div className="col gap-8">
        {visiveis.length === 0 && <div className="vazio">Ninguém nesta lista.</div>}
        {visiveis.map((p) => (
          <div key={p.id} className="item" style={{ padding: '8px 8px 8px 12px' }}>
            <Avatar id={p.avatar} nome={p.nome} size={40} />
            <div className="col flex-1">
              <span className="ellipsis" style={{ fontWeight: 600, fontSize: 15 }}>{p.nome}</span>
              <span className="small mut">{p.pago ? `Pago em ${dm(p.pagoEm)} · ${p.metodo}` : `Vence ${vencimento}`}</span>
            </div>
            {podeEditar ? (
              <button
                onClick={() => alternar(p)}
                disabled={ocupado === p.id}
                className="btn sm"
                style={{
                  height: 44,
                  minWidth: 104,
                  background: p.pago ? 'var(--yel-soft)' : 'transparent',
                  color: p.pago ? 'var(--yel)' : 'var(--org)',
                  borderColor: p.pago ? 'var(--yel-line)' : 'var(--org)',
                }}
              >
                {p.pago ? '✓ Pago' : 'Marcar pago'}
              </button>
            ) : (
              <span className="s13 bold" style={{ color: p.pago ? 'var(--yel)' : 'var(--org)', paddingRight: 8 }}>
                {p.pago ? 'Pago' : 'Pendente'}
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
