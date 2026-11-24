import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { getConfig, getContexto } from '@/lib/dados'
import { isAdmin } from '@/lib/util'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ perfil }, config] = await Promise.all([getContexto(), getConfig()])
  // Primeiro acesso: o presidente configura o grupo; todo mundo passa pelo onboarding
  if (perfil.papel === 'presidente' && !config.configurado_em) redirect('/configurar')
  if (!perfil.onboarding_em) redirect('/bem-vindo')
  return (
    <div className="app">
      {children}
      <BottomNav admin={isAdmin(perfil.papel)} />
    </div>
  )
}
