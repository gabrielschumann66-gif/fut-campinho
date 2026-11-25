'use client'

import { toPng } from 'html-to-image'
import { useEffect, useId, useRef, useState } from 'react'
import { IconUpload } from '@/components/icons'
import Carta, { Coroa } from '@/components/Carta'
import { ddmm, type Nivel } from '@/lib/util'

type Props = {
  rodada: number
  data: string
  nome: string
  posicao: string
  nivel: Nivel
  ovr: number
  v: number
  gols: number
  assist: number
  pts: number
  titulos: number
  media: string
  avatar: string | null
  logo: string
  grupo: string
}

const W = 540
const H = 960
const COND = "var(--font-cond), 'Barlow Condensed', sans-serif"


function Estrela({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 2 2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.3 5.8 21l1.6-7L2 9.3l7.1-.7Z" />
    </svg>
  )
}
function Barras({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="3" y="12" width="4.5" height="9" rx="1.2" />
      <rect x="9.75" y="7" width="4.5" height="14" rx="1.2" />
      <rect x="16.5" y="3" width="4.5" height="18" rx="1.2" />
    </svg>
  )
}

export default function ArteStory(p: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const arte = useRef<HTMLDivElement>(null)
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [escala, setEscala] = useState(0.6)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => setEscala(Math.min(1, el.clientWidth / W)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  async function gerar() {
    if (!arte.current) return
    setGerando(true)
    setErro(null)
    try {
      const url = await toPng(arte.current, { width: W, height: H, pixelRatio: 2, style: { transform: 'none' } })
      const blob = await (await fetch(url)).blob()
      const arquivo = new File([blob], `craque-rodada-${p.rodada}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: `Craque da rodada ${p.rodada}` })
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = arquivo.name
        a.click()
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setErro('Não foi possível gerar a imagem. Tente de novo.')
    } finally {
      setGerando(false)
    }
  }

  const caixas: { icone: React.ReactNode; rotulo: string; valor: string | number; ouro?: boolean }[] = [
    { icone: <Estrela size={14} />, rotulo: 'PONTOS NO DIA', valor: p.pts },
    { icone: <Coroa size={15} cor="currentColor" />, rotulo: 'VEZES CRAQUE', valor: `${p.titulos}×`, ouro: true },
    { icone: <Barras size={13} />, rotulo: 'MÉDIA / RODADA', valor: p.media },
  ]
  const LINHA = 'rgba(245,241,228,.11)'

  return (
    <div className="col gap-12">
      <div ref={wrap} style={{ width: '100%', height: H * escala, overflow: 'hidden', borderRadius: 18 }}>
        <div
          ref={arte}
          style={{
            width: W,
            height: H,
            transform: `scale(${escala})`,
            transformOrigin: 'top left',
            background: 'radial-gradient(60% 34% at 50% 45%, rgba(233,200,98,.16) 0%, transparent 70%), #070706',
            color: '#f5f1e4',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: COND,
            boxSizing: 'border-box',
          }}
        >
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
            <defs>
              <radialGradient id={`${id}raio`} cx="270" cy="430" r="480" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#f3d570" stopOpacity=".09" />
                <stop offset="1" stopColor="#f3d570" stopOpacity="0" />
              </radialGradient>
              <linearGradient id={`${id}ouro`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff1b0" />
                <stop offset=".55" stopColor="#e2bd55" />
                <stop offset="1" stopColor="#a87d1c" />
              </linearGradient>
            </defs>

            {/* Raios discretos atrás da carta */}
            <g fill={`url(#${id}raio)`}>
              {Array.from({ length: 16 }, (_, i) => {
                const a = (i * Math.PI) / 8
                const b = a + 0.08
                return <path key={i} d={`M270 430 L${(270 + 900 * Math.cos(a)).toFixed(1)} ${(430 + 900 * Math.sin(a)).toFixed(1)} L${(270 + 900 * Math.cos(b)).toFixed(1)} ${(430 + 900 * Math.sin(b)).toFixed(1)} Z`} />
              })}
            </g>

            {/* Quadra vista de cima: as linhas também fazem a moldura da arte */}
            <g fill="none" stroke={LINHA} strokeWidth="1.5">
              <rect x="28" y="28" width="484" height="904" rx="3" />
              <line x1="28" y1="430" x2="512" y2="430" />
              <circle cx="270" cy="430" r="118" />
              <rect x="130" y="28" width="280" height="122" />
              <rect x="200" y="28" width="140" height="46" />
              <path d="M222 150 A60 60 0 0 0 318 150" />
              <rect x="130" y="810" width="280" height="122" />
              <rect x="200" y="886" width="140" height="46" />
              <path d="M222 810 A60 60 0 0 1 318 810" />
              <path d="M28 42 A14 14 0 0 0 42 28 M498 28 A14 14 0 0 0 512 42 M512 918 A14 14 0 0 0 498 932 M42 932 A14 14 0 0 0 28 918" />
            </g>
            <g fill={LINHA}>
              <circle cx="270" cy="430" r="3.5" />
              <circle cx="270" cy="114" r="3" />
              <circle cx="270" cy="846" r="3" />
            </g>

            {/* Título */}
            <text x="270" y="190" textAnchor="middle" fontFamily={COND} fontWeight={900} fontSize="76" textLength="430" lengthAdjust="spacingAndGlyphs" fill={`url(#${id}ouro)`}>
              MAN OF THE MATCH
            </text>
          </svg>

          {/* Topo: escudo + rodada */}
          <div style={{ position: 'absolute', top: 58, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.logo} alt="" width={34} height={34} style={{ objectFit: 'contain' }} crossOrigin="anonymous" />
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: 2, color: 'rgba(245,241,228,.7)' }}>
              RODADA {p.rodada} · {ddmm(p.data)}
            </span>
          </div>

          {/* Carta */}
          <div style={{ position: 'absolute', top: 226, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
            <Carta
              fixa
              nivel={p.nivel}
              ovr={p.ovr}
              posicao={p.posicao}
              nome={p.nome}
              avatar={p.avatar}
              logo={p.logo}
              mvp={p.titulos}
              largura={286}
              stats={[
                { k: 'GOL', v: p.gols },
                { k: 'AST', v: p.assist },
                { k: 'VIT', v: p.v },
                { k: 'PTS', v: p.pts },
              ]}
              versoTitulo=""
              verso={[]}
            />
          </div>

          {/* Uma caixa por número */}
          <div style={{ position: 'absolute', left: 44, right: 44, top: 688, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {caixas.map((c) => (
              <div
                key={c.rotulo}
                style={{
                  borderRadius: 16,
                  padding: '13px 12px 12px',
                  background: 'linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02))',
                  border: '1px solid rgba(245,241,228,.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e2bd55' }}>
                  {c.icone}
                  <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.8, color: 'rgba(245,241,228,.6)' }}>{c.rotulo}</span>
                </div>
                <span style={{ fontWeight: 900, fontSize: 46, lineHeight: 0.9, color: c.ouro ? '#f0cf6a' : '#fffaf0' }}>{c.valor}</span>
              </div>
            ))}
          </div>

          {/* Assinatura */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 58, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.logo} alt="" width={26} height={26} style={{ objectFit: 'contain' }} crossOrigin="anonymous" />
            <span style={{ fontWeight: 800, fontSize: 19, letterSpacing: 1.5, color: '#fffaf0' }}>{p.grupo.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <button className="btn yel seta full" onClick={gerar} disabled={gerando}>
        {gerando ? 'Gerando imagem…' : 'Baixar / compartilhar'}
        <span className="bola" aria-hidden="true">
          <IconUpload size={18} />
        </span>
      </button>
      {erro && <span className="erro">{erro}</span>}
    </div>
  )
}
