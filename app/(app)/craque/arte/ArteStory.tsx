'use client'

import { toPng } from 'html-to-image'
import { useEffect, useRef, useState } from 'react'
import { IconUpload } from '@/components/icons'
import { TIER, ddmm, iniciais, type Nivel } from '@/lib/util'

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
}

const W = 540
const H = 960
const COND = "var(--font-cond), 'Barlow Condensed', sans-serif"

export default function ArteStory(p: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const arte = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(0.6)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const t = TIER[p.nivel]

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
            background: '#FD6201',
            color: '#0B0B0A',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '48px 40px 40px',
            boxSizing: 'border-box',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: -120,
              top: 230,
              width: 780,
              height: 420,
              background: 'repeating-linear-gradient(-60deg, rgba(11,11,10,0.10) 0 18px, transparent 18px 46px)',
            }}
          />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/escudo.svg" alt="" width={84} height={70} style={{ objectFit: 'contain' }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{ fontFamily: COND, fontWeight: 800, fontSize: 20, letterSpacing: 3 }}>
                RODADA {p.rodada} · {ddmm(p.data)}
              </span>
              <span style={{ fontFamily: COND, fontWeight: 800, fontSize: 44 }}>MAN OF THE MATCH</span>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              marginTop: 40,
              width: 300,
              height: 426,
              boxSizing: 'border-box',
              background: t.bg,
              clipPath: 'polygon(14% 0, 86% 0, 100% 9%, 100% 88%, 50% 100%, 0 88%, 0 9%)',
              padding: '34px 30px 46px',
              display: 'flex',
              flexDirection: 'column',
              color: t.fg,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 0.9 }}>
                <span style={{ fontFamily: COND, fontWeight: 800, fontSize: 68 }}>{p.ovr}</span>
                <span style={{ fontFamily: COND, fontWeight: 700, fontSize: 22 }}>{p.posicao}</span>
              </div>
              <span
                style={{
                  fontFamily: COND,
                  fontWeight: 800,
                  fontSize: 18,
                  background: '#0B0B0A',
                  color: '#FDE819',
                  padding: '4px 10px',
                  height: 22,
                  borderRadius: 6,
                }}
              >
                {t.label.toUpperCase()}
              </span>
            </div>
            <div
              style={{
                alignSelf: 'center',
                width: 128,
                height: 128,
                borderRadius: 64,
                background: 'rgba(0,0,0,0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: COND,
                fontWeight: 800,
                fontSize: 46,
              }}
            >
              {iniciais(p.nome)}
            </div>
            <span style={{ alignSelf: 'center', fontFamily: COND, fontWeight: 800, fontSize: 36, marginTop: 10, whiteSpace: 'nowrap' }}>
              {p.nome.toUpperCase()}
            </span>
            <div style={{ height: 1, background: 'currentColor', opacity: 0.3, margin: '6px 0 10px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', textAlign: 'center' }}>
              {[
                ['VIT', p.v],
                ['GOL', p.gols],
                ['AST', p.assist],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{k}</span>
                  <span style={{ fontFamily: COND, fontWeight: 800, fontSize: 28 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              marginTop: 'auto',
              width: '100%',
              background: '#0B0B0A',
              color: '#F5F5F0',
              borderRadius: 24,
              padding: 20,
              boxSizing: 'border-box',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 8,
              textAlign: 'center',
            }}
          >
            {[
              [p.pts, 'pontos no dia'],
              [`${p.titulos}×`, 'craque da rodada'],
              [p.media, 'média de pts'],
            ].map(([v, k], i) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  borderLeft: i === 1 ? '1px solid #2A2A27' : undefined,
                  borderRight: i === 1 ? '1px solid #2A2A27' : undefined,
                }}
              >
                <span style={{ fontFamily: COND, fontWeight: 800, fontSize: 44, color: '#FDE819', lineHeight: 1 }}>{v}</span>
                <span style={{ fontSize: 13, color: '#C8C8C0' }}>{k}</span>
              </div>
            ))}
          </div>
          <span style={{ position: 'relative', marginTop: 16, fontFamily: COND, fontWeight: 700, fontSize: 18, letterSpacing: 4 }}>
            @FUTCAMPINHO
          </span>
        </div>
      </div>

      <button className="btn org full" onClick={gerar} disabled={gerando} style={{ height: 50 }}>
        <IconUpload />
        {gerando ? 'Gerando imagem…' : 'Baixar / compartilhar imagem'}
      </button>
      {erro && <span className="erro">{erro}</span>}
    </div>
  )
}
