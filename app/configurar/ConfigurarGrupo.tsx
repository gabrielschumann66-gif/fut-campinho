'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { configAtualizada } from '@/app/acoes'
import { DIAS_SEMANA, logoDe, type Config } from '@/lib/config'
import { linkConvite } from '@/lib/convite'
import { createClient } from '@/lib/supabase/client'
import { CORES_TIME, brl, corHex, erroMsg, formatarTelefone, mascaraTelefone, normalizarTelefone, type Papel } from '@/lib/util'

type Jog = { id: string; nome: string; nomeCompleto: string; apelido: string | null; telefone: string | null; papel: Papel; entrou: boolean }
type Passo = 'oi' | 'identidade' | 'coletes' | 'agenda' | 'caixa' | 'elenco' | 'cargos' | 'convites' | 'fim'
const PASSOS: Passo[] = ['oi', 'identidade', 'coletes', 'agenda', 'caixa', 'elenco', 'cargos', 'convites', 'fim']

/** Uma linha colada do WhatsApp/planilha: "Nome - (21) 98765-4321" → { nome, telefone } */
function lerLinha(l: string) {
  const digitos = l.replace(/\D/g, '')
  const telefone = digitos.length >= 10 ? digitos.slice(-11) : ''
  const nome = l
    .replace(/[0-9()+\-.:;,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { nome, telefone }
}

export default function ConfigurarGrupo({
  config,
  eu,
  elenco: elencoInicial,
}: {
  config: Config
  eu: { id: string; onboarding: boolean }
  elenco: Jog[]
}) {
  const router = useRouter()
  const [i, setI] = useState(0)
  const [nome, setNome] = useState(config.nome_grupo)
  const [logo, setLogo] = useState<string | null>(config.logo_url)
  const [enviandoLogo, setEnviandoLogo] = useState(false)
  const arte = config.cor_arte
  const [coletes, setColetes] = useState<string[]>(config.coletes)
  const [dia, setDia] = useState(config.dia_semana)
  const [horario, setHorario] = useState(config.horario_padrao.slice(0, 5))
  const [local, setLocal] = useState(config.local_padrao)
  const [vagas, setVagas] = useState(config.vagas)
  const [valor, setValor] = useState(Number(config.valor_mensalidade))
  const [vencimento, setVencimento] = useState(config.dia_vencimento)
  const [elenco, setElenco] = useState<Jog[]>(elencoInicial)
  const [novoNome, setNovoNome] = useState('')
  const [novoTel, setNovoTel] = useState('')
  const [lista, setLista] = useState('')
  const [colando, setColando] = useState(false)
  const [cadastrando, setCadastrando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [capitaes, setCapitaes] = useState<string[]>(elencoInicial.filter((j) => j.papel === 'capitao').map((j) => j.id))
  const [financeiros, setFinanceiros] = useState<string[]>(elencoInicial.filter((j) => j.papel === 'financeiro').map((j) => j.id))
  const [busca, setBusca] = useState('')
  const [origem, setOrigem] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => setOrigem(window.location.origin), [])

  const passo = PASSOS[i]
  const outros = useMemo(() => elenco.filter((j) => j.id !== eu.id), [elenco, eu.id])
  const filtrados = outros.filter((j) => !busca.trim() || j.nome.toLowerCase().includes(busca.trim().toLowerCase()))
  const semAcesso = outros.filter((j) => !j.entrou && j.telefone)

  function ir(n: number) {
    setErro(null)
    setAviso(null)
    if (passo === 'identidade' && n > i && !nome.trim()) return setErro('Dê um nome ao grupo.')
    if (passo === 'coletes' && n > i && coletes.length < 2) return setErro('Escolha pelo menos 2 coletes.')
    setI(Math.max(0, Math.min(PASSOS.length - 1, n)))
    window.scrollTo({ top: 0 })
  }

  async function enviarLogo(f: File | undefined) {
    if (!f) return
    if (f.size > 2 * 1024 * 1024) return setErro('A imagem precisa ter até 2 MB.')
    setEnviandoLogo(true)
    setErro(null)
    const ext = (f.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
    const caminho = `escudo-${Date.now()}.${ext}`
    const supabase = createClient()
    const { error } = await supabase.storage.from('marca').upload(caminho, f, { contentType: f.type, upsert: false })
    setEnviandoLogo(false)
    if (error) return setErro(erroMsg(error))
    setLogo(supabase.storage.from('marca').getPublicUrl(caminho).data.publicUrl)
  }

  const alternar = (lista: string[], set: (v: string[]) => void, id: string, max?: number) => {
    if (lista.includes(id)) set(lista.filter((x) => x !== id))
    else if (!max || lista.length < max) set([...lista, id])
  }

  /** Cadastra na hora (o jogador já pode entrar com o celular e criar o PIN). */
  async function cadastrar(novos: { nome: string; telefone: string }[]) {
    setErro(null)
    setAviso(null)
    const jaTem = new Set(elenco.map((j) => j.telefone).filter(Boolean))
    const validos = novos
      .map((n) => ({ nome: n.nome.trim(), telefone: n.telefone ? normalizarTelefone(n.telefone) : '' }))
      .filter((n) => n.nome.length >= 2)
    const repetidos = validos.filter((n) => n.telefone && jaTem.has(n.telefone))
    const inserir = validos.filter((n) => !n.telefone || !jaTem.has(n.telefone))
    const incompletos = inserir.filter((n) => n.telefone && n.telefone.length < 12)
    if (incompletos.length) return setErro(`Celular incompleto: ${incompletos.map((n) => n.nome).join(', ')}. Use DDD + número.`)
    if (!inserir.length) return setErro(repetidos.length ? 'Esses celulares já estão cadastrados.' : 'Escreva o nome do jogador.')

    setCadastrando(true)
    const { data, error } = await createClient()
      .from('profiles')
      .insert(inserir.map((n) => ({ nome: n.nome, telefone: n.telefone || null, posicao: 'MEI' })))
      .select('id, nome, apelido, telefone, papel, user_id')
    setCadastrando(false)
    if (error) return setErro(erroMsg(error))
    const criados: Jog[] = (data ?? []).map((p) => ({
      id: p.id,
      nome: p.apelido?.trim() || p.nome,
      nomeCompleto: p.nome,
      apelido: p.apelido,
      telefone: p.telefone,
      papel: p.papel,
      entrou: !!p.user_id,
    }))
    setElenco((e) => [...e, ...criados].sort((a, b) => a.nome.localeCompare(b.nome)))
    setNovoNome('')
    setNovoTel('')
    setLista('')
    setColando(false)
    setAviso(
      `${criados.length === 1 ? `${criados[0].nome} cadastrado` : `${criados.length} jogadores cadastrados`}.` +
        (repetidos.length ? ` ${repetidos.length} já estava${repetidos.length > 1 ? 'm' : ''} no grupo.` : ''),
    )
  }

  async function concluir() {
    setSalvando(true)
    setErro(null)
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('config')
        .update({
          nome_grupo: nome.trim(),
          logo_url: logo,
          cor_arte: arte,
          coletes,
          dia_semana: dia,
          horario_padrao: horario,
          local_padrao: local.trim() || 'Quadra',
          vagas: Number(vagas),
          valor_mensalidade: Number(valor),
          dia_vencimento: Number(vencimento),
          configurado_em: new Date().toISOString(),
        })
        .eq('id', 1)
      if (error) throw error

      // Cargos: primeiro tira quem saiu, depois nomeia (o limite de 2 capitães vale a cada passo)
      const sai = outros.filter(
        (j) => (j.papel === 'capitao' && !capitaes.includes(j.id)) || (j.papel === 'financeiro' && !financeiros.includes(j.id)),
      )
      for (const j of sai) {
        const r = await supabase.from('profiles').update({ papel: 'jogador' }).eq('id', j.id)
        if (r.error) throw r.error
      }
      for (const id of capitaes) {
        if (outros.find((j) => j.id === id)?.papel !== 'capitao') {
          const r = await supabase.from('profiles').update({ papel: 'capitao' }).eq('id', id)
          if (r.error) throw r.error
        }
      }
      for (const id of financeiros) {
        if (!capitaes.includes(id) && outros.find((j) => j.id === id)?.papel !== 'financeiro') {
          const r = await supabase.from('profiles').update({ papel: 'financeiro' }).eq('id', id)
          if (r.error) throw r.error
        }
      }
      await configAtualizada()
      router.replace(eu.onboarding ? '/' : '/bem-vindo')
      router.refresh()
    } catch (e) {
      setErro(erroMsg(e))
      setSalvando(false)
    }
  }

  const titulo = (kicker: string, t: string, corpo: React.ReactNode) => (
    <div className="col gap-8">
      <span className="kicker">{kicker}</span>
      <h1 className="title onb-titulo">{t}</h1>
      <p className="onb-corpo">{corpo}</p>
    </div>
  )
  const marca = logo || logoDe({ logo_url: null })
  const previaLista = lista
    .split('\n')
    .map(lerLinha)
    .filter((n) => n.nome.length >= 2)

  return (
    <main className="app">
      <div className="onb">
        <div className="between">
          <div className="onb-prog" aria-label={`Passo ${i + 1} de ${PASSOS.length}`}>
            {PASSOS.map((p, n) => (
              <span key={p} className={n <= i ? 'on' : ''} />
            ))}
          </div>
          <span className="badge yel">Presidente</span>
        </div>

        <div className="onb-conteudo">
          {passo === 'oi' && (
            <>
              <div className="col" style={{ alignItems: 'center', paddingTop: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={marca} alt="" width={170} height={170} style={{ objectFit: 'contain' }} />
              </div>
              {titulo(
                'Onboarding do presidente',
                'VAMOS DEIXAR O GRUPO PRONTO',
                <>
                  São 7 passos rápidos: escudo, coletes, dia do jogo, mensalidade, jogadores, cargos e convites.
                  {elencoInicial.length > 1
                    ? ` Já preenchemos o que sabemos do ${config.nome_grupo}: é só revisar e seguir.`
                    : ' Começando do zero? Sem problema: cada passo já vem com uma sugestão.'}{' '}
                  Dá para mudar tudo depois em Gestão.
                </>,
              )}
            </>
          )}

          {passo === 'identidade' && (
            <>
              {titulo(
                '1 · Identidade',
                'NOME E ESCUDO',
                'O app mantém as cores do Fut Campinho. O nome e o escudo do grupo aparecem na entrada, nas cartas e na arte do craque.',
              )}
              <label className="field">
                Nome do grupo
                <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} />
              </label>
              <div className="card row" style={{ gap: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={marca} alt="Escudo atual" width={76} height={76} style={{ objectFit: 'contain' }} />
                <div className="col gap-8 flex-1">
                  <span className="bold">Escudo</span>
                  <label className="btn sm" style={{ alignSelf: 'flex-start' }}>
                    {enviandoLogo ? 'Enviando…' : 'Trocar imagem'}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => enviarLogo(e.target.files?.[0])} />
                  </label>
                  {logo && (
                    <button className="small mut" style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left' }} onClick={() => setLogo(null)}>
                      Voltar ao escudo padrão
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {passo === 'coletes' && (
            <>
              {titulo('2 · Coletes', 'QUAIS COLETES VOCÊS TÊM?', 'Os times dos jogos usam essas cores. Os dois primeiros escolhidos viram o padrão de cada jogo.')}
              <div className="col gap-8">
                {CORES_TIME.map((c) => {
                  const n = coletes.indexOf(c.nome)
                  return (
                    <button
                      key={c.nome}
                      className="item"
                      aria-pressed={n >= 0}
                      onClick={() => alternar(coletes, setColetes, c.nome)}
                      style={{ border: `2px solid ${n >= 0 ? 'var(--yel)' : 'transparent'}`, padding: 12 }}
                    >
                      <span style={{ width: 30, height: 30, borderRadius: 15, background: c.hex, boxShadow: '0 0 0 1px #4A4A45' }} />
                      <span className="flex-1 bold" style={{ textAlign: 'left', fontSize: 16 }}>{c.nome}</span>
                      {n >= 0 ? <span className="badge yel">{n === 0 ? 'Time 1' : n === 1 ? 'Time 2' : 'Reserva'}</span> : <span className="small mut">tocar para usar</span>}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {passo === 'agenda' && (
            <>
              {titulo(
                '3 · Agenda',
                'DIA E HORÁRIO DO JOGO',
                'A rodada da semana é criada sozinha e começa nesse horário. O fim é com vocês: o capitão encerra no app quando o jogo acabar.',
              )}
              <div className="field">
                Dia da semana
                <div className="chips">
                  {DIAS_SEMANA.map((d, n) => (
                    <button key={d} className={`chip${dia === n ? ' on' : ''}`} aria-pressed={dia === n} onClick={() => setDia(n)}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid-2">
                <label className="field">
                  Começa às
                  <input className="input" type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
                </label>
                <label className="field">
                  Vagas por rodada
                  <input className="input" type="number" min={2} value={vagas} onChange={(e) => setVagas(Number(e.target.value))} />
                </label>
              </div>
              <label className="field">
                Local
                <input className="input" value={local} onChange={(e) => setLocal(e.target.value)} />
              </label>
            </>
          )}

          {passo === 'caixa' && (
            <>
              {titulo('4 · Caixa', 'MENSALIDADE', 'Cada jogador vê a própria situação. O financeiro marca quem pagou.')}
              <div className="grid-2">
                <label className="field">
                  Valor (R$)
                  <input className="input" type="number" min={0} step="0.01" value={valor} onChange={(e) => setValor(Number(e.target.value))} />
                </label>
                <label className="field">
                  Vence todo dia
                  <input className="input" type="number" min={1} max={28} value={vencimento} onChange={(e) => setVencimento(Number(e.target.value))} />
                </label>
              </div>
              <div className="card col gap-4">
                <span className="small mut">Previsão do mês com {elenco.length} jogadores</span>
                <span className="cond yel" style={{ fontSize: 34 }}>R$ {brl(elenco.length * valor)}</span>
              </div>
            </>
          )}

          {passo === 'elenco' && (
            <>
              {titulo(
                '5 · Jogadores',
                'QUEM JOGA COM VOCÊS?',
                <>
                  Cadastre nome e celular. Com isso a pessoa já entra no app: usa o celular e cria um PIN. {elenco.length > 1 ? `Já são ${elenco.length} no grupo.` : ''}
                </>,
              )}
              <div className="seg" role="tablist" aria-label="Como cadastrar">
                <button role="tab" aria-selected={!colando} className={!colando ? 'on' : ''} onClick={() => setColando(false)}>
                  Um por um
                </button>
                <button role="tab" aria-selected={colando} className={colando ? 'on' : ''} onClick={() => setColando(true)}>
                  Colar lista
                </button>
              </div>
              {!colando ? (
                <form
                  className="col gap-8"
                  onSubmit={(e) => {
                    e.preventDefault()
                    cadastrar([{ nome: novoNome, telefone: novoTel }])
                  }}
                >
                  <input className="input" placeholder="Nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} aria-label="Nome do jogador" maxLength={40} />
                  <input
                    className="input"
                    placeholder="Celular com DDD"
                    inputMode="tel"
                    value={novoTel}
                    onChange={(e) => setNovoTel(mascaraTelefone(e.target.value))}
                    aria-label="Celular do jogador"
                  />
                  <button className="btn yel full" disabled={cadastrando || novoNome.trim().length < 2}>
                    {cadastrando ? 'Cadastrando…' : '+ Adicionar jogador'}
                  </button>
                </form>
              ) : (
                <div className="col gap-8">
                  <textarea
                    className="input"
                    style={{ height: 150, padding: 12, resize: 'vertical' }}
                    placeholder={'Um por linha, nome e celular:\nJoão Silva 21 98765-4321\nPedro (21) 99876-5432'}
                    value={lista}
                    onChange={(e) => setLista(e.target.value)}
                    aria-label="Lista de jogadores"
                  />
                  <span className="small mut">Dá para colar direto a lista do grupo do WhatsApp.</span>
                  <button className="btn yel full" disabled={cadastrando || !previaLista.length} onClick={() => cadastrar(previaLista)}>
                    {cadastrando ? 'Cadastrando…' : previaLista.length ? `Cadastrar ${previaLista.length} jogador${previaLista.length > 1 ? 'es' : ''}` : 'Cole a lista acima'}
                  </button>
                </div>
              )}
              {aviso && <span className="s13 yel" role="status">{aviso}</span>}
              <div className="col gap-6">
                <span className="s13 mut bold">No grupo ({elenco.length})</span>
                <div className="chips">
                  {elenco.map((j) => (
                    <span key={j.id} className="chip" style={{ cursor: 'default' }}>
                      {j.nome}
                      {!j.telefone && <span className="small org"> · sem celular</span>}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {passo === 'cargos' && (
            <>
              {titulo(
                '6 · Cargos',
                'CAPITÃES E FINANCEIRO',
                <>
                  O grupo tem <b>1 presidente</b> (você) e até <b>2 capitães</b>, que registram os jogos. O financeiro marca as mensalidades. Todo mundo
                  entra como jogador.
                </>,
              )}
              {outros.length === 0 ? (
                <div className="vazio">Cadastre jogadores no passo anterior para escolher os cargos. Dá para pular e fazer depois.</div>
              ) : (
                <>
                  <input className="input" placeholder="Buscar jogador" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar jogador" />
                  <div className="col gap-6">
                    <span className="s13 mut bold">Capitães ({capitaes.length}/2)</span>
                    <div className="chips">
                      {filtrados.map((j) => {
                        const on = capitaes.includes(j.id)
                        return (
                          <button
                            key={j.id}
                            className={`chip${on ? ' on' : ''}`}
                            aria-pressed={on}
                            disabled={!on && capitaes.length >= 2}
                            onClick={() => {
                              alternar(capitaes, setCapitaes, j.id, 2)
                              setFinanceiros((f) => f.filter((x) => x !== j.id))
                            }}
                          >
                            {j.nome}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="col gap-6">
                    <span className="s13 mut bold">Financeiro</span>
                    <div className="chips">
                      {filtrados
                        .filter((j) => !capitaes.includes(j.id))
                        .map((j) => {
                          const on = financeiros.includes(j.id)
                          return (
                            <button key={j.id} className={`chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => alternar(financeiros, setFinanceiros, j.id)}>
                              {j.nome}
                            </button>
                          )
                        })}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {passo === 'convites' && (
            <>
              {titulo(
                '7 · Convites',
                'CHAME A GALERA',
                <>
                  {elenco.filter((j) => j.entrou).length} de {elenco.length} jogadores já entraram. Toque em <b>Avisar</b> para mandar o convite pelo
                  WhatsApp com o link do app. Cada um entra com o celular e cria um PIN.
                </>,
              )}
              {semAcesso.length === 0 ? (
                <div className="vazio">Todo mundo com celular cadastrado já entrou.</div>
              ) : (
                <div className="col gap-8">
                  {semAcesso.map((j) => (
                    <div key={j.id} className="item">
                      <span className="col flex-1" style={{ minWidth: 0 }}>
                        <span className="bold ellipsis">{j.nome}</span>
                        <span className="small mut">{formatarTelefone(j.telefone)}</span>
                      </span>
                      {origem && (
                        <a className="btn sm yel" href={linkConvite({ nome: j.nomeCompleto, apelido: j.apelido, telefone: j.telefone }, nome, origem)} target="_blank" rel="noreferrer">
                          Avisar
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <span className="small mut center">Dá para convidar depois também, em Gestão → Jogadores.</span>
            </>
          )}

          {passo === 'fim' && (
            <>
              {titulo('Tudo certo', 'GRUPO PRONTO!', 'Confira o resumo e salve. Depois você monta a sua carta de jogador.')}
              <div className="card col gap-10">
                <div className="row">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={marca} alt="" width={56} height={56} style={{ objectFit: 'contain' }} />
                  <span className="cond yel" style={{ fontSize: 26 }}>{nome.toUpperCase()}</span>
                </div>
                <span className="s13">
                  <b>Jogo:</b> {DIAS_SEMANA[dia].toLowerCase()} às {horario.replace(':', 'h')} · {local} · {vagas} vagas
                </span>
                <span className="s13 row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <b>Coletes:</b>
                  {coletes.map((c) => (
                    <span key={c} className="row" style={{ gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 5, background: corHex(c), boxShadow: '0 0 0 1px #4A4A45' }} />
                      {c}
                    </span>
                  ))}
                </span>
                <span className="s13">
                  <b>Mensalidade:</b> R$ {brl(valor)} até o dia {vencimento}
                </span>
                <span className="s13">
                  <b>Jogadores:</b> {elenco.length} cadastrados, {elenco.filter((j) => j.entrou).length} já entraram
                </span>
                <span className="s13">
                  <b>Capitães:</b> {capitaes.map((id) => elenco.find((j) => j.id === id)?.nome).join(' e ') || 'nenhum'}
                </span>
                <span className="s13">
                  <b>Financeiro:</b> {financeiros.map((id) => elenco.find((j) => j.id === id)?.nome).join(', ') || 'nenhum (você marca os pagamentos)'}
                </span>
              </div>
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
          {passo === 'fim' ? (
            <button className="btn yel flex-1" onClick={concluir} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar e continuar'}
            </button>
          ) : (
            <button className="btn yel flex-1" onClick={() => ir(i + 1)} disabled={enviandoLogo || cadastrando}>
              {passo === 'oi' ? 'Começar' : passo === 'elenco' && outros.length === 0 ? 'Pular por agora' : 'Próximo'}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
