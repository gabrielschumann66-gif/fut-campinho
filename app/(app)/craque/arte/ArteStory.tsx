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

/** Dourado da arte: claro → ouro → sombra, com faixa de brilho */
const OURO = 'linear-gradient(135deg, #fff4b8 0%, #e9c862 32%, #8a6410 62%, #f3d570 100%)'

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
  const handle = p.grupo.normalize('NFD').replace(/[^A-Za-z0-9]/g, '').toUpperCase()

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

  const caixas: { icone: React.ReactNode; rotulo: string; valor: string | number; sufixo?: string }[] = [
    { icone: <Estrela size={15} />, rotulo: 'PONTOS', valor: p.pts, sufixo: 'no dia' },
    { icone: <Coroa size={16} cor="currentColor" />, rotulo: 'MVP', valor: `${p.titulos}×`, sufixo: p.titulos === 1 ? 'a primeira' : 'na temporada' },
    { icone: <Barras size={14} />, rotulo: 'MÉDIA', valor: p.media, sufixo: 'pts / rodada' },
  ]

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
            background: 'radial-gradient(70% 42% at 50% 47%, rgba(233,200,98,.30) 0%, rgba(138,100,16,.12) 45%, transparent 75%), linear-gradient(180deg, #0d0b07 0%, #050504 55%, #0a0805 100%)',
            color: '#f5f1e4',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: COND,
            boxSizing: 'border-box',
          }}
        >
          {/* Raios dourados saindo de trás da carta */}
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
            <defs>
              <radialGradient id={`${id}raio`} cx="270" cy="450" r="520" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#f3d570" stopOpacity=".22" />
                <stop offset="1" stopColor="#f3d570" stopOpacity="0" />
              </radialGradient>
              <linearGradient id={`${id}ouro`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff4b8" />
                <stop offset=".3" stopColor="#e9c862" />
                <stop offset=".55" stopColor="#9a7114" />
                <stop offset=".75" stopColor="#f3d570" />
                <stop offset="1" stopColor="#c99a2e" />
              </linearGradient>
              <linearGradient id={`${id}brilho`} x1="0" y1="0" x2="1" y2="0">
                <stop offset=".3" stopColor="#fff" stopOpacity="0" />
                <stop offset=".45" stopColor="#fff" stopOpacity=".7" />
                <stop offset=".55" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g fill={`url(#${id}raio)`}>
              {Array.from({ length: 24 }, (_, i) => {
                const a = (i * Math.PI) / 12
                const b = a + 0.07
                return <path key={i} d={`M270 450 L${(270 + 900 * Math.cos(a)).toFixed(1)} ${(450 + 900 * Math.sin(a)).toFixed(1)} L${(270 + 900 * Math.cos(b)).toFixed(1)} ${(450 + 900 * Math.sin(b)).toFixed(1)} Z`} />
              })}
            </g>
            {/* Título */}
            <text x="270" y="178" textAnchor="middle" fontFamily={COND} fontWeight={900} fontSize="78" textLength="452" lengthAdjust="spacingAndGlyphs" fill="#000" opacity=".5" transform="translate(0 4)">
              MAN OF THE MATCH
            </text>
            <text x="270" y="178" textAnchor="middle" fontFamily={COND} fontWeight={900} fontSize="78" textLength="452" lengthAdjust="spacingAndGlyphs" fill={`url(#${id}ouro)`}>
              MAN OF THE MATCH
            </text>
            <text x="270" y="178" textAnchor="middle" fontFamily={COND} fontWeight={900} fontSize="78" textLength="452" lengthAdjust="spacingAndGlyphs" fill={`url(#${id}brilho)`} opacity=".55">
              MAN OF THE MATCH
            </text>
          </svg>

          {/* Moldura dourada fina em volta da arte toda */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 14,
              borderRadius: 26,
              border: '1.5px solid transparent',
              background: `${OURO} border-box`,
              WebkitMask: 'linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              opacity: 0.7,
            }}
          />

          {/* Topo: escudo + rodada */}
          <div style={{ position: 'absolute', top: 44, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.logo} alt="" width={40} height={40} style={{ objectFit: 'contain' }} crossOrigin="anonymous" />
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                height: 30,
                padding: '0 14px',
                borderRadius: 99,
                border: '1px solid transparent',
                background: `linear-gradient(180deg, #1c170c, #0c0a06) padding-box, ${OURO} border-box`,
                color: '#f3d570',
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: 2.5,
              }}
            >
              <Coroa size={14} cor="#f3d570" />
              CRAQUE DA RODADA {p.rodada} · {ddmm(p.data)}
            </span>
          </div>

          {/* Carta */}
          <div style={{ position: 'absolute', top: 214, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
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

          {/* Uma caixa por número, com ícone */}
          <div style={{ position: 'absolute', left: 36, right: 36, top: 680, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            {caixas.map((c, i) => (
              <div
                key={c.rotulo}
                style={{
                  position: 'relative',
                  borderRadius: 20,
                  padding: '14px 14px 13px',
                  border: '1.5px solid transparent',
                  background:
                    i === 1
                      ? `radial-gradient(120% 90% at 30% 0%, rgba(255,244,184,.30), transparent 60%) padding-box, linear-gradient(180deg, #2a2210 0%, #120e06 100%) padding-box, ${OURO} border-box`
                      : `radial-gradient(120% 90% at 30% 0%, rgba(255,244,184,.12), transparent 60%) padding-box, linear-gradient(180deg, #17140d 0%, #0b0a07 100%) padding-box, linear-gradient(160deg, rgba(255,244,184,.55), rgba(138,100,16,.35) 50%, rgba(243,213,112,.45)) border-box`,
                  boxShadow: `inset 0 1px 0 rgba(255,244,184,.18)${i === 1 ? ', 0 12px 30px -10px rgba(233,200,98,.55)' : ''}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(145deg, #fff4b8, #e9c862 45%, #9a7114)',
                      color: '#2c1f03',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)',
                    }}
                  >
                    {c.icone}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: 2, color: '#e9c862' }}>{c.rotulo}</span>
                </div>
                <span style={{ fontWeight: 900, fontSize: 50, lineHeight: 0.9, color: '#fffaf0' }}>{c.valor}</span>
                <span style={{ fontFamily: "var(--font-body), system-ui, sans-serif", fontSize: 12, fontWeight: 600, color: 'rgba(245,241,228,.55)' }}>{c.sufixo}</span>
              </div>
            ))}
          </div>

          {/* Assinatura do app, estilo Strava */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 46, height: 1, background: 'linear-gradient(90deg, transparent, #e9c862)' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.logo} alt="" width={30} height={30} style={{ objectFit: 'contain' }} crossOrigin="anonymous" />
              <span style={{ fontWeight: 900, fontSize: 24, letterSpacing: 3, color: '#fffaf0' }}>{p.grupo.toUpperCase()}</span>
              <span style={{ width: 46, height: 1, background: 'linear-gradient(90deg, #e9c862, transparent)' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 4, color: 'rgba(233,200,98,.75)' }}>@{handle} · NO APP DO FUT</span>
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
