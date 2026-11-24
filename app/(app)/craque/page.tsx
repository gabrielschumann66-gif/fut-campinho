import Link from 'next/link'
import Carta from '@/components/Carta'
import { IconUpload } from '@/components/icons'
import { carregarCraque } from '@/lib/craque'
import { getConfig, getContexto } from '@/lib/dados'
import { logoDe } from '@/lib/config'
import { FAIXA_RODADA, TIER, ddmm } from '@/lib/util'

const REGRA = {
  bronze: `Bronze: até ${FAIXA_RODADA.prata - 1} pts
na rodada`,
  prata: `Prata: de ${FAIXA_RODADA.prata} a ${FAIXA_RODADA.ouro - 1} pts
na rodada`,
  ouro: `Ouro: ${FAIXA_RODADA.ouro} pts ou mais
na rodada`,
}

export default async function Craque({ searchParams }: { searchParams: Promise<{ rodada?: string }> }) {
  const { rodada } = await searchParams
  const [{ supabase }, config] = await Promise.all([getContexto(), getConfig()])
  const dados = await carregarCraque(supabase, rodada ? Number(rodada) : undefined)

  if (!dados) {
    return (
      <main className="screen">
        <div className="col" style={{ alignItems: 'center', gap: 2 }}>
          <span className="kicker">Man of the Match</span>
          <h1 className="title" style={{ fontSize: 32 }}>CRAQUE DA RODADA</h1>
        </div>
        <div className="vazio">O craque aparece quando a primeira rodada for encerrada.</div>
      </main>
    )
  }

  const { craque, nivel } = dados
  return (
    <main className="screen" style={{ alignItems: 'center' }}>
      <div className="col" style={{ alignItems: 'center', gap: 2 }}>
        <span className="kicker">Man of the Match · Rodada {craque.numero} · {ddmm(craque.data)}</span>
        <h1 className="title" style={{ fontSize: 32 }}>CRAQUE DA RODADA</h1>
      </div>

      <Carta
        avatar={craque.avatar}
        logo={logoDe(config)}
        nivel={nivel}
        ovr={dados.ovr}
        posicao={dados.posicao}
        nome={craque.nome}
        stats={[
          { k: 'VIT', v: craque.v },
          { k: 'GOL', v: craque.gols },
          { k: 'AST', v: craque.assist },
          { k: 'MVP', v: dados.titulos },
        ]}
        versoTitulo="HISTÓRICO"
        verso={[
          { k: 'Títulos de craque', v: dados.titulos },
          { k: 'Média de pts/rodada', v: dados.mediaFmt },
          { k: 'Melhor rodada', v: `${dados.melhor} pts` },
          { k: 'Rodadas jogadas', v: dados.rodadasJogadas },
          { k: 'Overall', v: dados.ovr },
        ]}
      />

      <div className="card tight between" style={{ width: '100%', padding: '12px 14px' }}>
        <div className="col">
          <span className="small mut">Pontos na rodada · {TIER[nivel].label}</span>
          <span className="cond" style={{ fontSize: 24 }}>{craque.pts} pts</span>
        </div>
        <span className="small mut" style={{ textAlign: 'right', whiteSpace: 'pre-line' }}>{REGRA[nivel]}</span>
      </div>

      <Link href={`/craque/arte?rodada=${craque.rodada_id}`} className="btn org full" style={{ height: 50 }}>
        <IconUpload />
        Gerar arte para o Story
      </Link>

      {dados.outrasRodadas.length > 1 && (
        <div className="col gap-8" style={{ width: '100%' }}>
          <h2 className="h2">OUTRAS RODADAS</h2>
          <div className="chips">
            {dados.outrasRodadas.map((r) => (
              <Link
                key={r.rodada_id}
                href={`/craque?rodada=${r.rodada_id}`}
                className={`chip${r.rodada_id === craque.rodada_id ? ' on' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center' }}
              >
                R{r.numero} · {ddmm(r.data)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
