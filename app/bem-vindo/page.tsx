import { redirect } from 'next/navigation'
import { getConfig, getContexto, temporadaAtual } from '@/lib/dados'
import { diaSemanaNome, logoDe } from '@/lib/config'
import { nomeExibicao, ordenarRanking, overall, type Stats } from '@/lib/util'
import Onboarding from './Onboarding'

export default async function BemVindo({ searchParams }: { searchParams: Promise<{ rever?: string }> }) {
  const { rever } = await searchParams
  const [{ supabase, perfil }, config] = await Promise.all([getContexto(), getConfig()])
  if (perfil.papel === 'presidente' && !config.configurado_em) redirect('/configurar')

  const [{ data: ranking }, { data: craque }] = await Promise.all([
    supabase.from('v_ranking_temporada').select('*').eq('temporada', temporadaAtual()),
    supabase.from('v_craque_rodada').select('nome, pts, numero, avatar').order('data', { ascending: false }).limit(1).maybeSingle(),
  ])
  const lista = ordenarRanking((ranking ?? []) as Stats[])
  const pos = lista.findIndex((r) => r.jogador_id === perfil.id)
  const eu = pos >= 0 ? lista[pos] : null

  return (
    <Onboarding
      rever={rever === '1'}
      perfil={{
        id: perfil.id,
        nome: perfil.nome,
        apelido: perfil.apelido,
        nomeExibicao: nomeExibicao(perfil),
        papel: perfil.papel,
        posicao: perfil.posicao,
        avatar: perfil.avatar,
      }}
      grupo={{
        nome: config.nome_grupo,
        logo: logoDe(config),
        dia: diaSemanaNome(config.dia_semana),
        horario: config.horario_padrao.slice(0, 5).replace(':', 'h'),
        local: config.local_padrao,
        vagas: config.vagas,
        valor: Number(config.valor_mensalidade),
        vencimento: config.dia_vencimento,
        coletes: config.coletes,
      }}
      eu={
        eu
          ? { pos: pos + 1, pts: eu.pts, gols: eu.gols, assist: eu.assist, v: eu.v, ovr: overall(eu.rodadas ? eu.pts / eu.rodadas : 0) }
          : null
      }
      craque={craque ? { nome: craque.nome, pts: craque.pts, rodada: craque.numero, avatar: craque.avatar } : null}
      totalJogadores={lista.length}
    />
  )
}
