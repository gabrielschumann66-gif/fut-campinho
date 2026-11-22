import BottomNav from '@/components/BottomNav'
import { getContexto } from '@/lib/dados'
import { isAdmin } from '@/lib/util'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await getContexto()
  return (
    <div className="app">
      {children}
      <BottomNav admin={isAdmin(perfil.papel)} />
    </div>
  )
}
