'use client'

import { useState } from 'react'
import { fmt1 } from '@/lib/util'

type Serie = { label: string; v: number[]; media: number; un: string }

/** Barras por rodada (funciona desde a primeira rodada) com a média da temporada tracejada. */
export default function Desempenho({ labels, series }: { labels: string[]; series: Record<'pts' | 'gols' | 'ast', Serie> }) {
  const [k, setK] = useState<keyof typeof series>('pts')
  const s = series[k]
  const W = 324
  const H = 150
  const top = 22
  const max = Math.max(...s.v, s.media, 1) * 1.1
  const y = (v: number) => Math.round(H - (v / max) * (H - top))
  const n = Math.max(labels.length, 1)
  const slot = W / Math.max(n, 4)
  const bw = Math.min(44, slot * 0.6)
  const x0 = (W - slot * n) / 2

  return (
    <div className="card col gap-12">
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div className="col">
          <h2 className="h2">DESEMPENHO</h2>
          <span className="small mut">{labels.length === 1 ? 'Primeira rodada' : `Últimas ${labels.length} rodadas`}</span>
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
          <svg
            viewBox={`0 0 ${W} ${H + 20}`}
            width="100%"
            role="img"
            aria-label={`${s.label} por rodada: ${labels.map((l, i) => `${l} ${s.v[i]}`).join(', ')}`}
            style={{ display: 'block', overflow: 'visible' }}
          >
            <line x1="0" y1={H} x2={W} y2={H} stroke="#2A2A27" />
            {s.v.map((v, i) => {
              const cx = x0 + slot * i + slot / 2
              const ult = i === s.v.length - 1
              return (
                <g key={labels[i]}>
                  <rect x={cx - bw / 2} y={y(v)} width={bw} height={Math.max(H - y(v), v ? 3 : 0)} rx="6" fill={ult ? '#FDE819' : '#6B6A2A'} />
                  <text x={cx} y={y(v) - 6} textAnchor="middle" fontSize="13" fontWeight="700" fill={ult ? '#FDE819' : '#F5F5F0'}>{v}</text>
                  <text x={cx} y={H + 16} textAnchor="middle" fontSize="11" fill={ult ? '#FDE819' : '#A3A39B'} fontWeight={ult ? 700 : 400}>{labels[i]}</text>
                </g>
              )
            })}
            <line x1="0" y1={y(s.media)} x2={W} y2={y(s.media)} stroke="#FD6201" strokeWidth="1.5" strokeDasharray="4 5" />
          </svg>
          <div className="row small mut" style={{ gap: 8 }}>
            <span style={{ width: 16, borderTop: '2px dashed var(--org)' }} />
            Média na temporada
          </div>
        </>
      )}
    </div>
  )
}
