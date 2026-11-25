import type { Metadata, Viewport } from 'next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import { getConfigPublica, logoDe } from '@/lib/config'
import './globals.css'

const body = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' })
const cond = Barlow_Condensed({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-cond' })

export async function generateMetadata(): Promise<Metadata> {
  const c = await getConfigPublica()
  return {
    title: c.nome_grupo,
    description: `Rodadas, ranking, craque da rodada e caixa do ${c.nome_grupo}.`,
    icons: { icon: logoDe(c) },
    robots: { index: false, follow: false },
    appleWebApp: { capable: true, title: c.nome_grupo, statusBarStyle: 'black-translucent' },
  }
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
