'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconCaixa, IconEstrela, IconInicio, IconMais, IconPessoa, IconTrofeu } from './icons'

const ITENS = [
  { href: '/', label: 'Início', Icon: IconInicio },
  { href: '/ranking', label: 'Ranking', Icon: IconTrofeu },
  { href: '/craque', label: 'Craque', Icon: IconEstrela },
  { href: '/caixa', label: 'Caixa', Icon: IconCaixa },
  { href: '/perfil', label: 'Perfil', Icon: IconPessoa },
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <nav className="nav" aria-label="Navegação principal">
      <div className="nav-pill">
        {ITENS.map(({ href, label, Icon }) => {
          const on = href === '/' ? path === '/' : path.startsWith(href)
          return (
            <Link key={href} href={href} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>
              <Icon />
              {label}
            </Link>
          )
        })}
      </div>
      <Link href="/partida" className="fab" aria-label="Partida ao vivo">
        <IconMais />
      </Link>
    </nav>
  )
}
