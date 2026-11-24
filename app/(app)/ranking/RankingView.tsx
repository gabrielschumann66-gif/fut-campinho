'use client'

import Link from 'next/link'
import { useState } from 'react'
import Avatar, { molduraDe } from '@/components/Avatar'
import { primeiroNome, type Stats } from '@/lib/util'

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
    { r: rows[1], i: 1, h: 84 },
    { r: rows[0], i: 0, h: 112 },
    { r: rows[2], i: 2, h: 68 },
  ]

  return (
    <main className="screen">
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <h1 className="title">Ranking</h1>
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
          <div className="podio">
            {podio.map(({ r, i, h }) =>
              r ? (
                <Link key={i} href={`/perfil?id=${r.jogador_id}`} className="p">
                  <span style={{ marginTop: i === 0 ? 22 : 0 }}>
                    <Avatar id={r.avatar} nome={r.nome} size={i === 0 ? 66 : 56} moldura={molduraDe(i)} />
                  </span>
                  <span className="bold ellipsis" style={{ fontSize: 14, maxWidth: '100%', marginTop: 4 }}>{primeiroNome(r.nome)}</span>
                  <div className={`caixa metal-${i + 1}${i === 0 ? ' c1' : ''}`} style={{ height: h }}>
                    <span className="n" style={i === 0 ? { fontSize: 48 } : undefined}>{i + 1}º</span>
                    <span className="pt">{r.pts} PTS</span>
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
                <span className={`bold ${r.jogador_id === meuId ? 'yel' : 'mut'}`}>{i + 1}</span>
                <span className="row" style={{ gap: 8, minWidth: 0 }}>
                  <Avatar id={r.avatar} nome={r.nome} size={26} moldura={molduraDe(i)} />
                  <span className="ellipsis" style={{ fontWeight: 600 }}>{r.nome}</span>
                </span>
                <span>{r.v}</span>
                <span className="mut">{r.d}</span>
                <span>{r.gols}</span>
                <span>{r.assist}</span>
                <span className="cond yel" style={{ fontSize: 18 }}>{r.pts}</span>
              </Link>
            ))}
          </div>
        </>
      )}
      <span className="small mut center">Vitória 3 · Empate 1 · Gol 2 · Assistência 1</span>
    </main>
  )
}
