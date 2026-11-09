'use client'

import { useState } from 'react'
import { fmt1 } from '@/lib/util'

type Serie = { label: string; v: number[]; media: number; un: string }

export default function Desempenho({ labels, series }: { labels: string[]; series: Record<'pts' | 'gols' | 'ast', Serie> }) {
  const [k, setK] = useState<keyof typeof series>('pts')
  const s = series[k]
  const W = 324
  const H = 140
  const top = 10
  const max = Math.max(...s.v, s.media, 1) * 1.15
  const y = (v: number) => Math.round(H - (v / max) * (H - top))
  const pts = s.v.map((v, i) => [s.v.length > 1 ? Math.round(i * (W / (s.v.length - 1))) : W / 2, y(v)] as const)
  const linha = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ')
  const ult = pts[pts.length - 1]

  return (
    <div className="card col gap-12">
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div className="col">
          <h2 className="h2">DESEMPENHO</h2>
          <span className="small mut">Últimas {labels.length} rodadas</span>
        </div>
        <div className="col" style={{ alignItems: 'flex-end' }}>
          <span className="cond yel" style={{ fontSize: 26 }}>{fmt1(s.media)} {s.un}</span>
          <span className="small mut">média por rodada</span>
        </div>
      </div>
      <div className="seg" style={{ background: 'var(--bg)' }}>
        {(Object.keys(series) as (keyof typeof series)[]).map((key) => (
          <button key={key} className={k === key ? 'on' : ''} onClick={() => setK(key)} style={{ height: 36, fontSize: 13 }} aria-pressed={k === key}>
            {series[key].label}
          </button>
        ))}
      </div>
      {labels.length === 0 ? (
        <div className="vazio">Jogue uma rodada para ver o gráfico.</div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} 150`} width="100%" role="img" aria-label={`Gráfico de ${s.label} nas últimas ${labels.length} rodadas`} style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FDE819" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#FDE819" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" y1={H} x2={W} y2={H} stroke="#2A2A27" />
            <line x1="0" y1={y(s.media)} x2={W} y2={y(s.media)} stroke="#FD6201" strokeWidth="1.5" strokeDasharray="4 5" />
            {pts.length > 1 && <path d={`${linha} L${W} ${H} L0 ${H} Z`} fill="url(#area)" />}
            <path d={linha} fill="none" stroke="#FDE819" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {ult && <circle cx={ult[0]} cy={ult[1]} r="6" fill="#0B0B0A" stroke="#FDE819" strokeWidth="3" />}
          </svg>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))`, fontSize: 11, textAlign: 'center', marginTop: -6 }} className="mut">
            {labels.map((l, i) => (
              <span key={l} style={i === labels.length - 1 ? { color: 'var(--yel)', fontWeight: 700 } : undefined}>{l}</span>
            ))}
          </div>
          <div className="row small mut" style={{ gap: 8 }}>
            <span style={{ width: 16, borderTop: '2px dashed var(--org)' }} />
            Média na temporada
          </div>
        </>
      )}
    </div>
  )
}
