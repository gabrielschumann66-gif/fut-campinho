'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { erroMsg } from '@/lib/util'

type Modo = 'entrar' | 'cadastrar' | 'recuperar'

export default function LoginPage() {
  const router = useRouter()
  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setAviso(null)
    setCarregando(true)
    const supabase = createClient()
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
        if (error) throw error
        router.replace('/')
        router.refresh()
      } else if (modo === 'cadastrar') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome: nome.trim() }, emailRedirectTo: `${window.location.origin}/` },
        })
        if (error) throw error
        if (data.session) {
          router.replace('/')
          router.refresh()
        } else {
          setAviso('Conta criada! Confirme pelo link que enviamos para o seu e-mail e depois entre.')
          setModo('entrar')
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/perfil?senha=1`,
        })
        if (error) throw error
        setAviso('Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.')
      }
    } catch (err) {
      const msg = erroMsg(err)
      setErro(msg === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : msg)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="app">
      <div className="screen sem-nav" style={{ justifyContent: 'center', gap: 24 }}>
        <div className="col" style={{ alignItems: 'center', gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/escudo.svg" alt="Escudo do Campinho" width={120} height={100} style={{ objectFit: 'contain' }} />
          <h1 className="title">FUT CAMPINHO</h1>
          <span className="mut s13">
            {modo === 'entrar' ? 'Entre para confirmar presença e ver o ranking' : modo === 'cadastrar' ? 'Crie sua conta de jogador' : 'Recuperar senha'}
          </span>
        </div>

        <form onSubmit={enviar} className="col gap-12">
          {modo === 'cadastrar' && (
            <label className="field">
              Nome
              <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="name" />
            </label>
          )}
          <label className="field">
            E-mail
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          {modo !== 'recuperar' && (
            <label className="field">
              Senha
              <input
                className="input"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              />
            </label>
          )}
          {erro && <span className="erro" role="alert">{erro}</span>}
          {aviso && <span className="ok" role="status">{aviso}</span>}
          <button className="btn yel full" disabled={carregando}>
            {carregando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : modo === 'cadastrar' ? 'Criar conta' : 'Enviar link'}
          </button>
        </form>

        <div className="col gap-8" style={{ alignItems: 'center' }}>
          {modo !== 'entrar' && (
            <button className="btn sm" style={{ background: 'transparent', border: 'none', color: 'var(--yel)' }} onClick={() => setModo('entrar')}>
              Já tenho conta
            </button>
          )}
          {modo !== 'cadastrar' && (
            <button className="btn sm" style={{ background: 'transparent', border: 'none', color: 'var(--yel)' }} onClick={() => setModo('cadastrar')}>
              Criar conta
            </button>
          )}
          {modo === 'entrar' && (
            <button className="btn sm" style={{ background: 'transparent', border: 'none', color: 'var(--mut)' }} onClick={() => setModo('recuperar')}>
              Esqueci minha senha
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
