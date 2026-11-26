'use client'

import { useEffect } from 'react'

type PromptInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

declare global {
  interface Window {
    __instalar?: PromptInstalar | null
  }
}

/**
 * Registra o service worker e guarda o convite de instalação do Android
 * (o Chrome dispara esse evento uma vez só, logo ao abrir a página).
 */
export default function RegistrarApp() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
    const guardar = (e: Event) => {
      e.preventDefault()
      window.__instalar = e as PromptInstalar
      window.dispatchEvent(new Event('instalar-pronto'))
    }
    const instalado = () => {
      window.__instalar = null
      window.dispatchEvent(new Event('app-instalado'))
    }
    window.addEventListener('beforeinstallprompt', guardar)
    window.addEventListener('appinstalled', instalado)
    return () => {
      window.removeEventListener('beforeinstallprompt', guardar)
      window.removeEventListener('appinstalled', instalado)
    }
  }, [])
  return null
}
