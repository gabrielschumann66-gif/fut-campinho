'use client'

import { useEffect, useState } from 'react'

type Sistema = 'iphone' | 'android' | 'outro'
type Estado = 'checando' | 'liberado' | 'instalar'

/** Navegadores dentro de outros apps (WhatsApp, Instagram…) não conseguem instalar. */
const NAVEGADOR_INTERNO = /FBAN|FBAV|Instagram|Line\/|WhatsApp|Snapchat|TikTok|musical_ly|; wv\)/i

function detectar() {
  const ua = navigator.userAgent
  const iphone = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const android = /Android/i.test(ua)
  const instalado =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  const sistema: Sistema = iphone ? 'iphone' : android ? 'android' : 'outro'
  return { sistema, instalado, interno: NAVEGADOR_INTERNO.test(ua), safari: iphone && !/CriOS|FxiOS|EdgiOS/i.test(ua) }
}

/**
 * No celular, o onboarding só abre dentro do app instalado na tela de início
 * (é assim que o iPhone libera notificações). No computador segue normal.
 */
export default function ExigirApp({ grupo, children }: { grupo: string; children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>('checando')
  const [info, setInfo] = useState<ReturnType<typeof detectar> | null>(null)
  const [podeInstalar, setPodeInstalar] = useState(false)
  const [instalou, setInstalou] = useState(false)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const d = detectar()
    setInfo(d)
    setEstado(d.instalado || d.sistema === 'outro' ? 'liberado' : 'instalar')
    setPodeInstalar(!!window.__instalar)
    const pronto = () => setPodeInstalar(!!window.__instalar)
    const feito = () => setInstalou(true)
    window.addEventListener('instalar-pronto', pronto)
    window.addEventListener('app-instalado', feito)
    const mq = window.matchMedia('(display-mode: standalone)')
    const mudou = () => mq.matches && setEstado('liberado')
    mq.addEventListener?.('change', mudou)
    return () => {
      window.removeEventListener('instalar-pronto', pronto)
      window.removeEventListener('app-instalado', feito)
      mq.removeEventListener?.('change', mudou)
    }
  }, [])

  async function instalar() {
    const p = window.__instalar
    if (!p) return
    await p.prompt()
    const { outcome } = await p.userChoice
    window.__instalar = null
    setPodeInstalar(false)
    if (outcome === 'accepted') setInstalou(true)
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  if (estado === 'liberado') return <>{children}</>
  if (estado === 'checando' || !info) return <main className="app" aria-busy="true" />

  const passo = (n: number | string, conteudo: React.ReactNode) => (
    <div className="item" style={{ alignItems: 'flex-start', gap: 12, padding: 14 }}>
      <span className="onb-num">{n}</span>
      <span style={{ fontSize: 15, lineHeight: 1.4 }}>{conteudo}</span>
    </div>
  )

  return (
    <main className="app">
      <div className="onb">
        <div className="onb-conteudo">
          <div className="col" style={{ alignItems: 'center', gap: 12, paddingTop: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" width={96} height={96} style={{ borderRadius: 22, boxShadow: '0 0 0 1px #2A2A27' }} />
            <span className="small mut">{grupo} na sua tela de início</span>
          </div>
          <div className="col gap-8">
            <span className="kicker">Antes de começar</span>
            <h1 className="title onb-titulo">{instalou ? 'AGORA ABRA PELO ÍCONE' : 'INSTALE O APP'}</h1>
            <p className="onb-corpo">
              {instalou ? (
                <>
                  O ícone do {grupo} já está na sua tela de início. Feche esta página e abra o app por ele para continuar.
                </>
              ) : (
                <>
                  O {grupo} funciona como um app: fica na tela de início, abre em tela cheia e é por ele que chegam os avisos de rodada, placar e
                  craque. Leva 10 segundos.
                </>
              )}
            </p>
          </div>

          {!instalou && info.interno && (
            <div className="col gap-8">
              {passo(
                1,
                <>
                  Você abriu o link dentro de outro app. Toque nos <b>três pontinhos</b> ou em <b>Compartilhar</b> e escolha{' '}
                  <b>{info.sistema === 'iphone' ? 'Abrir no Safari' : 'Abrir no Chrome'}</b>.
                </>,
              )}
              <button className="btn full" onClick={copiarLink}>
                {copiado ? 'Link copiado: cole no navegador' : 'Copiar o link do app'}
              </button>
            </div>
          )}

          {!instalou && !info.interno && info.sistema === 'iphone' && (
            <div className="col gap-8">
              {!info.safari && passo('!', <>No iPhone, o jeito mais garantido é pelo <b>Safari</b>. Se não aparecer a opção abaixo, abra este link no Safari.</>)}
              {passo(
                1,
                <>
                  Toque em <b>Compartilhar</b> <IconeCompartilhar /> na barra do navegador.
                </>,
              )}
              {passo(2, <>Role a lista e toque em <b>Adicionar à Tela de Início</b>. Depois, em <b>Adicionar</b>.</>)}
              {passo(3, <>Abra o <b>{grupo}</b> pelo ícone novo e entre de novo com o seu celular e PIN.</>)}
            </div>
          )}

          {!instalou && !info.interno && info.sistema === 'android' && (
            <div className="col gap-8">
              {podeInstalar ? (
                <button className="btn yel full" style={{ height: 56, fontSize: 17 }} onClick={instalar}>
                  Instalar o app
                </button>
              ) : (
                <>
                  {passo(1, <>Toque nos <b>três pontinhos ⋮</b> do navegador.</>)}
                  {passo(2, <>Escolha <b>Instalar app</b> (ou <b>Adicionar à tela inicial</b>) e confirme.</>)}
                  {passo(3, <>Abra o <b>{grupo}</b> pelo ícone novo.</>)}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function IconeCompartilhar() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 20" aria-label="ícone de compartilhar" style={{ verticalAlign: -3 }}>
      <path d="M8 1v12M4 5l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 8H2.5A1.5 1.5 0 0 0 1 9.5v8A1.5 1.5 0 0 0 2.5 19h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 13.5 8H11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
