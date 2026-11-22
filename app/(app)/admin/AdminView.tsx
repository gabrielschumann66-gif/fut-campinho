'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { IconLixo, IconMais } from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import {
  PAPEL_LABEL,
  ddmm,
  diaSemana,
  erroMsg,
  formatarTelefone,
  hhmm,
  mascaraTelefone,
  nomeExibicao,
  normalizarTelefone,
  type Papel,
  type Perfil,
} from '@/lib/util'

type Config = {
  local_padrao: string
  horario_padrao: string
  vagas: number
  valor_mensalidade: number
  dia_vencimento: number
  duracao_min: number
  gols_limite: number
  formato: string
  max_vitorias: number
}
type Rodada = { id: number; numero: number; data: string; horario: string; local: string; status: string }
type Aba = 'elenco' | 'rodadas' | 'config'
type Form = {
  id?: string
  nome: string
  apelido: string
  telefone: string
  papel: Papel
  mensalista: boolean
  ativo: boolean
  login_liberado: boolean
}

const POSICAO_PADRAO = 'MEI'

function proximaSegunda() {
  const d = new Date()
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const acesso = (j: Perfil) =>
  j.user_id ? { t: 'Já entrou', c: 'ok' } : !j.telefone ? { t: 'Sem celular', c: 'org' } : j.login_liberado ? { t: 'Ainda não entrou', c: 'yel' } : { t: 'Bloqueado', c: '' }

function linkConvite(j: Pick<Perfil, 'nome' | 'apelido' | 'telefone'>) {
  const nome = nomeExibicao(j).split(' ')[0]
  const texto =
    `Fala, ${nome}! O app do Fut Campinho está no ar e seus números já estão lá ⚽\n\n` +
    `1. Abra ${window.location.origin}\n2. Coloque este celular\n3. Crie um PIN de 6 números\n\n` +
    `Lá tem o ranking, sua carta e seus gols e assistências.`
  return `https://wa.me/${j.telefone}?text=${encodeURIComponent(texto)}`
}

export default function AdminView({
  abaInicial,
  meuId,
  souPresidente,
  config,
  rodadas,
  elenco,
  comLance,
  proximoNumero,
  temporada,
}: {
  abaInicial: Aba
  meuId: string
  souPresidente: boolean
  config: Config
  rodadas: Rodada[]
  elenco: Perfil[]
  comLance: string[]
  proximoNumero: number
  temporada: number
}) {
  const router = useRouter()
  const [aba, setAba] = useState<Aba>(abaInicial)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'com' | 'sem'>('todos')
  const [form, setForm] = useState<Form | null>(null)

  const [nova, setNova] = useState({
    numero: proximoNumero,
    data: proximaSegunda(),
    horario: config.horario_padrao.slice(0, 5),
    local: config.local_padrao,
  })
  const [cfg, setCfg] = useState({ ...config, horario_padrao: config.horario_padrao.slice(0, 5) })

  const supabase = () => createClient()

  async function exec(fn: () => PromiseLike<{ error: unknown }>, sucesso?: string) {
    setOcupado(true)
    setErro(null)
    setOk(null)
    const { error } = await fn()
    setOcupado(false)
    if (error) {
      const m = erroMsg(error)
      setErro(m.includes('profiles_telefone_key') ? 'Já existe um jogador com esse celular.' : m)
      return false
    }
    if (sucesso) setOk(sucesso)
    router.refresh()
    return true
  }

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return elenco.filter(
      (j) =>
        (!q || `${j.nome} ${j.apelido ?? ''} ${j.telefone ?? ''}`.toLowerCase().includes(q)) &&
        (filtro === 'todos' || (filtro === 'com' ? !!j.user_id : !j.user_id)),
    )
  }, [elenco, busca, filtro])

  const nAcesso = elenco.filter((j) => j.user_id).length

  function abrirNovo() {
    setErro(null)
    setOk(null)
    setForm({ nome: '', apelido: '', telefone: '', papel: 'jogador', mensalista: true, ativo: true, login_liberado: true })
  }
  function abrirEdicao(j: Perfil) {
    setErro(null)
    setOk(null)
    setForm({
      id: j.id,
      nome: j.nome,
      apelido: j.apelido ?? '',
      telefone: mascaraTelefone(formatarTelefone(j.telefone)),
      papel: j.papel,
      mensalista: j.mensalista,
      ativo: j.ativo,
      login_liberado: j.login_liberado,
    })
  }

  async function salvarJogador(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    const tel = form.telefone ? normalizarTelefone(form.telefone) : null
    if (tel && tel.length < 12) return setErro('Celular incompleto. Use DDD + número.')
    
    const dados = {
      nome: form.nome.trim(),
      apelido: form.apelido.trim() || null,
      telefone: tel,
      papel: form.papel,
      mensalista: form.mensalista,
      ativo: form.ativo,
      login_liberado: form.login_liberado,
    }
    const feito = await exec(
      () =>
        form.id
          ? supabase().from('profiles').update(dados).eq('id', form.id)
          : supabase().from('profiles').insert({ ...dados, posicao: POSICAO_PADRAO }),
      form.id ? `${dados.nome} atualizado.` : `${dados.nome} cadastrado.`,
    )
    if (feito) setForm(null)
  }

  async function liberar(j: Perfil) {
    if (!j.telefone) return abrirEdicao(j)
    await exec(() => supabase().from('profiles').update({ login_liberado: true }).eq('id', j.id), `${nomeExibicao(j)} desbloqueado.`)
  }

  async function resetar(id: string, nome: string) {
    if (!confirm(`Resetar o acesso de ${nome}? Ele vai criar um PIN novo no próximo acesso.`)) return
    const feito = await exec(() => supabase().rpc('resetar_acesso', { p_perfil: id }), `Acesso de ${nome} resetado.`)
    if (feito) setForm(null)
  }

  async function excluir(id: string, nome: string) {
    if (comLance.includes(id)) return setErro(`${nome} já tem jogos registrados. Marque como inativo em vez de excluir.`)
    if (!confirm(`Excluir ${nome} do elenco?`)) return
    const feito = await exec(() => supabase().from('profiles').delete().eq('id', id), `${nome} excluído.`)
    if (feito) setForm(null)
  }

  const editado = form?.id ? elenco.find((j) => j.id === form.id) : undefined

  return (
    <>
      <div className="seg">
        {(['elenco', 'rodadas', 'config'] as const).map((k) => (
          <button key={k} className={aba === k ? 'on' : ''} onClick={() => setAba(k)}>
            {k === 'rodadas' ? 'Rodadas' : k === 'elenco' ? `Jogadores (${elenco.length})` : 'Grupo'}
          </button>
        ))}
      </div>
      {erro && !form && <span className="erro" role="alert">{erro}</span>}
      {ok && <span className="ok" role="status">{ok}</span>}

      {aba === 'elenco' && (
        <section className="col gap-8">
          <button className="btn yel full" onClick={abrirNovo}>
            <IconMais size={18} stroke={2.4} /> Cadastrar jogador
          </button>
          <span className="small mut">
            {nAcesso} de {elenco.length} já entraram. Todo jogador com celular cadastrado pode entrar: ele coloca o celular, cria um PIN e já vê
            os números dele. <b>Avisar</b> abre o WhatsApp com a mensagem pronta.
          </span>
          <input className="input" placeholder="Buscar por nome ou celular" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar jogador" />
          <div className="chips">
            {(
              [
                ['todos', 'Todos'],
                ['com', 'Já entraram'],
                ['sem', 'Ainda não'],
              ] as const
            ).map(([k, t]) => (
              <button key={k} className={`chip${filtro === k ? ' on' : ''}`} onClick={() => setFiltro(k)} aria-pressed={filtro === k}>
                {t}
              </button>
            ))}
          </div>

          {lista.length === 0 && <div className="vazio">Ninguém encontrado.</div>}
          {lista.map((j) => {
            const a = acesso(j)
            return (
              <div key={j.id} className="card tight row" style={{ opacity: j.ativo ? 1 : 0.55, gap: 10 }}>
                <button
                  onClick={() => abrirEdicao(j)}
                  className="row flex-1"
                  style={{ border: 'none', background: 'transparent', color: 'var(--txt)', padding: 0, textAlign: 'left', minWidth: 0 }}
                  aria-label={`Editar ${nomeExibicao(j)}`}
                >
                  <span className="avatar">{nomeExibicao(j).slice(0, 2).toUpperCase()}</span>
                  <span className="col flex-1" style={{ minWidth: 0, gap: 3 }}>
                    <span className="bold ellipsis">
                      {nomeExibicao(j)}
                      {j.apelido ? <span className="mut" style={{ fontWeight: 500 }}> · {j.nome}</span> : null}
                      {j.id === meuId ? ' (você)' : ''}
                    </span>
                    <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      {j.papel !== 'jogador' && <span className="badge org">{PAPEL_LABEL[j.papel]}</span>}
                      <span className={`badge ${a.c}`}>{a.t}</span>
                      <span className="small mut">{j.telefone ? formatarTelefone(j.telefone) : 'sem celular'}</span>
                    </span>
                  </span>
                </button>
                {!j.user_id && !j.login_liberado && (
                  <button className="btn sm" disabled={ocupado} onClick={() => liberar(j)}>Desbloquear</button>
                )}
                {!j.user_id && j.login_liberado && j.telefone && (
                  <a className="btn sm yel" href={linkConvite(j)} target="_blank" rel="noreferrer">Avisar</a>
                )}
              </div>
            )
          })}
        </section>
      )}

      {aba === 'rodadas' && (
        <>
          <span className="small mut">
            No dia do jogo, não precisa agendar: em <b>Jogos</b> é só tocar em “Começar a rodada de hoje”. Agende aqui só se quiser abrir a
            confirmação de presença antes.
          </span>
          <form
            className="card col gap-12"
            onSubmit={(e) => {
              e.preventDefault()
              exec(() => supabase().from('rodadas').insert({ ...nova, temporada }), `Rodada ${nova.numero} agendada.`).then(
                (feito) => feito && setNova((n) => ({ ...n, numero: n.numero + 1 })),
              )
            }}
          >
            <h2 className="h2">AGENDAR RODADA</h2>
            <div className="grid-2">
              <label className="field">
                Número
                <input className="input" type="number" min={1} value={nova.numero} onChange={(e) => setNova({ ...nova, numero: Number(e.target.value) })} required />
              </label>
              <label className="field">
                Data
                <input className="input" type="date" value={nova.data} onChange={(e) => setNova({ ...nova, data: e.target.value })} required />
              </label>
              <label className="field">
                Horário
                <input className="input" type="time" value={nova.horario} onChange={(e) => setNova({ ...nova, horario: e.target.value })} required />
              </label>
              <label className="field">
                Local
                <input className="input" value={nova.local} onChange={(e) => setNova({ ...nova, local: e.target.value })} required />
              </label>
            </div>
            <button className="btn yel full" disabled={ocupado}>Agendar</button>
          </form>

          <section className="col gap-8">
            <h2 className="h2">EM ABERTO</h2>
            {rodadas.length === 0 && <div className="vazio">Nenhuma rodada em aberto.</div>}
            {rodadas.map((r) => (
              <div key={r.id} className="item">
                <span className="cond" style={{ fontSize: 22, width: 48 }}>R{r.numero}</span>
                <div className="col flex-1">
                  <span className="bold">{diaSemana(r.data)} · {ddmm(r.data)} · {hhmm(r.horario)}</span>
                  <span className="small mut">{r.local} · {r.status === 'em_andamento' ? 'em andamento' : 'agendada'}</span>
                </div>
                {r.status === 'agendada' && (
                  <button
                    className="icon-btn"
                    aria-label={`Excluir rodada ${r.numero}`}
                    onClick={() => confirm(`Excluir a rodada ${r.numero}?`) && exec(() => supabase().from('rodadas').delete().eq('id', r.id))}
                  >
                    <IconLixo />
                  </button>
                )}
              </div>
            ))}
          </section>
        </>
      )}

      {aba === 'config' && (
        <form
          className="card col gap-12"
          onSubmit={(e) => {
            e.preventDefault()
            exec(
              () =>
                supabase()
                  .from('config')
                  .update({
                    local_padrao: cfg.local_padrao,
                    horario_padrao: cfg.horario_padrao,
                    vagas: Number(cfg.vagas),
                    valor_mensalidade: Number(cfg.valor_mensalidade),
                    dia_vencimento: Number(cfg.dia_vencimento),
                    duracao_min: Number(cfg.duracao_min),
                    gols_limite: Number(cfg.gols_limite),
                    formato: cfg.formato.trim() || '5×5',
                    max_vitorias: Number(cfg.max_vitorias),
                  })
                  .eq('id', 1),
              'Configurações salvas.',
            )
          }}
        >
          <h2 className="h2">O JOGO EM NÚMEROS</h2>
          <span className="small mut">Aparece no topo da página de Regras.</span>
          <div className="grid-2">
            <label className="field">
              Duração do jogo (min)
              <input className="input" type="number" min={1} value={cfg.duracao_min} onChange={(e) => setCfg({ ...cfg, duracao_min: Number(e.target.value) })} required />
            </label>
            <label className="field">
              Ou até quantos gols
              <input className="input" type="number" min={0} value={cfg.gols_limite} onChange={(e) => setCfg({ ...cfg, gols_limite: Number(e.target.value) })} required />
            </label>
            <label className="field">
              Formato
              <input className="input" value={cfg.formato} onChange={(e) => setCfg({ ...cfg, formato: e.target.value })} required />
            </label>
            <label className="field">
              Máx. vitórias seguidas
              <input className="input" type="number" min={0} value={cfg.max_vitorias} onChange={(e) => setCfg({ ...cfg, max_vitorias: Number(e.target.value) })} required />
            </label>
          </div>
          <h2 className="h2" style={{ marginTop: 8 }}>GRUPO</h2>
          <label className="field">
            Local padrão
            <input className="input" value={cfg.local_padrao} onChange={(e) => setCfg({ ...cfg, local_padrao: e.target.value })} required />
          </label>
          <div className="grid-2">
            <label className="field">
              Horário padrão
              <input className="input" type="time" value={cfg.horario_padrao} onChange={(e) => setCfg({ ...cfg, horario_padrao: e.target.value })} required />
            </label>
            <label className="field">
              Vagas por rodada
              <input className="input" type="number" min={1} value={cfg.vagas} onChange={(e) => setCfg({ ...cfg, vagas: Number(e.target.value) })} required />
            </label>
            <label className="field">
              Mensalidade (R$)
              <input className="input" type="number" min={0} step="0.01" value={cfg.valor_mensalidade} onChange={(e) => setCfg({ ...cfg, valor_mensalidade: Number(e.target.value) })} required />
            </label>
            <label className="field">
              Dia de vencimento
              <input className="input" type="number" min={1} max={28} value={cfg.dia_vencimento} onChange={(e) => setCfg({ ...cfg, dia_vencimento: Number(e.target.value) })} required />
            </label>
          </div>
          <button className="btn yel full" disabled={ocupado}>Salvar</button>
        </form>
      )}

      {form && (
        <div className="sheet-bg" onClick={(e) => e.target === e.currentTarget && setForm(null)}>
          <form onSubmit={salvarJogador} className="card sheet col gap-12" role="dialog" aria-label={form.id ? 'Editar jogador' : 'Cadastrar jogador'}>
            <div className="between">
              <h2 className="h2">{form.id ? 'EDITAR JOGADOR' : 'CADASTRAR JOGADOR'}</h2>
              <button type="button" className="btn sm" onClick={() => setForm(null)}>Fechar</button>
            </div>
            <label className="field">
              Nome
              <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required autoFocus={!form.id} />
            </label>
            <label className="field">
              Apelido (aparece no ranking)
              <input className="input" value={form.apelido} onChange={(e) => setForm({ ...form, apelido: e.target.value })} placeholder="Opcional" />
            </label>
            <label className="field">
              Celular (é o login dele)
              <input
                className="input"
                type="tel"
                inputMode="tel"
                placeholder="(21) 98765-4321"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: mascaraTelefone(e.target.value) })}
              />
            </label>
            <div className="field">
              Cargo
              <div className="chips">
                {(Object.keys(PAPEL_LABEL) as Papel[])
                  .filter((p) => p !== 'presidente' || souPresidente || form.papel === 'presidente')
                  .map((p) => (
                    <button
                      type="button"
                      key={p}
                      className={`chip${form.papel === p ? ' on' : ''}`}
                      disabled={form.papel === 'presidente' && !souPresidente}
                      onClick={() => setForm({ ...form, papel: p })}
                      aria-pressed={form.papel === p}
                    >
                      {PAPEL_LABEL[p]}
                    </button>
                  ))}
              </div>
            </div>
            <div className="chips">
              <button type="button" className={`chip${form.login_liberado ? ' on' : ''}`} aria-pressed={form.login_liberado} onClick={() => setForm({ ...form, login_liberado: !form.login_liberado })}>
                {form.login_liberado ? 'Pode entrar no app' : 'Bloqueado no app'}
              </button>
              <button type="button" className={`chip${form.mensalista ? ' on' : ''}`} aria-pressed={form.mensalista} onClick={() => setForm({ ...form, mensalista: !form.mensalista })}>
                {form.mensalista ? 'Mensalista' : 'Avulso'}
              </button>
              <button
                type="button"
                className={`chip${form.ativo ? ' on' : ''}`}
                aria-pressed={form.ativo}
                disabled={form.id === meuId}
                onClick={() => setForm({ ...form, ativo: !form.ativo })}
              >
                {form.ativo ? 'Ativo' : 'Inativo'}
              </button>
            </div>
            {erro && <span className="erro" role="alert">{erro}</span>}
            <button className="btn yel full" disabled={ocupado}>{ocupado ? 'Salvando…' : form.id ? 'Salvar' : 'Cadastrar'}</button>

            {editado && (
              <div className="col gap-8" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <span className="small mut">
                  Acesso: <b>{acesso(editado).t}</b>
                </span>
                {!editado.user_id && editado.login_liberado && editado.telefone && (
                  <a className="btn full" href={linkConvite(editado)} target="_blank" rel="noreferrer">Avisar no WhatsApp</a>
                )}
                {editado.user_id && editado.id !== meuId && (
                  <button type="button" className="btn full" disabled={ocupado} onClick={() => resetar(editado.id, nomeExibicao(editado))}>
                    Resetar acesso (esqueceu o PIN)
                  </button>
                )}
                {editado.id !== meuId && !editado.user_id && (
                  <button type="button" className="btn sm" style={{ background: 'transparent', color: 'var(--mut)' }} disabled={ocupado} onClick={() => excluir(editado.id, nomeExibicao(editado))}>
                    Excluir jogador
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      )}
    </>
  )
}
