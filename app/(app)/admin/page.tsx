import Link from 'next/link'
import { redirect } from 'next/navigation'
import { IconVoltar } from '@/components/icons'
import { getConfig, getContexto, temporadaAtual } from '@/lib/dados'
import { isAdmin, type Perfil } from '@/lib/util'
import AdminView from './AdminView'

export default async function Admin({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams
  const { supabase, perfil } = await getContexto()
  if (!isAdmin(perfil.papel)) redirect('/')
  const config = await getConfig()
  const temporada = temporadaAtual()

  const [{ data: rodadas }, { data: elenco }, { data: ultima }, { data: lances }] = await Promise.all([
    supabase.from('rodadas').select('*').neq('status', 'encerrada').order('data'),
    supabase.from('profiles').select('*').order('ativo', { ascending: false }).order('nome'),
    supabase.from('rodadas').select('numero').eq('temporada', temporada).order('numero', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('v_ranking_temporada').select('jogador_id, jogos, gols, assist'),
  ])
  const comLance = new Set((lances ?? []).filter((l) => l.jogos || l.gols || l.assist).map((l) => l.jogador_id as string))

  return (
    <main className="screen">
      <div className="row">
        <Link href="/" className="icon-btn" aria-label="Voltar"><IconVoltar /></Link>
        <div className="col">
          <h1 className="title" style={{ fontSize: 30 }}>GESTÃO</h1>
          <span className="s13 mut">Jogadores, rodadas e regras do grupo</span>
        </div>
      </div>
      <AdminView
        abaInicial={aba === 'rodadas' || aba === 'config' ? aba : 'elenco'}
        meuId={perfil.id}
        souPresidente={perfil.papel === 'presidente'}
        config={config}
        rodadas={rodadas ?? []}
        elenco={(elenco ?? []) as Perfil[]}
        comLance={[...comLance]}
        proximoNumero={(ultima?.numero ?? 0) + 1}
        temporada={temporada}
      />
    </main>
  )
}
