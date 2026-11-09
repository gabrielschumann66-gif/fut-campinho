'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { IconLixo } from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import { PAPEL_LABEL, ddmm, diaSemana, erroMsg, hhmm, type Papel, type Perfil } from '@/lib/util'

type Config = {
  local_padrao: string
  horario_padrao: string
  vagas: number
  valor_mensalidade: number
  dia_vencimento: number
}
type Rodada = { id: number; numero: number; data: string; horario: string; local: string; status: string }

/** Próxima segunda-feira (ou hoje, se for segunda). */
function proximaSegunda() {
  const d = new Date()
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AdminView({
  meuId,
  souPresidente,
  config,
  rodadas,
  elenco,
  proximoNumero,
  temporada,
}: {
  meuId: string
  souPresidente: boolean
  config: Config
  rodadas: Rodada[]
  elenco: Perfil[]
  proximoNumero: number
  temporada: number
}) {
  const router = useRouter()
  const [aba, setAba] = useState<'rodadas' | 'elenco' | 'config'>('rodadas')
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const [nova, setNova] = useState({
    numero: proximoNumero,
    data: proximaSegunda(),
    horario: config.horario_padrao.slice(0, 5),
    local: config.local_padrao,
  })
  const [cfg, setCfg] = useState({ ...config, horario_padrao: config.horario_padrao.slice(0, 5) })

  async function exec(fn: () => PromiseLike<{ error: unknown }>, sucesso?: string) {
    setOcupado(true)
    setErro(null)
    setOk(null)
    const { error } = await fn()
    setOcupado(false)
    if (error) {
      setErro(erroMsg(error))
      return false
    }
    if (sucesso) setOk(sucesso)
    router.refresh()
    return true
  }

  const supabase = () => createClient()

  return (
    <>
      <div className="seg">
        {(['rodadas', 'elenco', 'config'] as const).map((k) => (
          <button key={k} className={aba === k ? 'on' : ''} onClick={() => setAba(k)}>
            {k === 'rodadas' ? 'Rodadas' : k === 'elenco' ? 'Elenco' : 'Grupo'}
          </button>
        ))}
      </div>
      {erro && <span className="erro" role="alert">{erro}</span>}
      {ok && <span className="ok" role="status">{ok}</span>}

      {aba === 'rodadas' && (
        <>
          <form
            className="card col gap-12"
            onSubmit={(e) => {
              e.preventDefault()
              exec(
                () => supabase().from('rodadas').insert({ ...nova, temporada }),
                `Rodada ${nova.numero} agendada.`,
              ).then((ok) => ok && setNova((n) => ({ ...n, numero: n.numero + 1 })))
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
            <h2 className="h2">PRÓXIMAS</h2>
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

      {aba === 'elenco' && (
        <section className="col gap-8">
          <span className="s13 mut">
            Jogadores entram criando a própria conta na tela de login. Aqui você define o papel de cada um e quem é mensalista.
          </span>
          {elenco.map((j) => (
            <div key={j.id} className="card tight col gap-8" style={{ opacity: j.ativo ? 1 : 0.55 }}>
              <div className="between">
                <span className="bold ellipsis">{j.apelido || j.nome}{j.id === meuId ? ' (você)' : ''}</span>
                <select
                  className="input"
                  style={{ width: 150, height: 40 }}
                  value={j.papel}
                  disabled={ocupado || (j.papel === 'presidente' && !souPresidente)}
                  aria-label={`Papel de ${j.nome}`}
                  onChange={(e) => exec(() => supabase().from('profiles').update({ papel: e.target.value as Papel }).eq('id', j.id))}
                >
                  {(Object.keys(PAPEL_LABEL) as Papel[])
                    .filter((p) => p !== 'presidente' || souPresidente || j.papel === 'presidente')
                    .map((p) => (
                      <option key={p} value={p}>{PAPEL_LABEL[p]}</option>
                    ))}
                </select>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button
                  className={`chip${j.mensalista ? ' on' : ''}`}
                  aria-pressed={j.mensalista}
                  disabled={ocupado}
                  onClick={() => exec(() => supabase().from('profiles').update({ mensalista: !j.mensalista }).eq('id', j.id))}
                >
                  {j.mensalista ? 'Mensalista' : 'Avulso'}
                </button>
                <button
                  className={`chip${j.ativo ? ' on' : ''}`}
                  aria-pressed={j.ativo}
                  disabled={ocupado || j.id === meuId}
                  onClick={() => exec(() => supabase().from('profiles').update({ ativo: !j.ativo }).eq('id', j.id))}
                >
                  {j.ativo ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            </div>
          ))}
        </section>
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
                  })
                  .eq('id', 1),
              'Configurações salvas.',
            )
          }}
        >
          <h2 className="h2">CONFIGURAÇÕES DO GRUPO</h2>
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
    </>
  )
}
