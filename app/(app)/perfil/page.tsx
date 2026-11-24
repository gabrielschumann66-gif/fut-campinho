import Link from 'next/link'
import Carta from '@/components/Carta'
import { IconEstrela, IconLivro, IconSeta, IconVoltar } from '@/components/icons'
import { getConfig, getContexto, temporadaAtual } from '@/lib/dados'
import { logoDe } from '@/lib/config'
import {
  fmt1,
  nivelOverall,
  nomeExibicao,
  ordenarRanking,
  primeiroNome,
  overall,
  PONTOS,
  type Perfil,
  type Stats,
} from '@/lib/util'
import Desempenho from './Desempenho'
import EditarPerfil from './EditarPerfil'

type Lance = { chave: string; ordem: number; sigla: string; titulo: string; sub: string; pts: string; bg: string; fg: string }

export default async function PerfilPage({ searchParams }: { searchParams: Promise<{ id?: string; senha?: string }> }) {
  const { id, senha } = await searchParams
  const [{ supabase, perfil: eu }, config] = await Promise.all([getContexto(), getConfig()])
  const logo = logoDe(config)
  const alvoId = id ?? eu.id
  const souEu = alvoId === eu.id
  const temporada = temporadaAtual()

  const [{ data: alvo }, { data: ranking }, { data: porRodada }, { data: titulos }, { count: encerradasTemp }] = await Promise.all([
    souEu ? Promise.resolve({ data: eu }) : supabase.from('profiles').select('*').eq('id', alvoId).maybeSingle(),
    supabase.from('v_ranking_temporada').select('*').eq('temporada', temporada),
    supabase.from('v_stats_rodada').select('*').eq('jogador_id', alvoId).eq('temporada', temporada).order('data'),
    supabase.from('v_craque_rodada').select('numero, data').eq('jogador_id', alvoId).order('data', { ascending: false }),
    supabase.from('rodadas').select('id', { count: 'exact', head: true }).eq('temporada', temporada).eq('status', 'encerrada'),
  ])

  if (!alvo) {
    return (
      <main className="screen">
        <div className="vazio">Jogador não encontrado.</div>
      </main>
    )
  }
  const jogador = alvo as Perfil
  const nome = nomeExibicao(jogador)

  const lista = ordenarRanking((ranking ?? []) as Stats[])
  const pos = lista.findIndex((r) => r.jogador_id === alvoId)
  const st = pos >= 0 ? lista[pos] : null
  const lider = lista[0]

  const rodadas = (porRodada ?? []) as (Stats & { numero: number; rodada_status: string })[]
  const encerradas = rodadas.filter((r) => r.rodada_status === 'encerrada')
  const n = encerradas.length
  const media = n ? encerradas.reduce((s, r) => s + r.pts, 0) / n : 0
  const ovr = overall(media)
  const nivel = nivelOverall(ovr)
  const proxNivel = nivel === 'bronze' ? { nome: 'PRATA', alvo: 75 } : nivel === 'prata' ? { nome: 'OURO', alvo: 83 } : null
  const jogos = st ? st.v + st.e + st.d : 0
  const ultimas = rodadas.slice(-8)

  // Últimos lances
  const [{ data: gols }, { data: participacoes }, { data: defesas }] = await Promise.all([
    supabase
      .from('gols')
      .select('id, partida_id, lado, autor_id, assist_id, autor:profiles!gols_autor_id_fkey(nome, apelido), assist:profiles!gols_assist_id_fkey(nome, apelido), partidas(numero, cor_a, cor_b, rodadas(numero))')
      .or(`autor_id.eq.${alvoId},assist_id.eq.${alvoId}`)
      .order('id', { ascending: false })
      .limit(8),
    supabase.from('partida_jogadores').select('partida_id, lado').eq('jogador_id', alvoId).order('partida_id', { ascending: false }).limit(8),
    supabase.from('defesas').select('id, partida_id, partidas(numero, rodadas(numero))').eq('jogador_id', alvoId).order('id', { ascending: false }).limit(8),
  ])
  const idsPartidas = (participacoes ?? []).map((p) => p.partida_id)
  const { data: placares } = idsPartidas.length
    ? await supabase.from('v_partida_placar').select('*, rodadas(numero)').in('id', idsPartidas).eq('status', 'encerrada')
    : { data: [] as never[] }

  type Nome = { nome: string; apelido: string | null } | null
  const nm = (x: Nome) => (x ? nomeExibicao(x) : '?')
  const lances: Lance[] = []
  for (const g of (gols ?? []) as unknown as {
    id: number
    partida_id: number
    lado: 'A' | 'B'
    autor_id: string
    autor: Nome
    assist: Nome
    partidas: { numero: number; cor_a: string; cor_b: string; rodadas: { numero: number } | null } | null
  }[]) {
    const pt = g.partidas
    const adv = pt ? (g.lado === 'A' ? pt.cor_b : pt.cor_a) : ''
    const ctx = pt ? `R${pt.rodadas?.numero ?? '?'} · Jogo ${pt.numero}` : ''
    if (g.autor_id === alvoId) {
      lances.push({
        chave: `g${g.id}`, ordem: g.partida_id * 10 + 2, sigla: 'GOL', titulo: `Gol contra o ${adv}`,
        sub: `${ctx} · ${g.assist ? `assist. de ${nm(g.assist)}` : 'sem assistência'}`, pts: `+${PONTOS.gol}`, bg: '#FDE819', fg: '#0B0B0A',
      })
    } else {
      lances.push({
        chave: `a${g.id}`, ordem: g.partida_id * 10 + 1, sigla: 'AST', titulo: `Assistência para ${nm(g.autor)}`,
        sub: ctx, pts: `+${PONTOS.assist}`, bg: '#2A2A27', fg: '#FDE819',
      })
    }
  }
  for (const pl of (placares ?? []) as {
    id: number; numero: number; cor_a: string; cor_b: string; gols_a: number; gols_b: number; rodadas: { numero: number } | null
  }[]) {
    const lado = participacoes?.find((p) => p.partida_id === pl.id)?.lado
    const meu = lado === 'A' ? pl.gols_a : pl.gols_b
    const deles = lado === 'A' ? pl.gols_b : pl.gols_a
    const minhaCor = lado === 'A' ? pl.cor_a : pl.cor_b
    const outra = lado === 'A' ? pl.cor_b : pl.cor_a
    const r = meu > deles ? 'V' : meu === deles ? 'E' : 'D'
    lances.push({
      chave: `p${pl.id}`, ordem: pl.id * 10 + 3, sigla: r,
      titulo: `${r === 'V' ? 'Vitória' : r === 'E' ? 'Empate' : 'Derrota'} · ${minhaCor} ${meu} × ${deles} ${outra}`,
      sub: `R${pl.rodadas?.numero ?? '?'} · Jogo ${pl.numero}`,
      pts: r === 'V' ? `+${PONTOS.vitoria}` : r === 'E' ? `+${PONTOS.empate}` : '0',
      bg: r === 'V' ? '#FD6201' : '#2A2A27', fg: r === 'V' ? '#0B0B0A' : r === 'E' ? '#F5F5F0' : '#A3A39B',
    })
  }
  for (const d of (defesas ?? []) as unknown as { id: number; partida_id: number; partidas: { numero: number; rodadas: { numero: number } | null } | null }[]) {
    lances.push({
      chave: `d${d.id}`, ordem: d.partida_id * 10 + 1, sigla: 'DEF', titulo: 'Ação de defesa',
      sub: d.partidas ? `R${d.partidas.rodadas?.numero ?? '?'} · Jogo ${d.partidas.numero}` : '', pts: `+${PONTOS.defesa}`, bg: '#22A355', fg: '#0B0B0A',
    })
  }
  lances.sort((a, b) => b.ordem - a.ordem)

  const presenca = encerradasTemp ? Math.round((n / encerradasTemp) * 100) : 0
  const barras = [
    { k: 'Aproveitamento', v: jogos ? `${Math.round((st!.v / jogos) * 100)}%` : '—', pct: jogos ? (st!.v / jogos) * 100 : 0, cor: 'var(--yel)' },
    { k: 'Gols/rodada', v: n ? fmt1((st?.gols ?? 0) / n) : '—', pct: n ? Math.min(100, ((st?.gols ?? 0) / n / 3) * 100) : 0, cor: 'var(--yel)' },
    { k: 'Assist./rodada', v: n ? fmt1((st?.assist ?? 0) / n) : '—', pct: n ? Math.min(100, ((st?.assist ?? 0) / n / 3) * 100) : 0, cor: 'var(--yel)' },
    { k: 'Presença', v: encerradasTemp ? `${presenca}%` : '—', pct: presenca, cor: 'var(--org)' },
  ]

  return (
    <main className="screen" style={{ gap: 20 }}>
      <div className="between">
        {!souEu ? (
          <Link href="/ranking" className="icon-btn" aria-label="Voltar">
            <IconVoltar />
          </Link>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" width={44} height={44} style={{ objectFit: 'contain' }} />
        )}
        <div className="col" style={{ alignItems: 'center' }}>
          <span className="kicker">{souEu ? 'Meu perfil' : `Temporada ${temporada}`}</span>
          <span className="cond" style={{ fontSize: 20 }}>{souEu ? `Temporada ${temporada}` : `${n} rodadas`}</span>
        </div>
        {souEu ? <EditarPerfil perfil={jogador} abrirSenha={senha === '1'} /> : <span style={{ width: 44 }} />}
      </div>

      <div style={{ position: 'relative' }} className="col">
        <span
          className="nome-fundo"
          aria-hidden="true"
          style={{ fontSize: Math.max(90, Math.min(230, Math.round(560 / Math.max(3, primeiroNome(nome).length)))) }}
        >
          {primeiroNome(nome)}
        </span>
        <Carta
          largura={240}
          avatar={jogador.avatar}
          logo={logo}
          nivel={nivel}
          ovr={ovr}
          posicao={jogador.posicao}
          nome={nome}
          mvp={titulos?.length ?? 0}
          stats={[
            { k: 'GOL', v: st?.gols ?? 0 },
            { k: 'AST', v: st?.assist ?? 0 },
            { k: 'VIT', v: st?.v ?? 0 },
            { k: 'DEF', v: st?.defesas ?? 0 },
            { k: 'PTS', v: st?.pts ?? 0 },
            { k: 'JOG', v: jogos },
          ]}
          versoTitulo={proxNivel ? 'PRÓXIMO NÍVEL' : 'NÍVEL MÁXIMO'}
          verso={
            <>
              <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>
                {proxNivel
                  ? `Faltam ${proxNivel.alvo - ovr} pontos de overall para a carta virar ${proxNivel.nome}.`
                  : 'Carta OURO. Mantenha a média para continuar no topo.'}
              </span>
              <div style={{ height: 10, borderRadius: 5, background: 'rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                <div style={{ height: 10, width: `${proxNivel ? Math.round((ovr / proxNivel.alvo) * 100) : 100}%`, background: 'currentColor', borderRadius: 5 }} />
              </div>
              <div className="between" style={{ borderBottom: '1px solid rgba(0,0,0,.18)', paddingBottom: 6, marginTop: 4 }}><span style={{ fontSize: 13, fontWeight: 600 }}>Bronze</span><b>até 74</b></div>
              <div className="between" style={{ borderBottom: '1px solid rgba(0,0,0,.18)', paddingBottom: 6 }}><span style={{ fontSize: 13, fontWeight: 600 }}>Prata</span><b>75 a 82</b></div>
              <div className="between"><span style={{ fontSize: 13, fontWeight: 600 }}>Ouro</span><b>83+</b></div>
            </>
          }
        />
      </div>

      <div className="grid-2">
        <div className="tile trofeu dest">
          <div className="topo"><span className="lbl">Gols</span><span className="x"><small>×</small>{st?.gols ?? 0}</span></div>
          <span className="rod">{n ? `${fmt1((st?.gols ?? 0) / n)} por rodada` : 'sem rodadas ainda'}</span>
        </div>
        <Link href="/ranking" className="tile trofeu">
          <div className="topo"><span className="lbl">Ranking</span><span className="x org">{pos >= 0 ? `${pos + 1}º` : '—'}</span></div>
          <span className="rod">{lider && st && lider.jogador_id !== alvoId ? `${lider.pts - st.pts} pts do líder` : pos === 0 ? 'líder da temporada' : `${st?.pts ?? 0} pontos`}</span>
        </Link>
        <div className="tile trofeu">
          <div className="topo"><span className="lbl">Assis&shy;tências</span><span className="x"><small>×</small>{st?.assist ?? 0}</span></div>
          <span className="rod">{n ? `${fmt1((st?.assist ?? 0) / n)} por rodada` : 'sem rodadas ainda'}</span>
        </div>
        <div className="tile trofeu">
          <div className="topo"><span className="lbl">Craque da<br />rodada</span><span className="x yel"><small>×</small>{titulos?.length ?? 0}</span></div>
          <span className="rod">{titulos?.[0] ? `último: R${titulos[0].numero}` : 'ainda não'}</span>
        </div>
      </div>

      <div className="card col gap-12">
        <div className="between">
          <div className="col gap-4">
            <span className="kicker">Nível da carta</span>
            <span className="h2" style={{ fontSize: 22 }}>{proxNivel ? `Faltam ${proxNivel.alvo - ovr} para ${proxNivel.nome.toLowerCase()}` : 'Ouro · mantenha a média'}</span>
          </div>
          <span className="cond" style={{ fontSize: 32, fontWeight: 900 }}>{ovr}</span>
        </div>
        <div className="barra listrada" style={{ height: 12 }}>
          <div style={{ width: `${Math.min(100, Math.round(((ovr - 40) / (99 - 40)) * 100))}%` }} />
        </div>
        <div className="between small bold" style={{ color: 'var(--dim)', letterSpacing: 0.5 }}>
          <span className={nivel === 'bronze' ? 'yel' : ''}>BRONZE</span>
          <span className={nivel === 'prata' ? 'yel' : ''}>PRATA 75</span>
          <span className={nivel === 'ouro' ? 'yel' : ''}>OURO 83</span>
        </div>
      </div>

      <div className="card col gap-10">
        <div className="between">
          <h2 className="h2">Na temporada</h2>
          <span className="small mut">{jogos} {jogos === 1 ? 'jogo' : 'jogos'} com time registrado</span>
        </div>
        <div className="grid-4 center">
          {[
            ['Gols', st?.gols ?? 0, 'yel'],
            ['Assist.', st?.assist ?? 0, 'yel'],
            ['Vitórias', st?.v ?? 0, ''],
            ['Derrotas', st?.d ?? 0, 'mut'],
          ].map(([k, v, c]) => (
            <div key={k as string} className="col" style={{ background: 'var(--bg)', borderRadius: 14, padding: '10px 0', border: '1px solid var(--line2)' }}>
              <span className={`cond ${c}`} style={{ fontSize: 30 }}>{v}</span>
              <span className="small mut">{k}</span>
            </div>
          ))}
        </div>
        <span className="small mut">Participação em gols: <b style={{ color: 'var(--txt)' }}>{(st?.gols ?? 0) + (st?.assist ?? 0)}</b> (gols + assistências)</span>
      </div>

      <Desempenho
        labels={ultimas.map((r) => `R${r.numero}`)}
        series={{
          pts: { label: 'Pontos', v: ultimas.map((r) => r.pts), media: n ? media : 0, un: 'pts' },
          gols: { label: 'Gols', v: ultimas.map((r) => r.gols), media: n ? (st?.gols ?? 0) / n : 0, un: 'gols' },
          ast: { label: 'Assist.', v: ultimas.map((r) => r.assist), media: n ? (st?.assist ?? 0) / n : 0, un: 'assist.' },
        }}
      />

      <div className="grid-2">
        {barras.map((b) => (
          <div key={b.k} className="card flat tight col gap-8" style={{ padding: '12px 14px' }}>
            <div className="between">
              <span className="s13 mut">{b.k}</span>
              <span className="bold">{b.v}</span>
            </div>
            <div className="barra fina">
              <div style={{ width: `${b.pct}%`, background: b.cor }} />
            </div>
          </div>
        ))}
      </div>

      <section className="col gap-10">
        <h2 className="h2">Últimos lances</h2>
        {lances.length === 0 && <div className="vazio">Nenhum lance registrado ainda.</div>}
        {lances.slice(0, 6).map((l) => (
          <div key={l.chave} className="item">
            <div
              className="cond"
              style={{ width: 40, height: 40, borderRadius: 12, background: l.bg, color: l.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}
            >
              {l.sigla}
            </div>
            <div className="col flex-1">
              <span className="bold ellipsis" style={{ fontSize: 14 }}>{l.titulo}</span>
              <span className="small mut">{l.sub}</span>
            </div>
            <span className="cond yel" style={{ fontSize: 17 }}>{l.pts}</span>
          </div>
        ))}
      </section>

      {souEu && (
        <div className="col gap-8">
          <Link href="/regras" className="atalho">
            <span className="yel"><IconLivro /></span>
            <span className="flex-1" style={{ fontWeight: 600 }}>Regras do {config.nome_grupo}</span>
            <span className="mut"><IconSeta /></span>
          </Link>
          <Link href="/bem-vindo?rever=1" className="atalho">
            <span className="yel"><IconEstrela /></span>
            <span className="flex-1" style={{ fontWeight: 600 }}>Rever o tour e trocar foto</span>
            <span className="mut"><IconSeta /></span>
          </Link>
        </div>
      )}
    </main>
  )
}
