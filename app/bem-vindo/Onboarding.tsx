'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import Carta, { MiniCarta } from '@/components/Carta'
import EscolherAvatar from '@/components/EscolherAvatar'
import TabelaPontos from '@/components/TabelaPontos'
import { IconBola, IconCaixa, IconEstrela, IconTrofeu, IconUsuarios } from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import { FAIXA_RODADA, PAPEL_LABEL, PONTOS, TIER, brl, corHex, erroMsg, nivelOverall, primeiroNome, type Papel } from '@/lib/util'

type Props = {
  rever: boolean
  perfil: { id: string; nome: string; apelido: string | null; nomeExibicao: string; papel: Papel; posicao: string; avatar: string | null }
  grupo: { nome: string; logo: string; dia: string; horario: string; local: string; vagas: number; valor: number; vencimento: number; coletes: string[] }
  eu: { pos: number; pts: number; gols: number; assist: number; v: number; ovr: number } | null
  craque: { nome: string; pts: number; rodada: number; avatar: string | null } | null
  totalJogadores: number
}

const POSICOES: [string, string][] = [
  ['GOL', 'Goleiro'],
  ['ZAG', 'Zagueiro'],
  ['LAT', 'Lateral'],
  ['VOL', 'Volante'],
  ['MEI', 'Meia'],
  ['ATA', 'Atacante'],
]

type Passo =
  | 'oi'
  | 'presenca'
  | 'aovivo'
  | 'ranking'
  | 'craque'
  | 'caixa'
  | 'cargo'
  | 'cap-times'
  | 'cap-lances'
  | 'cap-rodada'
  | 'cap-elenco'
  | 'avatar'
  | 'posicao'
  | 'pronto'

/** Um roteiro por cargo: presidente (depois de configurar o grupo), capitão, financeiro e jogador. */
const ROTEIRO: Record<Papel, Passo[]> = {
  presidente: ['oi', 'cargo', 'cap-lances', 'ranking', 'craque', 'avatar', 'posicao', 'pronto'],
  capitao: ['oi', 'cap-times', 'cap-lances', 'cap-rodada', 'cap-elenco', 'ranking', 'craque', 'avatar', 'posicao', 'pronto'],
  financeiro: ['oi', 'presenca', 'aovivo', 'ranking', 'craque', 'caixa', 'cargo', 'avatar', 'posicao', 'pronto'],
  jogador: ['oi', 'presenca', 'aovivo', 'ranking', 'craque', 'caixa', 'avatar', 'posicao', 'pronto'],
}

const ROTULO_ONB: Record<Papel, string> = {
  presidente: 'Onboarding do presidente',
  capitao: 'Onboarding do capitão',
  financeiro: 'Onboarding do financeiro',
  jogador: 'Onboarding do jogador',
}

const PODERES: Record<Exclude<Papel, 'jogador'>, { titulo: string; itens: string[] }> = {
  presidente: {
    titulo: 'Você manda no grupo',
    itens: [
      'Muda nome, escudo, coletes e a cor da arte do craque',
      'Nomeia até 2 capitães e o financeiro',
      'Cadastra jogadores e manda o convite pelo WhatsApp',
      'Registra jogos e marca mensalidades, como capitão e financeiro',
    ],
  },
  capitao: {
    titulo: 'Você comanda o jogo',
    itens: [
      'Monta os times e registra cada jogo pelo botão laranja +',
      'Marca gols, assistências e ações de defesa ao vivo; todo mundo vê na hora',
      'Encerra a rodada quando o jogo acabar',
      'Cadastra jogadores e edita as regras',
    ],
  },
  financeiro: {
    titulo: 'Você cuida do caixa',
    itens: ['Vê quem pagou e quem está pendente', 'Marca o pagamento de cada jogador com um toque', 'Acompanha o total arrecadado no mês'],
  },
}

