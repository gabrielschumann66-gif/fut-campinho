import Link from 'next/link'
import Avatar, { molduraDe } from '@/components/Avatar'
import { MiniCarta } from '@/components/Carta'
import ConfirmarPresenca from '@/components/ConfirmarPresenca'
import { logoDe } from '@/lib/config'
import { IconCaixa, IconEngrenagem, IconLivro, IconMais, IconSeta, IconUsuarios } from '@/components/icons'
import { getConfig, getContexto, temporadaAtual } from '@/lib/dados'
import {
  PAPEL_LABEL,
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
  corHex,
  type Stats,
} from '@/lib/util'

export default async function Inicio() {
  const [{ supabase, perfil }, config] = await Promise.all([getContexto(), getConfig()])
  const temporada = temporadaAtual()

  // Agenda a rodada da semana e começa no horário (fim continua manual)
  await supabase.rpc('garantir_rodada')

  const [{ data: proxima }, { data: craque }, { data: ranking }] = await Promise.all([
    supabase
      .from('rodadas')
      .select('*, presencas(jogador_id, profiles(nome, apelido, avatar))')
      .in('status', ['agendada', 'em_andamento'])
      .order('data', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from('v_craque_rodada').select('*').order('data', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('v_ranking_temporada').select('*').eq('temporada', temporada),
  ])

  type Pres = { jogador_id: string; profiles: { nome: string; apelido: string | null; avatar: string | null } | null }
  const pres = (proxima?.presencas ?? []) as Pres[]
  const confirmados = pres.length
  const euConfirmado = pres.some((p) => p.jogador_id === perfil.id)

  const lista = ordenarRanking((ranking ?? []) as Stats[])
  const minhaPos = lista.findIndex((r) => r.jogador_id === perfil.id)
  const eu = minhaPos >= 0 ? lista[minhaPos] : null
  const meuOvr = overall(eu && eu.rodadas ? eu.pts / eu.rodadas : 0)
  const meuNivel = nivelOverall(meuOvr)
  const nivel = craque ? nivelRodada(craque.pts) : null

  // Jogo rolando agora: placar ao vivo na tela inicial
  const { data: jogo } =
    proxima?.status === 'em_andamento'
      ? await supabase.from('v_partida_placar').select('*').eq('rodada_id', proxima.id).eq('status', 'ao_vivo').order('numero', { ascending: false }).limit(1).maybeSingle()
      : { data: null }

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

      <section className="bloco-yel col gap-12">
        {proxima ? (
          <>
            <span className="palavra-fundo" aria-hidden="true">{diaSemana(proxima.data)}</span>
            <div className="between">
              <span className="pill preta">
                {proxima.status === 'em_andamento' ? 'Rodada em andamento' : 'Próxima rodada'} · R{proxima.numero}
              </span>
            </div>
            <div className="col" style={{ marginTop: 6 }}>
              <span className="cond" style={{ fontSize: 60, lineHeight: 0.9, fontWeight: 900, letterSpacing: -1 }}>
                {diaSemana(proxima.data)} · {ddmm(proxima.data)}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, opacity: 0.75, marginTop: 6 }}>
                {hhmm(proxima.horario)} · {proxima.local}
              </span>
            </div>
            <div className="between" style={{ marginTop: 4 }}>
              <div className="row" style={{ gap: 0 }}>
                {pres.slice(0, 5).map((p, n) => (
                  <span key={p.jogador_id} style={{ marginLeft: n ? -9 : 0, borderRadius: '50%', boxShadow: '0 0 0 2.5px #fde819', display: 'inline-flex' }}>
                    <Avatar id={p.profiles?.avatar} nome={p.profiles ? nomeExibicao(p.profiles) : '?'} size={30} />
                  </span>
                ))}
                {confirmados > 5 && (
                  <span className="avatar" style={{ width: 30, height: 30, marginLeft: -9, background: '#0b0b0a', color: 'var(--yel)', fontSize: 11, boxShadow: '0 0 0 2.5px #fde819' }}>
                    +{confirmados - 5}
                  </span>
                )}
                {confirmados === 0 && <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.7 }}>Ninguém confirmou ainda</span>}
              </div>
              <span>
                <span className="cond" style={{ fontSize: 30, fontWeight: 900 }}>{confirmados}</span>
                <span className="cond" style={{ fontSize: 20, opacity: 0.5 }}>/{config.vagas}</span>
              </span>
            </div>
            <div className="barra" style={{ height: 8, background: 'rgba(0,0,0,.14)' }}>
              <div style={{ width: `${Math.min(100, (confirmados / config.vagas) * 100)}%`, background: '#0b0b0a' }} />
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
            <span className="pill preta" style={{ alignSelf: 'flex-start' }}>Próxima rodada</span>
            <span className="cond" style={{ fontSize: 40, fontWeight: 900 }}>NENHUMA AGENDADA</span>
            {isAdmin(perfil.papel) && (
              <Link href="/partida" className="btn dark full">Começar rodada</Link>
            )}
          </div>
        )}
      </section>

      {jogo ? (
        <Link href={`/partida/${jogo.id}`} className="card placar">
          <div className="aba">Rodada {proxima?.numero} · Jogo {jogo.numero}</div>
          <div className="corpo">
            <div className="col" style={{ alignItems: 'center' }}>
              <span className="camisa" style={{ background: corHex(jogo.cor_a) }} />
              <span className="cond ellipsis" style={{ fontSize: 17, maxWidth: '100%' }}>{jogo.cor_a.toUpperCase()}</span>
            </div>
            <div className="col" style={{ alignItems: 'center', gap: 6 }}>
              <div className="gols">{jogo.gols_a}<b>:</b>{jogo.gols_b}</div>
              <span className="pill live"><span className="ao-vivo-dot" />AO VIVO</span>
            </div>
            <div className="col" style={{ alignItems: 'center' }}>
              <span className="camisa" style={{ background: corHex(jogo.cor_b) }} />
              <span className="cond ellipsis" style={{ fontSize: 17, maxWidth: '100%' }}>{jogo.cor_b.toUpperCase()}</span>
            </div>
          </div>
          <div className="base" />
        </Link>
      ) : (
        proxima?.status === 'em_andamento' && (
          <Link href="/partida" className="atalho" style={{ borderColor: 'rgba(253,98,1,.45)' }}>
            <span className="ao-vivo-dot" />
            <span className="flex-1 bold">Rodada rolando: ver jogos e placar</span>
            <span className="org"><IconSeta /></span>
          </Link>
        )
      )}

      {isAdmin(perfil.papel) && (
        <section className="col gap-8">
          <h2 className="h2">{perfil.papel === 'presidente' ? 'Presidência' : 'Capitão'}</h2>
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
        <Link href="/caixa" className="atalho" style={{ }}>
          <span className="yel"><IconCaixa size={22} /></span>
          <span className="flex-1 bold">Marcar mensalidades do mês</span>
          <span className="yel"><IconSeta /></span>
        </Link>
      )}

      {craque && nivel && (
        <Link href="/craque" className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, color: 'var(--txt)' }}>
          <MiniCarta nivel={nivel} ovr={overall(craque.pts)} rotulo="MVP" largura={60} />
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
          <MiniCarta nivel={meuNivel} ovr={meuOvr} rotulo={perfil.posicao} largura={52} />
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
          <h2 className="h2">Top 3 da temporada</h2>
          <Link href="/ranking" className="s13" style={{ fontWeight: 600 }}>Ver ranking</Link>
        </div>
        {lista.length === 0 && <div className="vazio">O ranking aparece depois da primeira partida registrada.</div>}
        {lista.slice(0, 3).map((p, i) => (
          <Link key={p.jogador_id} href={`/perfil?id=${p.jogador_id}`} className="item">
            <span className={`medalha metal-${i + 1}`}>{i + 1}</span>
            <Avatar id={p.avatar} nome={p.nome} size={40} moldura={molduraDe(i)} />
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
