import Link from 'next/link'
import TabelaPontos from '@/components/TabelaPontos'
import { IconVoltar } from '@/components/icons'
import { getConfig, getContexto } from '@/lib/dados'
import { PAPEL_LABEL, brl, isAdmin, nomeExibicao, type Perfil } from '@/lib/util'
import RegrasView, { type Regra } from './RegrasView'

export default async function Regras() {
  const [{ supabase, perfil }, config] = await Promise.all([getContexto(), getConfig()])
  const { data } = await supabase
    .from('regras')
    .select('*, autor:profiles!regras_atualizado_por_fkey(nome, apelido, papel)')
    .order('ordem')
    .order('id')

  const regras = (data ?? []) as (Regra & { atualizado_em: string; autor: Pick<Perfil, 'nome' | 'apelido' | 'papel'> | null })[]
  const ultima = [...regras].sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em))[0]
  const quando = ultima ? new Date(ultima.atualizado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : null

  return (
    <main className="screen">
      <div className="row">
        <Link href="/" className="icon-btn" aria-label="Voltar">
          <IconVoltar />
        </Link>
        <div className="col flex-1">
          <h1 className="title" style={{ fontSize: 30 }}>REGRAS DO {config.nome_grupo.toUpperCase()}</h1>
          {ultima && (
            <span className="small mut">
              Atualizado{ultima.autor ? ` por ${nomeExibicao(ultima.autor)} (${PAPEL_LABEL[ultima.autor.papel]})` : ''} · {quando}
            </span>
          )}
        </div>
      </div>

      <section className="col gap-10">
        <span className="kicker">O jogo em 4 números</span>
        <div className="grid-2">
          <div style={{ background: 'var(--yel)', color: 'var(--bg)', borderRadius: 20, padding: 14 }} className="col gap-4">
            <span className="cond" style={{ fontSize: 46, lineHeight: 0.95 }}>{config.duracao_min} MIN</span>
            <span className="s13" style={{ fontWeight: 600 }}>
              {config.gols_limite ? `ou ${config.gols_limite} ${config.gols_limite === 1 ? 'gol' : 'gols'}, o que vier primeiro` : 'por jogo, sem limite de gols'}
            </span>
          </div>
          <div className="card col gap-4" style={{ borderRadius: 20, padding: 14 }}>
            <span className="cond" style={{ fontSize: 46, lineHeight: 0.95 }}>{config.formato}</span>
            <span className="s13 mut">linha + goleiro</span>
          </div>
          <div className="card col gap-4" style={{ borderRadius: 20, padding: 14 }}>
            <span className="cond org" style={{ fontSize: 46, lineHeight: 0.95 }}>{config.max_vitorias}×</span>
            <span className="s13 mut">máx. de partidas seguidas em campo</span>
          </div>
          <div className="card col gap-4" style={{ borderRadius: 20, padding: 14 }}>
            <span className="cond" style={{ fontSize: 46, lineHeight: 0.95 }}>DIA {config.dia_vencimento}</span>
            <span className="s13 mut">prazo da mensalidade (R$ {brl(Number(config.valor_mensalidade))})</span>
          </div>
        </div>
        {isAdmin(perfil.papel) && (
          <Link href="/admin?aba=config" className="small" style={{ fontWeight: 600, alignSelf: 'flex-end' }}>Editar estes números</Link>
        )}
      </section>

      <section className="card col gap-12">
        <div className="between">
          <h2 className="h2">COMO VOCÊ PONTUA</h2>
          <Link href="/ranking" className="s13" style={{ fontWeight: 600 }}>Ver ranking</Link>
        </div>
        <TabelaPontos />
        <span className="small mut">Pontos na rodada definem o nível da carta do craque.</span>
      </section>

      <RegrasView regras={regras} podeEditar={isAdmin(perfil.papel)} meuId={perfil.id} />

      <div className="item" style={{ padding: 14, borderRadius: 18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={config.logo_url || '/escudo.svg'} alt="" width={48} height={48} style={{ objectFit: 'contain' }} />
        <span className="flex-1 s13 mut">Ficou alguma dúvida ou discordância? A palavra final é do capitão em campo.</span>
      </div>
    </main>
  )
}
