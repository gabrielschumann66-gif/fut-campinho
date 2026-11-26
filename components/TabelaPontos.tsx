import { FAIXA_RODADA, PONTOS, TIER } from '@/lib/util'

export const LANCES_PONTOS: [number, string, string][] = [
  [PONTOS.gol, 'Gol', 'quem marcou'],
  [PONTOS.assist, 'Assist.', 'o último passe'],
  [PONTOS.vitoria, 'Vitória', 'todo o time'],
  [PONTOS.empate, 'Empate', 'todo o time'],
  [PONTOS.defesa, 'Defesa', 'desarme, corte ou defesa do goleiro'],
]

export const DESCONTOS: [number, string, string][] = [
  [PONTOS.sebo, 'Ação de sebo', 'simulação ou malandragem'],
  [PONTOS.mao, 'Mão proposital', 'e 2 minutos fora'],
]

/** Quadro "como você pontua" + faixas do craque. Usado em Regras e nos onboardings. */
export default function TabelaPontos({ faixas = true, fundo = 'var(--bg)' }: { faixas?: boolean; fundo?: string }) {
  return (
    <div className="col gap-10">
      <div className="pontos-grade">
        {LANCES_PONTOS.map(([v, k, sub]) => (
          <div key={k} className="col" style={{ background: fundo, borderRadius: 14, padding: '10px 4px', alignItems: 'center', gap: 2 }}>
            <span className="cond yel" style={{ fontSize: 28, lineHeight: 1 }}>+{v}</span>
            <span className="s13 bold">{k}</span>
            <span className="small mut center" style={{ lineHeight: 1.2 }}>{sub}</span>
          </div>
        ))}
      </div>
      <div className="grid-2" style={{ gap: 6 }}>
        {DESCONTOS.map(([v, k, sub]) => (
          <div key={k} className="row" style={{ background: fundo, borderRadius: 14, padding: '10px 12px', gap: 10, boxShadow: 'inset 0 0 0 1px #4a1c1c' }}>
            <span className="cond" style={{ fontSize: 28, lineHeight: 1, color: 'var(--neg)' }}>−{Math.abs(v)}</span>
            <span className="col" style={{ gap: 1 }}>
              <span className="s13 bold">{k}</span>
              <span className="small mut" style={{ lineHeight: 1.2 }}>{sub}</span>
            </span>
          </div>
        ))}
      </div>
      {faixas && (
        <div className="row" style={{ gap: 6 }}>
          {(
            [
              ['bronze', `Bronze · até ${FAIXA_RODADA.prata - 1}`],
              ['prata', `Prata · ${FAIXA_RODADA.prata}–${FAIXA_RODADA.ouro - 1}`],
              ['ouro', `Ouro · ${FAIXA_RODADA.ouro}+`],
            ] as const
          ).map(([n, t]) => (
            <div
              key={n}
              style={{ flex: 1, height: 34, borderRadius: 10, background: TIER[n].bg, color: TIER[n].fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}
            >
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
