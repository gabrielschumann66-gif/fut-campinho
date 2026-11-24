import { redirect } from 'next/navigation'
import { getConfig, getContexto } from '@/lib/dados'
import { nomeExibicao, precisaOnboarding, type Perfil } from '@/lib/util'
import ConfigurarGrupo from './ConfigurarGrupo'

export default async function Configurar() {
  const [{ supabase, perfil }, config] = await Promise.all([getContexto(), getConfig()])
  if (perfil.papel !== 'presidente') redirect('/')

  const { data } = await supabase.from('profiles').select('*').eq('ativo', true).order('nome')
  const elenco = ((data ?? []) as Perfil[]).map((p) => ({
    id: p.id,
    nome: nomeExibicao(p),
    nomeCompleto: p.nome,
    apelido: p.apelido,
    telefone: p.telefone,
    papel: p.papel,
    entrou: !!p.user_id,
  }))

  return <ConfigurarGrupo config={config} eu={{ id: perfil.id, onboarding: !precisaOnboarding(perfil) }} elenco={elenco} />
}
