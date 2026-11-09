import type { Metadata, Viewport } from 'next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import './globals.css'

const body = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' })
const cond = Barlow_Condensed({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-cond' })

export const metadata: Metadata = {
  title: 'Fut Campinho',
  description: 'Rodadas, ranking, craque da segunda e caixa do Fut Campinho.',
  icons: { icon: '/escudo.svg' },
  appleWebApp: { capable: true, title: 'Fut Campinho', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  themeColor: '#0B0B0A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${body.variable} ${cond.variable}`}>
      <body>{children}</body>
    </html>
  )
}
