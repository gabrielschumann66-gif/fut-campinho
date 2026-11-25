'use client'

import { useId, useState } from 'react'
import { type Nivel } from '@/lib/util'
import Avatar from './Avatar'

export type Linha = { k: string; v: string | number }

/** Cores metálicas de cada nível. O ouro é a carta premium (mais volume, raios e moldura dupla). */
const METAL: Record<Nivel, { a: string; b: string; c: string; d?: string; base: string; fg: string; linha: string; premium?: boolean }> = {
  bronze: { a: '#f3c8a2', b: '#cf8a55', c: '#8d532e', base: '#bf7a47', fg: '#371b08', linha: 'rgba(55,27,8,.3)' },
  prata: { a: '#ffffff', b: '#dadada', c: '#a6a6a6', base: '#cdcdcd', fg: '#2a2a2a', linha: 'rgba(0,0,0,.2)' },
  ouro: { a: '#fff7c9', b: '#f3d570', c: '#b8861f', d: '#7a560c', base: '#d9ad3f', fg: '#2c1f03', linha: 'rgba(44,31,3,.3)', premium: true },
}

/** Escudo da carta (coordenadas 260×370) */
const FORMA =
  'M16 34 C44 34 62 24 76 10 C92 4 112 6 130 6 C148 6 168 4 184 10 C198 24 216 34 244 34 L244 286 C244 304 232 312 214 318 C178 330 152 340 130 364 C108 340 82 330 46 318 C28 312 16 304 16 286 Z'
const DENTRO = (s: number) => `translate(130 185) scale(${s}) translate(-130 -185)`

export function Coroa({ size = 18, cor = 'currentColor' }: { size?: number; cor?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={cor} aria-hidden="true">
      <path d="M3 7.5 7.5 11 12 4l4.5 7L21 7.5 19.2 18H4.8Z" />
      <rect x="4.8" y="19.2" width="14.4" height="2.4" rx="1" />
    </svg>
  )
}

