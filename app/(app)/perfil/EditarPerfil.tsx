'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { IconEngrenagem } from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import { erroMsg, type Perfil } from '@/lib/util'

const POSICOES = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA']

export default function EditarPerfil({ perfil, abrirSenha }: { perfil: Perfil; abrirSenha: boolean }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(abrirSenha)
  const [nome, setNome] = useState(perfil.nome)
  const [apelido, setApelido] = useState(perfil.apelido ?? '')
  const [posicao, setPosicao] = useState(perfil.posicao)
  const [senha, setSenha] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setMsg(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ nome: nome.trim(), apelido: apelido.trim() || null, posicao })
      .eq('id', perfil.id)
    if (!error && senha) {
      const r = await supabase.auth.updateUser({ password: senha })
      if (r.error) {
        setSalvando(false)
        return setMsg({ ok: false, t: erroMsg(r.error) })
      }
    }
    setSalvando(false)
    if (error) return setMsg({ ok: false, t: erroMsg(error) })
    setSenha('')
    setMsg({ ok: true, t: 'Perfil salvo.' })
    router.refresh()
  }

  async function sair() {
    await createClient().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <>
      <button className="icon-btn" aria-label="Configurações do perfil" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        <IconEngrenagem />
      </button>
      {aberto && (
        <div
          role="dialog"
          aria-label="Editar perfil"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={(e) => e.target === e.currentTarget && setAberto(false)}
        >
          <form onSubmit={salvar} className="card col gap-12" style={{ width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0', padding: 20, paddingBottom: 32 }}>
            <div className="between">
              <h2 className="h2">EDITAR PERFIL</h2>
              <button type="button" className="btn sm" onClick={() => setAberto(false)}>Fechar</button>
            </div>
            <label className="field">
              Nome
              <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </label>
            <label className="field">
              Apelido (aparece no ranking)
              <input className="input" value={apelido} onChange={(e) => setApelido(e.target.value)} />
            </label>
            <div className="field">
              Posição
              <div className="chips">
                {POSICOES.map((p) => (
                  <button type="button" key={p} className={`chip${posicao === p ? ' on' : ''}`} onClick={() => setPosicao(p)} aria-pressed={posicao === p}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              Nova senha (opcional)
              <input className="input" type="password" minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
            </label>
            {msg && <span className={msg.ok ? 'ok' : 'erro'}>{msg.t}</span>}
            <button className="btn yel full" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
            <button type="button" className="btn full" onClick={sair}>Sair da conta</button>
          </form>
        </div>
      )}
    </>
  )
}
