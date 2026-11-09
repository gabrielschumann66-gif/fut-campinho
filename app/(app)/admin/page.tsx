import Link from 'next/link'
import { redirect } from 'next/navigation'
import { IconVoltar } from '@/components/icons'
import { getConfig, getContexto, temporadaAtual } from '@/lib/dados'
import { isAdmin, type Perfil } from '@/lib/util'
import AdminView from './AdminView'

export default async function Admin() {
  const { supabase, perfil } = await getContexto()
  if (!isAdmin(perfil.papel)) redirect('/')
  const config = await getConfig()
  const temporada = temporadaAtual()

  const [{ data: rodadas }, { data: elenco }, { data: ultima }] = await Promise.all([
    supabase.from('rodadas').select('*').neq('status', 'encerrada').order('data'),
    supabase.from('profiles').select('*').order('ativo', { ascending: false }).order('nome'),
    supabase.from('rodadas').select('numero').eq('temporada', temporada).order('numero', { ascending: false }).limit(1).maybeSingle(),
  ])

  return (
    <main className="screen">
      <div className="row">
        <Link href="/" className="icon-btn" aria-label="Voltar"><IconVoltar /></Link>
        <h1 className="title" style={{ fontSize: 30 }}>ADMINISTRAÇÃO</h1>
      </div>
      <AdminView
        meuId={perfil.id}
        souPresidente={perfil.papel === 'presidente'}
        config={config}
        rodadas={rodadas ?? []}
        elenco={(elenco ?? []) as Perfil[]}
        proximoNumero={(ultima?.numero ?? 0) + 1}
        temporada={temporada}
      />
    </main>
  )
}
