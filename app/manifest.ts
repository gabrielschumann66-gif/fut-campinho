import type { MetadataRoute } from 'next'
import { getConfigPublica } from '@/lib/config'

/** Faz o site virar app na tela de início (Android instala; iPhone usa "Adicionar à Tela de Início"). */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const c = await getConfigPublica()
  return {
    id: '/',
    name: c.nome_grupo,
    short_name: c.nome_grupo.length > 12 ? c.nome_grupo.split(' ')[0] : c.nome_grupo,
    description: `Rodadas, ranking, craque da rodada e caixa do ${c.nome_grupo}.`,
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B0B0A',
    theme_color: '#0B0B0A',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
