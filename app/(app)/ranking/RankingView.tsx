'use client'

import Link from 'next/link'
import { useState } from 'react'
import { iniciais, primeiroNome, type Stats } from '@/lib/util'

const CORES = ['#FDE819', '#C9CED6', '#D08A4E']

export default function RankingView({
  meuId,
  temporada,
  dia,
  subTemporada,
  subDia,
}: {
  meuId: string
  temporada: Stats[]
  dia: Stats[]
  subTemporada: string
  subDia: string
}) {
  const [aba, setAba] = useState<'T' | 'D'>('T')
  const rows = aba === 'T' ? temporada : dia
  const podio = [
    { r: rows[1], i: 1, h: 78 },
    { r: rows[0], i: 0, h: 104 },
    { r: rows[2], i: 2, h: 62 },
  ]

  return (
    <main className="screen">
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <h1 className="title">RANKING</h1>
        <span className="s13 mut">{aba === 'T' ? subTemporada : subDia}</span>
      </div>

      <div className="seg" role="tablist">
        <button role="tab" aria-selected={aba === 'T'} className={aba === 'T' ? 'on' : ''} onClick={() => setAba('T')}>
          Temporada
        </button>
        <button role="tab" aria-selected={aba === 'D'} className={aba === 'D' ? 'on' : ''} onClick={() => setAba('D')}>
          Última rodada
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="vazio">Ainda não há partidas registradas aqui.</div>
      ) : (
        <>
          <div className="grid-3" style={{ alignItems: 'end' }}>
            {podio.map(({ r, i, h }) =>
              r ? (
                <Link key={i} href={`/perfil?id=${r.jogador_id}`} className="col" style={{ alignItems: 'center', gap: 6, color: 'var(--txt)' }}>
                  <div
                    className="avatar"
                    style={{ width: 56, height: 56, fontSize: 16, border: `3px solid ${CORES[i]}` }}
                  >
                    {iniciais(r.nome)}
                  </div>
                  <span className="bold ellipsis" style={{ fontSize: 14, maxWidth: '100%' }}>{primeiroNome(r.nome)}</span>
                  <div
                    className="col"
                    style={{
                      width: '100%',
                      height: h,
                      borderRadius: '14px 14px 4px 4px',
                      background: 'var(--card)',
                      borderTop: `3px solid ${CORES[i]}`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span className="cond" style={{ fontSize: 30, color: CORES[i] }}>{i + 1}º</span>
                    <span className="small mut">{r.pts} pts</span>
                  </div>
                </Link>
              ) : (
                <div key={i} />
              ),
            )}
          </div>

          <div className="card flat" style={{ padding: '6px 10px', borderRadius: 20 }}>
            <div className="tabela-row head">
              <span>#</span>
              <span>Jogador</span>
              <span>V</span>
              <span>D</span>
              <span>G</span>
              <span>A</span>
              <span>PTS</span>
            </div>
            {rows.map((r, i) => (
              <Link key={r.jogador_id} href={`/perfil?id=${r.jogador_id}`} className={`tabela-row${r.jogador_id === meuId ? ' eu' : ''}`}>
                <span className="bold mut">{i + 1}</span>
                <span className="ellipsis" style={{ fontWeight: 600 }}>{r.nome}</span>
                <span>{r.v}</span>
                <span className="mut">{r.d}</span>
                <span>{r.gols}</span>
                <span>{r.assist}</span>
                <span className="cond yel" style={{ fontSize: 17 }}>{r.pts}</span>
              </Link>
            ))}
          </div>
        </>
      )}
      <span className="small mut center">Vitória 3 · Empate 1 · Gol 2 · Assistência 1</span>
    </main>
  )
}
