'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconBola, IconEstrela, IconInicio, IconMais, IconPessoa, IconTrofeu } from './icons'

const ITENS = [
  { href: '/', label: 'Início', Icon: IconInicio },
  { href: '/ranking', label: 'Ranking', Icon: IconTrofeu },
  { href: '/partida', label: 'Jogos', Icon: IconBola },
  { href: '/craque', label: 'Craque', Icon: IconEstrela },
  { href: '/perfil', label: 'Perfil', Icon: IconPessoa },
]

export default function BottomNav({ admin }: { admin: boolean }) {
  const path = usePathname()
  return (
    <nav className="nav" aria-label="Navegação principal">
      <div className="nav-pill">
        {ITENS.map(({ href, label, Icon }) => {
          const on =
            href === '/' ? path === '/' : href === '/perfil' ? path === '/perfil' : href === '/partida' ? path.startsWith('/partida') && !path.startsWith('/partida/nova') : path.startsWith(href)
          return (
            <Link key={href} href={href} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>
              <Icon size={22} />
              {label}
            </Link>
          )
        })}
      </div>
      {admin && (
        <Link href="/partida/nova" className="fab" aria-label="Registrar jogo">
          <IconMais size={28} stroke={2.8} />
        </Link>
      )}
    </nav>
  )
}