export default function Onboarding({ rever, perfil, grupo, eu, craque, totalJogadores }: Props) {
  const router = useRouter()
  const passos = useMemo<Passo[]>(() => ROTEIRO[perfil.papel] ?? ROTEIRO.jogador, [perfil.papel])
  const [i, setI] = useState(0)
  const [avatar, setAvatar] = useState<string | null>(perfil.avatar ?? null)
  const [posicao, setPosicao] = useState(perfil.posicao)
  const [apelido, setApelido] = useState(perfil.apelido ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const passo = passos[i]
  const ultimoTour = passos.indexOf('avatar')
  const nomeCarta = apelido.trim() || perfil.nome
  const primeiro = primeiroNome(perfil.nomeExibicao)
  const ir = (n: number) => {
    setErro(null)
    setI(Math.max(0, Math.min(passos.length - 1, n)))
    window.scrollTo({ top: 0 })
  }

  async function concluir() {
    setSalvando(true)
    setErro(null)
    const { error } = await createClient()
      .from('profiles')
      .update({ avatar, posicao, apelido: apelido.trim() || null, onboarding_em: new Date().toISOString() })
      .eq('id', perfil.id)
    if (error) {
      setSalvando(false)
      return setErro(erroMsg(error))
    }
    router.replace(rever ? '/perfil' : '/')
    router.refresh()
  }

  const ilus = (conteudo: React.ReactNode) => <div className="onb-ilus">{conteudo}</div>
  const texto = (kicker: string, titulo: string, corpo: React.ReactNode) => (
    <div className="col gap-8">
      <span className="kicker">{kicker}</span>
      <h1 className="title onb-titulo">{titulo}</h1>
      <p className="onb-corpo">{corpo}</p>
    </div>
  )

  return (
    <main className="app">
      <div className="onb">
        <div className="between">
          <div className="onb-prog" aria-label={`Passo ${i + 1} de ${passos.length}`}>
            {passos.map((p, n) => (
              <span key={p} className={n <= i ? 'on' : ''} />
            ))}
          </div>
          {i < ultimoTour && i > 0 && (
            <button className="btn sm" style={{ background: 'transparent', border: 'none', color: 'var(--mut)' }} onClick={() => ir(ultimoTour)}>
              Pular tour
            </button>
          )}
        </div>

        <div className="onb-conteudo">
          {passo === 'oi' && (
            <>
              <div className="onb-heroi">
                <div className="palavras" aria-hidden="true">FUT FUT</div>
                <div className="luz" aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={grupo.logo} alt={`Escudo do ${grupo.nome}`} width={190} height={190} style={{ objectFit: 'contain', position: 'relative', transform: 'rotate(-4deg)', filter: 'drop-shadow(0 30px 40px rgba(0,0,0,.6))' }} />
                <span className="badge yel" style={{ position: 'absolute', bottom: 0, fontSize: 13, height: 28, padding: '0 12px' }}>{PAPEL_LABEL[perfil.papel]}</span>
              </div>
              {texto(
                `${ROTULO_ONB[perfil.papel]} · ${grupo.nome}`,
                `FALA, ${primeiro.toUpperCase()}!`,
                <>
                  {perfil.papel === 'capitao'
                    ? 'Você é capitão: é quem registra os jogos. Em 1 minuto mostramos como montar os times, marcar os lances e fechar a rodada.'
                    : perfil.papel === 'presidente'
                      ? 'O grupo está configurado. Agora um giro rápido pelo que você faz no dia a dia e a sua carta de jogador.'
                      : 'Este é o app do nosso futebol. Em 1 minuto você vê tudo o que dá para fazer aqui e monta sua carta de jogador.'}
                  {eu ? ` Seus números já estão lá: ${eu.pts} pontos e ${eu.pos}º no ranking.` : ''}
                </>,
              )}
            </>
          )}

          {passo === 'presenca' && (
            <>
              {ilus(
                <div className="col gap-10" style={{ background: 'var(--yel)', color: 'var(--bg)', borderRadius: 20, padding: 16 }}>
                  <span className="s13 bold" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>Próxima rodada</span>
                  <span className="cond" style={{ fontSize: 38 }}>{grupo.dia.toUpperCase()} · {grupo.horario.toUpperCase()}</span>
                  <span className="s13" style={{ fontWeight: 600 }}>{grupo.local} · {grupo.vagas} vagas</span>
                  <span className="btn full" style={{ background: 'var(--bg)', color: 'var(--yel)', borderColor: 'var(--bg)' }}>Confirmar presença</span>
                </div>,
              )}
              {texto(
                'Toda semana',
                'CONFIRME SUA PRESENÇA',
                <>
                  A rodada é toda <b>{grupo.dia.toLowerCase()} às {grupo.horario}</b> e aparece sozinha na tela inicial. Toque em{' '}
                  <b>Confirmar presença</b> para garantir sua vaga. São {grupo.vagas} vagas, por ordem de confirmação.
                </>,
              )}
            </>
          )}

          {passo === 'aovivo' && (
            <>
              {ilus(
                <div className="card grid-3" style={{ alignItems: 'center', padding: '16px 10px' }}>
                  {[grupo.coletes[0], grupo.coletes[1]].map((c, n) => (
                    <div key={c} className="col" style={{ alignItems: 'center', gap: 6, order: n === 0 ? 0 : 2 }}>
                      <span style={{ width: 40, height: 40, borderRadius: 20, background: corHex(c), boxShadow: '0 0 0 1px #4A4A45' }} />
                      <span className="bold">{c}</span>
                    </div>
                  ))}
                  <div className="cond row" style={{ order: 1, justifyContent: 'center', gap: 6, fontSize: 48 }}>
                    <span>2</span>
                    <span style={{ color: 'var(--dim)', fontSize: 32 }}>:</span>
                    <span>1</span>
                  </div>
                </div>,
              )}
              {texto(
                'Na hora do jogo',
                'PLACAR AO VIVO',
                <>
                  Os capitães registram cada jogo com os coletes <b>{grupo.coletes.join(' e ')}</b>: gol, assistência e ações de defesa. Você
                  acompanha o placar em tempo real na aba <b>Jogos</b>.
                </>,
              )}
            </>
          )}

          {passo === 'ranking' && (
            <>
              {ilus(<TabelaPontos faixas={false} fundo="var(--card)" />)}
              {texto(
                'Cada lance conta',
                'RANKING DA TEMPORADA',
                eu ? (
                  <>
                    Você está em <b>{eu.pos}º de {totalJogadores}</b>, com <b>{eu.pts} pontos</b> ({eu.v} vitórias, {eu.gols} gols e {eu.assist}{' '}
                    assistências). O ranking atualiza a cada jogo registrado.
                  </>
                ) : (
                  <>Gol, assistência, vitória, empate e ações de defesa viram pontos. O ranking da temporada atualiza a cada jogo registrado.</>
                ),
              )}
            </>
          )}

          {passo === 'craque' && (
            <>
              {ilus(
                <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
                  {(['bronze', 'prata', 'ouro'] as const).map((n, k) => (
                    <span key={n} style={{ transform: k === 2 ? 'scale(1.12)' : undefined, display: 'inline-flex' }}>
                      <MiniCarta nivel={n} ovr={[71, 79, 87][k]} rotulo={TIER[n].label.toUpperCase()} largura={80} avatar={avatar} nome={nomeCarta} />
                    </span>
                  ))}
                </div>,
              )}
              {texto(
                'Man of the Match',
                'CRAQUE DA RODADA',
                <>
                  Quem faz mais pontos na rodada ganha a carta de craque: <b>Bronze</b> até {FAIXA_RODADA.prata - 1} pts, <b>Prata</b> de {FAIXA_RODADA.prata} a {FAIXA_RODADA.ouro - 1} e{' '}
                  <b>Ouro</b> com {FAIXA_RODADA.ouro} ou mais.
                  Dá para gerar a arte e postar no Story.
                  {craque ? ` O último foi ${craque.nome}, com ${craque.pts} pts na rodada ${craque.rodada}.` : ''}
                </>,
              )}
            </>
          )}

          {passo === 'caixa' && (
            <>
              {ilus(
                <div className="card col gap-10">
                  <div className="between">
                    <span className="s13 mut">Mensalidade</span>
                    <span className="badge ok">Pago</span>
                  </div>
                  <span className="cond" style={{ fontSize: 40 }}>R$ {brl(grupo.valor)}</span>
                  <div className="barra"><div style={{ width: '72%' }} /></div>
                </div>,
              )}
              {texto(
                'Sem planilha',
                'CAIXA DO GRUPO',
                <>
                  A mensalidade é de <b>R$ {brl(grupo.valor)}</b> e vence todo <b>dia {grupo.vencimento}</b>. Em <b>Caixa e mensalidade</b> você vê se
                  a sua está paga. Quem marca os pagamentos é o financeiro.
                </>,
              )}
            </>
          )}

          {passo === 'cargo' && perfil.papel !== 'jogador' && (
            <>
              {ilus(
                <div className="col" style={{ alignItems: 'center', gap: 10 }}>
                  <span className="onb-icone">
                    {perfil.papel === 'financeiro' ? <IconCaixa size={34} /> : perfil.papel === 'capitao' ? <IconBola size={34} /> : <IconUsuarios size={34} />}
                  </span>
                  <span className="badge yel" style={{ fontSize: 13, height: 28, padding: '0 12px' }}>{PAPEL_LABEL[perfil.papel]}</span>
                </div>,
              )}
              {texto(
                'Só para você',
                PODERES[perfil.papel].titulo.toUpperCase(),
                <span className="col gap-8" style={{ display: 'flex', marginTop: 4 }}>
                  {PODERES[perfil.papel].itens.map((t) => (
                    <span key={t} className="row" style={{ alignItems: 'flex-start' }}>
                      <span className="yel" style={{ marginTop: 2 }}><IconEstrela size={16} /></span>
                      <span>{t}</span>
                    </span>
                  ))}
                  <span className="mut">Tudo isso fica em <b>Gestão</b>, na engrenagem da tela inicial.</span>
                </span>,
              )}
            </>
          )}

          {passo === 'cap-times' && (
            <>
              {ilus(
                <div className="grid-2">
                  {[grupo.coletes[0], grupo.coletes[1]].map((c, n) => (
                    <div key={c} className="card tight col gap-6">
                      <span className="row bold" style={{ gap: 6 }}>
                        <span style={{ width: 14, height: 14, borderRadius: 7, background: corHex(c), boxShadow: '0 0 0 1px #4A4A45' }} />
                        {c}
                      </span>
                      {(n === 0 ? ['Vitão', 'Duzão', 'Maldini'] : ['João', 'Alan', 'Felipe']).map((x) => (
                        <span key={x} className="jog-btn" style={{ minHeight: 36 }}>{x}</span>
                      ))}
                    </div>
                  ))}
                </div>,
              )}
              {texto(
                '1 · Antes de cada jogo',
                'MONTE OS TIMES',
                <>
                  Em <b>Jogos</b>, toque no <b className="org">+</b> laranja e escolha quem joga de <b>{grupo.coletes[0]}</b> e quem joga de{' '}
                  <b>{grupo.coletes[1]}</b>. Quem confirmou presença aparece primeiro. Ao começar, o cronômetro liga sozinho.
                </>,
              )}
            </>
          )}

          {passo === 'cap-lances' && (
            <>
              {ilus(
                <div className="col gap-8">
                  <div className="seg">
                    <button className="on" tabIndex={-1}>Gol (+{PONTOS.gol})</button>
                    <button tabIndex={-1}>Defesa (+{PONTOS.defesa})</button>
                  </div>
                  <div className="grid-2">
                    <span className="jog-btn">Vitão<span className="small mut">1G · 1A</span></span>
                    <span className="jog-btn defesa">Maldini<span className="small mut">2D</span></span>
                  </div>
                </div>,
              )}
              {texto(
                '2 · Durante o jogo',
                'MARQUE OS LANCES',
                <>
                  No modo <b>Gol</b>, toque em quem marcou e depois em quem deu a assistência. No modo <b>Defesa</b>, cada toque registra um
                  desarme, corte ou defesa do goleiro. Em <b>Sebo</b> e <b>Mão</b>, o toque tira pontos de quem cometeu. Errou? Apague o lance na lista. Todo mundo vê o placar na hora.
                </>,
              )}
            </>
          )}

          {passo === 'cap-rodada' && (
            <>
              {ilus(
                <div className="card col gap-10">
                  <span className="s13 mut">Rodada da semana</span>
                  <span className="cond" style={{ fontSize: 34 }}>{grupo.dia.toUpperCase()} · {grupo.horario.toUpperCase()}</span>
                  <span className="btn org full">Encerrar rodada</span>
                </div>,
              )}
              {texto(
                '3 · Depois do último jogo',
                'FECHE A RODADA',
                <>
                  A rodada começa sozinha toda <b>{grupo.dia.toLowerCase()} às {grupo.horario}</b>. Quando acabar o último jogo, toque em{' '}
                  <b>Encerrar rodada</b>: o ranking fecha e sai o craque da rodada.
                </>,
              )}
            </>
          )}

          {passo === 'cap-elenco' && (
            <>
              {ilus(
                <div className="col gap-8">
                  <div className="item">
                    <span className="col flex-1">
                      <span className="bold">Jogador novo</span>
                      <span className="small mut">(21) 9 8765-4321</span>
                    </span>
                    <span className="btn sm yel">Avisar</span>
                  </div>
                </div>,
              )}
              {texto(
                '4 · Chegou alguém?',
                'CADASTRE E CONVIDE',
                <>
                  Em <b>Gestão → Jogadores</b>, cadastre com nome e celular e toque em <b>Avisar</b> para mandar o convite no WhatsApp. A pessoa
                  entra com o celular e cria um PIN, sem esperar liberação.
                </>,
              )}
            </>
          )}

          {passo === 'avatar' && (
            <>
              {texto('Sua cara no app', 'FOTO OU INICIAIS', 'Aparece no ranking, na sua carta e na arte do craque. Dá para trocar quando quiser.')}
              <EscolherAvatar perfilId={perfil.id} nome={nomeCarta} valor={avatar} onChange={setAvatar} />
            </>
          )}

          {passo === 'posicao' && (
            <>
              {texto('Sua carta', 'POSIÇÃO E APELIDO', 'A posição vai na sua carta. O apelido é como o grupo te chama e aparece no ranking.')}
              <div className="onb-posicoes" role="radiogroup" aria-label="Posição">
                {POSICOES.map(([sigla, nome]) => (
                  <button key={sigla} role="radio" aria-checked={posicao === sigla} className={`onb-pos${posicao === sigla ? ' on' : ''}`} onClick={() => setPosicao(sigla)}>
                    <span className="cond" style={{ fontSize: 26 }}>{sigla}</span>
                    <span className="s13">{nome}</span>
                  </button>
                ))}
              </div>
              <label className="field">
                Apelido (opcional)
                <input className="input" value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder={perfil.nome} maxLength={24} />
              </label>
            </>
          )}

          {passo === 'pronto' && (
            <>
              <div className="col" style={{ alignItems: 'center' }}>
                <Carta
                  largura={220}
                  nivel={nivelOverall(eu?.ovr ?? 61)}
                  ovr={eu?.ovr ?? 61}
                  posicao={posicao}
                  nome={nomeCarta}
                  avatar={avatar}
                  logo={grupo.logo}
                  stats={[
                    { k: 'GOL', v: eu?.gols ?? 0 },
                    { k: 'AST', v: eu?.assist ?? 0 },
                    { k: 'VIT', v: eu?.v ?? 0 },
                    { k: 'PTS', v: eu?.pts ?? 0 },
                    { k: 'OVR', v: eu?.ovr ?? 61 },
                    { k: 'POS', v: eu ? `${eu.pos}º` : '—' },
                  ]}
                  versoTitulo="SUA CARTA"
                  verso={[
                    { k: 'Pontos', v: eu?.pts ?? 0 },
                    { k: 'Ranking', v: eu ? `${eu.pos}º` : '—' },
                  ]}
                />
              </div>
              {texto(
                'Tudo pronto',
                'BORA PRO JOGO!',
                'Sua carta evolui com a sua média de pontos por rodada. Você pode trocar foto, posição e apelido quando quiser em Meu perfil.',
              )}
            </>
          )}
        </div>

        {erro && <span className="erro" role="alert">{erro}</span>}
        <div className="onb-acoes">
          {i > 0 && (
            <button className="btn" onClick={() => ir(i - 1)} disabled={salvando}>
              Voltar
            </button>
          )}
          {passo === 'pronto' ? (
            <button className="btn yel flex-1" onClick={concluir} disabled={salvando}>
              {salvando ? 'Salvando…' : rever ? 'Salvar e voltar' : 'Entrar no app'}
            </button>
          ) : (
            <button className="btn yel flex-1" onClick={() => ir(i + 1)}>
              {passo === 'oi' ? 'Começar' : 'Próximo'}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
