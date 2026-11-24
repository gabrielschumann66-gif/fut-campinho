import Link from 'next/link'
import { IconSeta, IconVoltar } from '@/components/icons'
import { getConfig, getContexto } from '@/lib/dados'
import { brl, isAdmin, isFinanceiro, nomeExibicao, type Perfil } from '@/lib/util'
import CaixaLista from './CaixaLista'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function parseMes(m?: string) {
  const hoje = new Date()
  const ok = m && /^\d{4}-\d{2}$/.test(m)
  const [y, mm] = ok ? m.split('-').map(Number) : [hoje.getFullYear(), hoje.getMonth() + 1]
  return { y, m: mm }
}
const chave = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`
const somaMes = (y: number, m: number, d: number) => {
  const dt = new Date(y, m - 1 + d, 1)
  return chave(dt.getFullYear(), dt.getMonth() + 1)
}

export default async function Caixa({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams
  const { supabase, perfil } = await getContexto()
  const config = await getConfig()
  const { y, m } = parseMes(mes)
  const competencia = `${chave(y, m)}-01`
  const podeEditar = isFinanceiro(perfil.papel)
  const veTodos = podeEditar || isAdmin(perfil.papel)
  const vencimento = `${String(config.dia_vencimento).padStart(2, '0')}/${String(m).padStart(2, '0')}`

  const [{ data: jogadores }, { data: pagamentos }] = await Promise.all([
    supabase.from('profiles').select('*').eq('ativo', true).eq('mensalista', true).order('nome'),
    supabase.from('pagamentos').select('*').eq('competencia', competencia),
  ])

  const pagos = new Map((pagamentos ?? []).map((p) => [p.jogador_id as string, p]))
  const lista = ((jogadores ?? []) as Perfil[]).map((j) => {
    const p = pagos.get(j.id)
    return { id: j.id, nome: nomeExibicao(j), avatar: j.avatar, pago: !!p, pagoEm: p?.pago_em as string | undefined, metodo: p?.metodo as string | undefined }
  })
  const arrecadado = (pagamentos ?? []).reduce((s, p) => s + Number(p.valor), 0)
  const meta = lista.length * Number(config.valor_mensalidade)
  const nPagos = lista.filter((l) => l.pago).length

  const navMes = (
    <div className="between">
      <Link href={`/caixa?mes=${somaMes(y, m, -1)}`} className="icon-btn" aria-label="Mês anterior">
        <IconVoltar />
      </Link>
      <span className="bold">{MESES[m - 1]} de {y}</span>
      <Link href={`/caixa?mes=${somaMes(y, m, 1)}`} className="icon-btn" aria-label="Próximo mês">
        <IconSeta />
      </Link>
    </div>
  )

  if (!veTodos) {
    const eu = lista.find((l) => l.id === perfil.id)
    return (
      <main className="screen">
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <h1 className="title">CAIXA</h1>
          <span className="s13 mut">Minha mensalidade</span>
        </div>
        {navMes}
        {!perfil.mensalista ? (
          <div className="vazio">Você está como avulso. Pague antes de entrar em campo.</div>
        ) : (
          <div className="card col gap-8" style={{ alignItems: 'center', textAlign: 'center' }}>
            <span className="small mut">Mensalidade de {MESES[m - 1].toLowerCase()}</span>
            <span className="cond" style={{ fontSize: 48 }}>R$ {brl(Number(config.valor_mensalidade))}</span>
            {eu?.pago ? (
              <span className="bold yel">Pago em {eu.pagoEm?.split('-').reverse().slice(0, 2).join('/')} · {eu.metodo}</span>
            ) : (
              <span className="bold org">Pendente · vence {vencimento}</span>
            )}
            <span className="small mut">Quem marca o pagamento é o financeiro do grupo.</span>
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="screen">
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <h1 className="title">CAIXA</h1>
        <span className="s13 mut">{podeEditar ? 'Acesso financeiro' : 'Somente leitura'}</span>
      </div>
      {navMes}

      <div className="card col gap-12">
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <div className="col">
            <span className="small mut">Arrecadado no mês</span>
            <span className="cond" style={{ fontSize: 40 }}>R$ {brl(arrecadado)}</span>
          </div>
          <span className="s13 mut">de R$ {brl(meta)}</span>
        </div>
        <div className="barra">
          <div style={{ width: `${meta ? Math.min(100, Math.round((arrecadado / meta) * 100)) : 0}%` }} />
        </div>
        <div className="row s13" style={{ gap: 16 }}>
          <span><b className="yel">{nPagos}</b> pagos</span>
          <span><b className="org">{lista.length - nPagos}</b> pendentes</span>
          <span className="mut">Mensalidade R$ {brl(Number(config.valor_mensalidade))}</span>
        </div>
      </div>

      <CaixaLista
        lista={lista}
        competencia={competencia}
        valor={Number(config.valor_mensalidade)}
        vencimento={vencimento}
        podeEditar={podeEditar}
        registradoPor={perfil.id}
      />
    </main>
  )
}
