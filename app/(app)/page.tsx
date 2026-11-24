import Link from 'next/link'
import Avatar from '@/components/Avatar'
import ConfirmarPresenca from '@/components/ConfirmarPresenca'
import { logoDe } from '@/lib/config'
import { IconCaixa, IconEngrenagem, IconLivro, IconMais, IconSeta, IconUsuarios } from '@/components/icons'
import { getConfig, getContexto, temporadaAtual } from '@/lib/dados'
import {
  PAPEL_LABEL,
  TIER,
  ddmm,
  diaSemana,
  hhmm,
  isAdmin,
  isFinanceiro,
  nivelOverall,
  nivelRodada,
  nomeExibicao,
  ordenarRanking,
  overall,
  primeiroNome,
  type Stats,
} from '@/lib/util'

const CORES_PODIO = ['#FDE819', '#C9CED6', '#D08A4E']

export default async function Inicio() {
  const [{ supabase, perfil }, config] = await Promise.all([getContexto(), getConfig()])
  const temporada = temporadaAtual()

  // Agenda a rodada da semana e começa no horário (fim continua manual)
  await supabase.rpc('garantir_rodada')

  const [{ data: proxima }, { data: craque }, { data: ranking }] = await Promise.all([
    supabase
      .from('rodadas')
      .select('*, presencas(jogador_id)')
      .in('status', ['agendada', 'em_andamento'])
      .order('data', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from('v_craque_rodada').select('*').order('data', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('v_ranking_temporada').select('*').eq('temporada', temporada),
  ])

  const pres = (proxima?.presencas ?? []) as { jogador_id: string }[]
  const confirmados = pres.length
  const euConfirmado = pres.some((p) => p.jogador_id === perfil.id)

  const lista = ordenarRanking((ranking ?? []) as Stats[])
  const minhaPos = lista.findIndex((r) => r.jogador_id === perfil.id)
  const eu = minhaPos >= 0 ? lista[minhaPos] : null
  const meuOvr = overall(eu && eu.rodadas ? eu.pts / eu.rodadas : 0)
  const meuNivel = nivelOverall(meuOvr)
  const nivel = craque ? nivelRodada(craque.pts) : null

  return (
    <main className="screen">
      <header className="between">
        <div className="row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoDe(config)} alt={`Escudo do ${config.nome_grupo}`} width={56} height={56} style={{ objectFit: 'contain' }} />
          <div className="col">
            <span className="cond" style={{ fontSize: 22, letterSpacing: 0.5 }}>{config.nome_grupo.toUpperCase()}</span>
            <span className="s13 mut">
              Fala, {primeiroNome(nomeExibicao(perfil))} · {PAPEL_LABEL[perfil.papel]}
            </span>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {isAdmin(perfil.papel) && (
            <Link href="/admin" className="icon-btn" aria-label="Gestão do grupo">
              <IconEngrenagem />
            </Link>
          )}
          <Link href="/perfil" aria-label="Meu perfil" style={{ display: 'inline-flex' }}>
            <Avatar id={perfil.avatar} nome={nomeExibicao(perfil)} size={46} borda="var(--yel)" />
          </Link>
        </div>
      </header>

      <section style={{ background: 'var(--yel)', color: 'var(--bg)', borderRadius: 24, padding: 18 }} className="col gap-12">
        {proxima ? (
          <>
            <div className="between">
              <span className="s13 bold" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                {proxima.status === 'em_andamento' ? 'Rodada em andamento' : 'Próxima rodada'}
              </span>
              <span className="small bold" style={{ background: 'var(--bg)', color: 'var(--yel)', padding: '4px 10px', borderRadius: 99 }}>
                Rodada {proxima.numero}
              </span>
            </div>
            <div className="between" style={{ alignItems: 'flex-end' }}>
              <div className="col">
                <span className="cond" style={{ fontSize: 44, lineHeight: 0.95 }}>
                  {diaSemana(proxima.data)} · {ddmm(proxima.data)}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  {hhmm(proxima.horario)} · {proxima.local}
                </span>
              </div>
              <div className="col" style={{ alignItems: 'flex-end' }}>
                <span className="cond" style={{ fontSize: 32 }}>
                  {confirmados}/{config.vagas}
                </span>
                <span className="small" style={{ fontWeight: 600 }}>confirmados</span>
              </div>
            </div>
            <ConfirmarPresenca
              rodadaId={proxima.id}
              jogadorId={perfil.id}
              confirmado={euConfirmado}
              lotado={confirmados >= config.vagas}
            />
          </>
        ) : (
          <div className="col gap-8">
            <span className="s13 bold" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>Próxima rodada</span>
            <span className="cond" style={{ fontSize: 32 }}>NENHUMA AGENDADA</span>
            {isAdmin(perfil.papel) && (
              <Link href="/partida" className="btn dark full">Começar rodada</Link>
            )}
          </div>
        )}
      </section>

      {proxima?.status === 'em_andamento' && (
        <Link href="/partida" className="atalho" style={{ borderColor: 'var(--org)' }}>
          <span className="ao-vivo-dot" />
          <span className="flex-1 bold">Rodada rolando: ver jogos e placar ao vivo</span>
          <span className="org"><IconSeta /></span>
        </Link>
      )}

      {isAdmin(perfil.papel) && (
        <section className="col gap-8">
          <h2 className="h2">{perfil.papel === 'presidente' ? 'PRESIDÊNCIA' : 'CAPITÃO'}</h2>
          <div className="grid-3">
            <Link href="/partida/nova" className="acao-card destaque">
              <IconMais size={26} />
              <span>Registrar jogo</span>
            </Link>
            <Link href="/admin?aba=elenco" className="acao-card">
              <span className="yel"><IconUsuarios size={26} /></span>
              <span>Jogadores</span>
            </Link>
            <Link href={perfil.papel === 'presidente' ? '/configurar' : '/admin?aba=config'} className="acao-card">
              <span className="yel"><IconEngrenagem size={26} /></span>
              <span>{perfil.papel === 'presidente' ? 'Grupo' : 'Regras e agenda'}</span>
            </Link>
          </div>
        </section>
      )}
      {isFinanceiro(perfil.papel) && (
        <Link href="/caixa" className="atalho" style={{ borderColor: 'var(--yel-line)' }}>
          <span className="yel"><IconCaixa size={22} /></span>
          <span className="flex-1 bold">Marcar mensalidades do mês</span>
          <span className="yel"><IconSeta /></span>
        </Link>
      )}

      {craque && nivel && (
        <Link href="/craque" className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, color: 'var(--txt)' }}>
          <div
            style={{ width: 64, height: 84, borderRadius: 12, background: TIER[nivel].bg, color: TIER[nivel].fg, flexShrink: 0 }}
            className="col"
          >
            <div className="col" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <span className="cond" style={{ fontSize: 28 }}>{overall(craque.pts)}</span>
              <span style={{ fontSize: 10, fontWeight: 700 }}>{TIER[nivel].label.toUpperCase()}</span>
            </div>
          </div>
          <div className="col gap-4 flex-1">
            <span className="kicker">Craque da rodada {craque.numero}</span>
            <span className="cond ellipsis" style={{ fontSize: 26 }}>{craque.nome.toUpperCase()}</span>
            <span className="s13 mut">
              {craque.v} vit. · {craque.gols} gols · {craque.assist} assist. · {craque.pts} pts
            </span>
          </div>
          <span className="mut"><IconSeta /></span>
        </Link>
      )}

      <Link href="/perfil" className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--txt)', borderColor: 'var(--yel-line)' }}>
        <div className="row">
          <div
            style={{ width: 52, height: 68, borderRadius: 10, background: TIER[meuNivel].bg, color: TIER[meuNivel].fg, flexShrink: 0 }}
            className="col"
          >
            <div className="col" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <span className="cond" style={{ fontSize: 24 }}>{meuOvr}</span>
              <span style={{ fontSize: 9, fontWeight: 700 }}>{perfil.posicao}</span>
            </div>
          </div>
          <div className="col flex-1 gap-4">
            <span className="kicker">Meu perfil</span>
            <span className="cond ellipsis" style={{ fontSize: 24 }}>{nomeExibicao(perfil).toUpperCase()}</span>
            <span className="s13 mut">Carta, gráficos e seus lances</span>
          </div>
          <span className="yel"><IconSeta /></span>
        </div>
        <div className="grid-4 center">
          <div className="col"><span className="cond org" style={{ fontSize: 24 }}>{minhaPos >= 0 ? `${minhaPos + 1}º` : '—'}</span><span className="small mut">ranking</span></div>
          <div className="col"><span className="cond yel" style={{ fontSize: 24 }}>{eu?.pts ?? 0}</span><span className="small mut">pontos</span></div>
          <div className="col"><span className="cond" style={{ fontSize: 24 }}>{eu?.gols ?? 0}</span><span className="small mut">gols</span></div>
          <div className="col"><span className="cond" style={{ fontSize: 24 }}>{eu?.assist ?? 0}</span><span className="small mut">assist.</span></div>
        </div>
      </Link>

      <section className="col gap-10">
        <div className="between">
          <h2 className="h2">TOP 3 DA TEMPORADA</h2>
          <Link href="/ranking" className="s13" style={{ fontWeight: 600 }}>Ver ranking</Link>
        </div>
        {lista.length === 0 && <div className="vazio">O ranking aparece depois da primeira partida registrada.</div>}
        {lista.slice(0, 3).map((p, i) => (
          <Link key={p.jogador_id} href={`/perfil?id=${p.jogador_id}`} className="item">
            <span className="cond" style={{ fontSize: 22, width: 18, color: CORES_PODIO[i] }}>{i + 1}</span>
            <Avatar id={p.avatar} nome={p.nome} size={40} />
            <span className="flex-1 ellipsis" style={{ fontWeight: 600, fontSize: 16 }}>{p.nome}</span>
            <span className="cond" style={{ fontSize: 20 }}>
              {p.pts}
              <span className="small mut" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}> pts</span>
            </span>
          </Link>
        ))}
      </section>

      <div className="col gap-8">
        <Link href="/regras" className="atalho">
          <span className="yel"><IconLivro /></span>
          <span className="flex-1" style={{ fontWeight: 600 }}>Regras do {config.nome_grupo}</span>
          <span className="mut"><IconSeta /></span>
        </Link>
        <Link href="/caixa" className="atalho">
          <span className="yel"><IconCaixa size={20} /></span>
          <span className="flex-1" style={{ fontWeight: 600 }}>Caixa e mensalidade</span>
          <span className="mut"><IconSeta /></span>
        </Link>
      </div>
    </main>
  )
}
