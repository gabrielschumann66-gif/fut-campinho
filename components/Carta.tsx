'use client'

import { useState } from 'react'
import { TIER, iniciais, type Nivel } from '@/lib/util'
import Avatar from './Avatar'

export type Linha = { k: string; v: string | number }

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
}: {
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
}) {
  const [frente, setFrente] = useState(true)
  const t = TIER[nivel]
  const k = largura / 262
  const altura = Math.round(largura * 1.42)

  return (
    <div className="col" style={{ alignItems: 'center', gap: 10 }}>
      <button
        className="carta-btn"
        onClick={() => setFrente((f) => !f)}
        aria-label={frente ? 'Virar carta para ver o verso' : 'Virar carta para ver a frente'}
        style={{ width: largura, height: altura, color: t.fg }}
      >
        <div
          className="carta"
          style={{ width: largura, height: altura, background: t.bg, padding: `${30 * k}px ${26 * k}px ${40 * k}px` }}
        >
          {frente ? (
            <div className="col" style={{ height: '100%' }}>
              <div className="between" style={{ alignItems: 'flex-start' }}>
                <div className="col" style={{ lineHeight: 0.9 }}>
                  <span className="cond" style={{ fontSize: 58 * k }}>{ovr}</span>
                  <span className="cond" style={{ fontSize: 20 * k, fontWeight: 700 }}>{posicao}</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="" width={56 * k} height={56 * k} style={{ objectFit: 'contain', marginTop: 6 }} />
              </div>
              {avatar ? (
                <span style={{ alignSelf: 'center', marginTop: -6 * k, display: 'inline-flex' }}>
                  <Avatar id={avatar} nome={nome} size={112 * k} />
                </span>
              ) : (
                <div className="carta-foto" style={{ width: 112 * k, height: 112 * k, fontSize: 40 * k, marginTop: -6 * k }}>
                  {iniciais(nome)}
                </div>
              )}
              <span className="cond ellipsis" style={{ alignSelf: 'center', fontSize: 30 * k, marginTop: 8 * k, maxWidth: '100%' }}>
                {nome.toUpperCase()}
              </span>
              <div style={{ height: 1, background: 'currentColor', opacity: 0.3, margin: `${6 * k}px 0 ${8 * k}px` }} />
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`, textAlign: 'center' }}>
                {stats.map((s) => (
                  <div key={s.k} className="col">
                    <span style={{ fontSize: 11 * k, fontWeight: 700 }}>{s.k}</span>
                    <span className="cond" style={{ fontSize: 24 * k, lineHeight: 1.1 }}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="col" style={{ height: '100%', gap: 10 * k }}>
              <span className="cond" style={{ fontSize: 26 * k }}>{versoTitulo}</span>
              {Array.isArray(verso)
                ? verso.map((h) => (
                    <div key={h.k} className="linha-verso">
                      <span style={{ fontSize: 14 * k, fontWeight: 600 }}>{h.k}</span>
                      <span className="cond" style={{ fontSize: 22 * k }}>{h.v}</span>
                    </div>
                  ))
                : verso}
            </div>
          )}
        </div>
      </button>
      <span className="small mut">Toque na carta para virar</span>
    </div>
  )
}