export default function Carta({
  nivel,
  ovr,
  posicao,
  nome,
  stats,
  versoTitulo,
  verso,
  largura = 262,
  avatar,
  logo = '/escudo.svg',
  mvp = 0,
  fixa = false,
}: {
  /** Sem botão de virar nem legenda (arte do story) */
  fixa?: boolean
  avatar?: string | null
  logo?: string
  nivel: Nivel
  ovr: number
  posicao: string
  nome: string
  stats: Linha[]
  versoTitulo: string
  verso: React.ReactNode | Linha[]
  largura?: number
  /** Quantas vezes foi craque da rodada: selo com coroa e coroas no pé da carta */
  mvp?: number
}) {
  const [frente, setFrente] = useState(true)
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const t = METAL[nivel]
  const k = largura / 260
  const altura = Math.round(largura * (370 / 260))
  const metade = Math.ceil(stats.length / 2)
  const colunas = [stats.slice(0, metade), stats.slice(metade)]
  const nomeCurto = nome.toUpperCase()

  const linhaStat = (s: Linha) => (
    <div key={s.k} className="stat-l" style={{ gap: 6 * k }}>
      <b style={{ fontSize: 24 * k }}>{s.v}</b>
      <span style={{ fontSize: 19 * k }}>{s.k}</span>
    </div>
  )

  const corpo = (
        <div className={`fut${t.premium ? ' premium' : ''}`} style={{ width: largura, height: altura, color: t.fg }}>
          <svg viewBox="0 0 260 370" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={t.a} />
                <stop offset=".45" stopColor={t.b} />
                <stop offset={t.d ? 0.78 : 1} stopColor={t.c} />
                {t.d && <stop offset="1" stopColor={t.d} />}
              </linearGradient>
              <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2=".6">
                <stop offset=".35" stopColor="#fff" stopOpacity="0" />
                <stop offset=".5" stopColor="#fff" stopOpacity=".35" />
                <stop offset=".62" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <radialGradient id={`${id}r`} cx=".62" cy=".26" r=".55">
                <stop offset="0" stopColor="#fff" stopOpacity=".75" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <clipPath id={`${id}c`}>
                <path d={FORMA} />
              </clipPath>
            </defs>
            <path d={FORMA} fill={`url(#${id}g)`} />
            <g clipPath={`url(#${id}c)`}>
              {t.premium && (
                <>
                  <g opacity=".22" fill="#fff">
                    {Array.from({ length: 14 }, (_, i) => {
                      const a = (i * Math.PI) / 7
                      return (
                        <path
                          key={i}
                          d={`M162 100 L${(162 + 300 * Math.cos(a)).toFixed(1)} ${(100 + 300 * Math.sin(a)).toFixed(1)} L${(162 + 300 * Math.cos(a + 0.1)).toFixed(1)} ${(100 + 300 * Math.sin(a + 0.1)).toFixed(1)} Z`}
                        />
                      )
                    })}
                  </g>
                  <ellipse cx="162" cy="100" rx="120" ry="100" fill={`url(#${id}r)`} />
                  <path d="M0 120 L70 40 L95 60 L20 150Z M210 20 L260 0 L260 60Z" fill="#fff" opacity=".18" />
                </>
              )}
              {frente && <rect x="0" y="172" width="260" height="200" fill={t.base} opacity={t.premium ? 0.75 : 0.55} />}
              {frente && t.premium && <rect x="0" y="172" width="260" height="1.5" fill="#fff6c0" opacity=".9" />}
              <rect x="0" y="0" width="260" height="370" fill={`url(#${id}s)`} />
            </g>
            <path d={FORMA} fill="none" stroke={t.premium ? '#fff4b8' : 'rgba(255,255,255,.55)'} strokeWidth={t.premium ? 4 : 2} />
            {t.premium ? (
              <>
                <path d={FORMA} fill="none" stroke="#8a6410" strokeWidth="1.6" transform={DENTRO(0.955)} />
                <path d={FORMA} fill="none" stroke="#fff3b0" strokeWidth="1" opacity=".8" transform={DENTRO(0.94)} />
              </>
            ) : (
              <path d={FORMA} fill="none" stroke={t.linha} strokeWidth="1.2" transform={DENTRO(0.93)} />
            )}
          </svg>

          {frente ? (
            <div className="ct">
              {/* Overall, posição e escudo */}
              <div className="col" style={{ position: 'absolute', left: 34 * k, top: 44 * k, width: 54 * k, alignItems: 'center' }}>
                <span style={{ fontSize: 50 * k, fontWeight: 800, lineHeight: 0.85 }}>{ovr}</span>
                <span style={{ width: '100%', height: 1, background: t.linha, margin: `${6 * k}px 0` }} />
                <span style={{ fontSize: 18 * k, fontWeight: 700, lineHeight: 1 }}>{posicao}</span>
                <span style={{ width: '100%', height: 1, background: t.linha, margin: `${6 * k}px 0` }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="" width={34 * k} height={34 * k} style={{ objectFit: 'contain' }} />
              </div>

              {/* Foto em círculo */}
              <span
                style={{
                  position: 'absolute', left: 101 * k, top: 38 * k, borderRadius: '50%', display: 'inline-flex',
                  boxShadow: `0 0 0 ${3 * k}px ${t.premium ? '#fff4b8' : 'rgba(255,255,255,.7)'}, 0 0 0 ${4.5 * k}px ${t.linha}, 0 ${8 * k}px ${18 * k}px rgba(0,0,0,.35)`,
                }}
              >
                <Avatar id={avatar} nome={nome} size={122 * k} />
              </span>

              {mvp > 0 && (
                <span className="selo-mvp" style={{ right: 24 * k, top: 134 * k, height: 32 * k, padding: `0 ${12 * k}px 0 ${9 * k}px`, gap: 4 * k, fontSize: 18 * k }}>
                  <Coroa size={19 * k} cor="#fde819" />
                  {mvp}× MVP
                </span>
              )}

              {/* Nome */}
              <div
                className="ellipsis"
                style={{
                  position: 'absolute', left: 28 * k, right: 28 * k, top: 174 * k, textAlign: 'center', paddingBottom: 4 * k,
                  borderBottom: `1px solid ${t.linha}`, fontSize: (nomeCurto.length > 11 ? 24 : nomeCurto.length > 8 ? 28 : 32) * k, fontWeight: 800,
                }}
              >
                {nomeCurto}
              </div>

              {/* Números em duas colunas */}
              <div
                style={{
                  position: 'absolute', left: 48 * k, right: 44 * k, top: 218 * k, display: 'grid',
                  gridTemplateColumns: '1fr 1px 1fr', columnGap: 16 * k,
                }}
              >
                <div className="col" style={{ gap: 2 * k }}>{colunas[0].map(linhaStat)}</div>
                <span style={{ background: t.linha }} />
                <div className="col" style={{ gap: 2 * k }}>{colunas[1].map(linhaStat)}</div>
              </div>

              {/* Pé da carta: uma coroa por MVP (até 3), senão estrela */}
              <div className="row" style={{ position: 'absolute', left: '50%', top: 304 * k, transform: 'translateX(-50%)', gap: 3 * k }}>
                {mvp > 3 ? (
                  <>
                    <Coroa size={22 * k} cor={t.fg} />
                    <b style={{ fontSize: 20 * k }}>×{mvp}</b>
                  </>
                ) : mvp > 0 ? (
                  Array.from({ length: mvp }, (_, i) => <Coroa key={i} size={22 * k} cor={t.fg} />)
                ) : (
                  <svg width={22 * k} height={22 * k} viewBox="0 0 24 24" fill={t.fg} aria-hidden="true">
                    <path d="m12 2 2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.3 5.8 21l1.6-7L2 9.3l7.1-.7Z" />
                  </svg>
                )}
              </div>
            </div>
          ) : (
            <div className="ct col" style={{ padding: `${50 * k}px ${40 * k}px ${70 * k}px`, gap: 10 * k, fontFamily: 'var(--font-body)' }}>
              <span className="cond" style={{ fontSize: 26 * k, textAlign: 'center' }}>{versoTitulo}</span>
              {Array.isArray(verso)
                ? verso.map((h) => (
                    <div key={h.k} className="between" style={{ borderBottom: `1px solid ${t.linha}`, paddingBottom: 6 * k, alignItems: 'baseline' }}>
                      <span style={{ fontSize: 14 * k, fontWeight: 600 }}>{h.k}</span>
                      <span className="cond" style={{ fontSize: 22 * k }}>{h.v}</span>
                    </div>
                  ))
                : verso}
            </div>
          )}
        </div>
  )
  if (fixa) return corpo
  return (
    <div className="col" style={{ alignItems: 'center', gap: 10 }}>
      <button
        className="carta-btn"
        onClick={() => setFrente((f) => !f)}
        aria-label={frente ? 'Virar carta para ver o verso' : 'Virar carta para ver a frente'}
        style={{ width: largura, height: altura }}
      >
        {corpo}
      </button>
      <span className="small mut">Toque na carta para virar</span>
    </div>
  )
}

/** Mini carta (listas): o mesmo escudo da carta, priorizando foto, metal do nível e o overall */
export function MiniCarta({
  nivel,
  ovr,
  rotulo,
  largura = 64,
  avatar,
  nome = '',
}: {
  nivel: Nivel
  ovr: number
  rotulo: string
  largura?: number
  avatar?: string | null
  nome?: string
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const t = METAL[nivel]
  const k = largura / 260
  const altura = Math.round(largura * (370 / 260))
  return (
    <div className={`fut${t.premium ? ' premium' : ''}`} style={{ width: largura, height: altura, color: t.fg }}>
      <svg viewBox="0 0 260 370" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={t.a} />
            <stop offset=".45" stopColor={t.b} />
            <stop offset={t.d ? 0.78 : 1} stopColor={t.c} />
            {t.d && <stop offset="1" stopColor={t.d} />}
          </linearGradient>
          <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2=".6">
            <stop offset=".35" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".4" />
            <stop offset=".62" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${id}c`}>
            <path d={FORMA} />
          </clipPath>
        </defs>
        <path d={FORMA} fill={`url(#${id}g)`} />
        <rect x="0" y="0" width="260" height="370" fill={`url(#${id}s)`} clipPath={`url(#${id}c)`} />
        <path d={FORMA} fill="none" stroke={t.premium ? '#fff4b8' : 'rgba(255,255,255,.6)'} strokeWidth={t.premium ? 8 : 5} />
      </svg>
      <span
        style={{
          position: 'absolute', left: '50%', top: 40 * k, transform: 'translateX(-50%)', borderRadius: '50%', display: 'inline-flex',
          boxShadow: `0 0 0 ${Math.max(1.5, 7 * k)}px ${t.premium ? '#fff4b8' : 'rgba(255,255,255,.75)'}`,
        }}
      >
        <Avatar id={avatar} nome={nome || rotulo} size={150 * k} />
      </span>
      <div className="col" style={{ position: 'absolute', left: 0, right: 0, top: 206 * k, alignItems: 'center', fontFamily: 'var(--cond)' }}>
        <span style={{ fontSize: 92 * k, fontWeight: 900, lineHeight: 0.85 }}>{ovr}</span>
        <span style={{ fontSize: 38 * k, fontWeight: 800, letterSpacing: 0.5, lineHeight: 1.1 }}>{rotulo}</span>
      </div>
    </div>
  )
}
