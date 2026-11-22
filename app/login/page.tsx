'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { emailDoTelefone, erroMsg, mascaraTelefone, normalizarTelefone } from '@/lib/util'

type Etapa = 'telefone' | 'entrar' | 'criar' | 'sem_convite'

export default function LoginPage() {
  const router = useRouter()
  const [etapa, setEtapa] = useState<Etapa>('telefone')
  const [telefone, setTelefone] = useState('')
  const [nome, setNome] = useState('')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const pinRef = useRef<HTMLInputElement>(null)

  // Sessão sem perfil (ex.: acesso resetado): sai antes de mostrar o login
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('sair')) createClient().auth.signOut()
  }, [])

  useEffect(() => {
    if (etapa === 'entrar' || etapa === 'criar') pinRef.current?.focus()
  }, [etapa])

  function voltar() {
    setEtapa('telefone')
    setPin('')
    setPin2('')
    setErro(null)
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const tel = normalizarTelefone(telefone)
    if (tel.length < 12) return setErro('Digite o celular com DDD.')
    setCarregando(true)
    const { data, error } = await createClient().rpc('status_acesso', { p_telefone: tel })
    setCarregando(false)
    if (error) return setErro(erroMsg(error))
    const r = (data as { nome: string; status: string }[] | null)?.[0]
    if (!r) {
      setNome('')
      return setEtapa('sem_convite')
    }
    setNome(r.nome)
    setEtapa(r.status === 'ativo' ? 'entrar' : r.status === 'primeiro_acesso' ? 'criar' : 'sem_convite')
  }

  async function enviarPin(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (pin.length < 6) return setErro('O PIN tem 6 dígitos.')
    if (etapa === 'criar' && pin !== pin2) return setErro('Os dois PINs não são iguais.')
    setCarregando(true)
    const supabase = createClient()
    const email = emailDoTelefone(telefone)
    try {
      if (etapa === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pin })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pin,
          options: { data: { telefone: normalizarTelefone(telefone) } },
        })
        if (error) throw error
        if (!data.session) {
          const r = await supabase.auth.signInWithPassword({ email, password: pin })
          if (r.error) throw r.error
        }
      }
      router.replace('/')
      router.refresh()
    } catch (err) {
      const msg = erroMsg(err)
      setErro(
        msg === 'Invalid login credentials'
          ? 'PIN incorreto. Esqueceu? Peça para um capitão resetar seu acesso.'
          : msg.includes('Database error')
            ? 'Não foi possível criar seu acesso. Peça para um capitão conferir seu convite.'
            : msg,
      )
    } finally {
      setCarregando(false)
    }
  }

  const pinInput = (valor: string, set: (v: string) => void, rotulo: string, ref?: React.RefObject<HTMLInputElement | null>) => (
    <label className="field">
      {rotulo}
      <input
        ref={ref}
        className="input pin"
        type="password"
        inputMode="numeric"
        autoComplete={etapa === 'entrar' ? 'current-password' : 'new-password'}
        maxLength={6}
        value={valor}
        onChange={(e) => set(e.target.value.replace(/\D/g, '').slice(0, 6))}
        required
      />
    </label>
  )

  return (
    <main className="app">
      <div className="screen sem-nav" style={{ justifyContent: 'center', gap: 24 }}>
        <div className="col" style={{ alignItems: 'center', gap: 10, textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/escudo.svg" alt="Escudo do Campinho" width={120} height={100} style={{ objectFit: 'contain' }} />
          <h1 className="title">FUT CAMPINHO</h1>
          <span className="mut s13">
            {etapa === 'telefone' && 'Entre com o celular cadastrado no grupo'}
            {etapa === 'entrar' && `Fala, ${nome}! Digite seu PIN.`}
            {etapa === 'criar' && `Bem-vindo, ${nome}! Crie um PIN de 6 números para entrar.`}
            {etapa === 'sem_convite' && 'Acesso ainda não liberado'}
          </span>
        </div>

        {etapa === 'telefone' && (
          <form onSubmit={verificar} className="col gap-12">
            <label className="field">
              Celular
              <input
                className="input"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="(21) 98765-4321"
                value={telefone}
                onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
                required
                autoFocus
              />
            </label>
            {erro && <span className="erro" role="alert">{erro}</span>}
            <button className="btn yel full" disabled={carregando}>{carregando ? 'Verificando…' : 'Continuar'}</button>
          </form>
        )}

        {(etapa === 'entrar' || etapa === 'criar') && (
          <form onSubmit={enviarPin} className="col gap-12">
            <button type="button" className="item" onClick={voltar} style={{ border: 'none', textAlign: 'left' }}>
              <span className="flex-1">
                <span className="small mut">Celular</span>
                <br />
                <span className="bold">{telefone}</span>
              </span>
              <span className="small yel bold">Trocar</span>
            </button>
            {pinInput(pin, setPin, etapa === 'entrar' ? 'PIN' : 'Crie seu PIN (6 números)', pinRef)}
            {etapa === 'criar' && pinInput(pin2, setPin2, 'Repita o PIN')}
            {erro && <span className="erro" role="alert">{erro}</span>}
            <button className="btn yel full" disabled={carregando}>
              {carregando ? 'Aguarde…' : etapa === 'entrar' ? 'Entrar' : 'Criar acesso e entrar'}
            </button>
            {etapa === 'criar' && (
              <span className="small mut center">Guarde o PIN. Se esquecer, um capitão reseta seu acesso.</span>
            )}
          </form>
        )}

        {etapa === 'sem_convite' && (
          <div className="col gap-12">
            <div className="card col gap-8" style={{ textAlign: 'center' }}>
              <span className="bold">{nome ? `${nome}, seu acesso ainda não foi liberado.` : 'Este celular não está cadastrado no grupo.'}</span>
              <span className="s13 mut">
                O app funciona por convite. Peça para um capitão ou o presidente {nome ? 'liberar seu acesso' : 'cadastrar você'} em Gestão → Elenco.
              </span>
            </div>
            <button className="btn full" onClick={voltar}>Tentar outro número</button>
          </div>
        )}
      </div>
    </main>
  )
}
