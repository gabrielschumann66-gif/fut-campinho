import Link from 'next/link'
import { IconVoltar } from '@/components/icons'
import { getConfig, getContexto } from '@/lib/dados'
import { PAPEL_LABEL, brl, isAdmin, nomeExibicao, type Perfil } from '@/lib/util'
import RegrasView, { type Regra } from './RegrasView'

export default async function Regras() {
  const { supabase, perfil } = await getContexto()
  const config = await getConfig()
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
          <h1 className="title" style={{ fontSize: 30 }}>REGRAS DO CAMPINHO</h1>
          {ultima && (
            <span className="small mut">
              Atualizado{ultima.autor ? ` por ${nomeExibicao(ultima.autor)} (${PAPEL_LABEL[ultima.autor.papel]})` : ''} · {quando}
            </span>
          )}
        </div>
      </div>

      <section className="col gap-10">
        <span className="kicker">O grupo em números</span>
        <div className="grid-2">
          <div style={{ background: 'var(--yel)', color: 'var(--bg)', borderRadius: 20, padding: 14 }} className="col gap-4">
            <span className="cond" style={{ fontSize: 46, lineHeight: 0.95 }}>{config.vagas}</span>
            <span className="s13" style={{ fontWeight: 600 }}>vagas por rodada</span>
          </div>
          <div className="card col gap-4" style={{ borderRadius: 20, padding: 14 }}>
            <span className="cond" style={{ fontSize: 46, lineHeight: 0.95 }}>{config.horario_padrao.slice(0, 5).replace(':', 'H')}</span>
            <span className="s13 mut">horário padrão</span>
          </div>
          <div className="card col gap-4" style={{ borderRadius: 20, padding: 14 }}>
            <span className="cond org" style={{ fontSize: 46, lineHeight: 0.95 }}>R$ {brl(Number(config.valor_mensalidade))}</span>
            <span className="s13 mut">mensalidade</span>
          </div>
          <div className="card col gap-4" style={{ borderRadius: 20, padding: 14 }}>
            <span className="cond" style={{ fontSize: 46, lineHeight: 0.95 }}>DIA {config.dia_vencimento}</span>
            <span className="s13 mut">prazo da mensalidade</span>
          </div>
        </div>
      </section>

      <section className="card col gap-12">
        <div className="between">
          <h2 className="h2">COMO VOCÊ PONTUA</h2>
          <Link href="/ranking" className="s13" style={{ fontWeight: 600 }}>Ver ranking</Link>
        </div>
        <div className="grid-4 center">
          {[
            ['+3', 'Vitória'],
            ['+1', 'Empate'],
            ['+2', 'Gol'],
            ['+1', 'Assist.'],
          ].map(([v, k]) => (
            <div key={k} className="col" style={{ background: 'var(--bg)', borderRadius: 14, padding: '10px 0' }}>
              <span className="cond yel" style={{ fontSize: 26 }}>{v}</span>
              <span className="small mut">{k}</span>
            </div>
          ))}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <div style={{ flex: 1, height: 34, borderRadius: 10, background: 'linear-gradient(160deg, #F2C49B, #C9834A 45%, #7A4A22)', color: '#1C0F05', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>Bronze · até 8</div>
          <div style={{ flex: 1, height: 34, borderRadius: 10, background: 'linear-gradient(160deg, #F4F6F8, #C9CED6 45%, #8A9099)', color: '#15181C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>Prata · 9–14</div>
          <div style={{ flex: 1, height: 34, borderRadius: 10, background: 'linear-gradient(160deg, #FFF6A0, #FDE819 40%, #C99A00)', color: '#1A1400', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>Ouro · 15+</div>
        </div>
        <span className="small mut">Pontos na rodada definem o nível da carta do craque.</span>
      </section>

      <RegrasView regras={regras} podeEditar={isAdmin(perfil.papel)} meuId={perfil.id} />

      <div className="item" style={{ padding: 14, borderRadius: 18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/escudo.svg" alt="" width={44} height={37} style={{ objectFit: 'contain' }} />
        <span className="flex-1 s13 mut">Ficou alguma dúvida ou discordância? A palavra final é do capitão em campo.</span>
      </div>
    </main>
  )
}
