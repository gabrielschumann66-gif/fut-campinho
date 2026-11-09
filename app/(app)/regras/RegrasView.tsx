'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { IconMais } from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import { erroMsg } from '@/lib/util'

export type Regra = { id: number; ordem: number; categoria: string; titulo: string; texto: string }

const CATS = ['Jogo', 'Times', 'Pagamento', 'Conduta']

export default function RegrasView({ regras, podeEditar, meuId }: { regras: Regra[]; podeEditar: boolean; meuId: string }) {
  const router = useRouter()
  const [cat, setCat] = useState('Todas')
  const [aberta, setAberta] = useState<number | null>(regras[0]?.id ?? null)
  const [editando, setEditando] = useState<Partial<Regra> | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const lista = regras.filter((r) => cat === 'Todas' || r.categoria === cat)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    setSalvando(true)
    setErro(null)
    const supabase = createClient()
    const dados = {
      categoria: editando.categoria ?? 'Jogo',
      titulo: (editando.titulo ?? '').trim(),
      texto: (editando.texto ?? '').trim(),
      atualizado_por: meuId,
      atualizado_em: new Date().toISOString(),
    }
    const { error } = editando.id
      ? await supabase.from('regras').update(dados).eq('id', editando.id)
      : await supabase.from('regras').insert({ ...dados, ordem: Math.max(0, ...regras.map((r) => r.ordem)) + 1 })
    setSalvando(false)
    if (error) return setErro(erroMsg(error))
    setEditando(null)
    router.refresh()
  }

  async function excluir(r: Regra) {
    if (!confirm(`Excluir a regra "${r.titulo}"?`)) return
    const { error } = await createClient().from('regras').delete().eq('id', r.id)
    if (error) return setErro(erroMsg(error))
    router.refresh()
  }

  return (
    <>
      <div className="chips">
        {['Todas', ...CATS].map((k) => (
          <button key={k} className={`chip${cat === k ? ' on' : ''}`} onClick={() => setCat(k)} aria-pressed={cat === k}>
            {k}
          </button>
        ))}
      </div>
      {erro && <span className="erro">{erro}</span>}

      <div className="col gap-8">
        {lista.length === 0 && <div className="vazio">Nenhuma regra nesta categoria.</div>}
        {lista.map((r, i) => {
          const on = aberta === r.id
          return (
            <div key={r.id} style={{ background: 'var(--card)', border: `1px solid ${on ? 'var(--yel-line)' : 'var(--line)'}`, borderRadius: 18, overflow: 'hidden' }}>
              <button
                onClick={() => setAberta(on ? null : r.id)}
                aria-expanded={on}
                style={{ width: '100%', minHeight: 60, border: 'none', background: 'transparent', color: 'var(--txt)', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', textAlign: 'left' }}
              >
                <span
                  className="cond"
                  style={{ width: 36, height: 36, borderRadius: 10, background: on ? 'var(--yel)' : 'var(--line)', color: on ? 'var(--bg)' : 'var(--txt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="col flex-1">
                  <span className="bold" style={{ fontSize: 15 }}>{r.titulo}</span>
                  <span className="small mut">{r.categoria}</span>
                </span>
                <span className="mut" style={{ fontSize: 20, width: 20, textAlign: 'center' }} aria-hidden="true">{on ? '−' : '+'}</span>
              </button>
              {on && (
                <div className="col gap-10" style={{ padding: '0 14px 14px 62px' }}>
                  <span style={{ fontSize: 14, lineHeight: 1.45, color: '#D6D6CF', whiteSpace: 'pre-line' }}>{r.texto}</span>
                  {podeEditar && (
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn sm" style={{ background: 'transparent', color: 'var(--yel)' }} onClick={() => setEditando(r)}>
                        Editar esta regra
                      </button>
                      <button className="btn sm" style={{ background: 'transparent', color: 'var(--mut)' }} onClick={() => excluir(r)}>
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {podeEditar && (
          <button className="btn ghost full" style={{ height: 52, borderRadius: 18 }} onClick={() => setEditando({ categoria: cat === 'Todas' ? 'Jogo' : cat })}>
            <IconMais size={18} stroke={2.2} />
            Nova regra
          </button>
        )}
      </div>

      {editando && (
        <div
          role="dialog"
          aria-label={editando.id ? 'Editar regra' : 'Nova regra'}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={(e) => e.target === e.currentTarget && setEditando(null)}
        >
          <form onSubmit={salvar} className="card col gap-12" style={{ width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0', padding: 20, paddingBottom: 32 }}>
            <h2 className="h2">{editando.id ? 'EDITAR REGRA' : 'NOVA REGRA'}</h2>
            <div className="field">
              Categoria
              <div className="chips">
                {CATS.map((c) => (
                  <button type="button" key={c} className={`chip${editando.categoria === c ? ' on' : ''}`} onClick={() => setEditando({ ...editando, categoria: c })}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              Título
              <input className="input" value={editando.titulo ?? ''} onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} required />
            </label>
            <label className="field">
              Texto
              <textarea className="input" value={editando.texto ?? ''} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} required />
            </label>
            {erro && <span className="erro">{erro}</span>}
            <button className="btn yel full" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar regra'}</button>
            <button type="button" className="btn full" onClick={() => setEditando(null)}>Cancelar</button>
          </form>
        </div>
      )}
    </>
  )
}
