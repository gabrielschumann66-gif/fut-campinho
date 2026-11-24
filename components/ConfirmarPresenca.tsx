'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { erroMsg } from '@/lib/util'

/** Confirma/cancela presença com resposta imediata na tela (o servidor confirma em seguida). */
export default function ConfirmarPresenca({
  rodadaId,
  jogadorId,
  confirmado,
  lotado,
}: {
  rodadaId: number
  jogadorId: string
  confirmado: boolean
  lotado: boolean
}) {
  const router = useRouter()
  const [pendente, startTransition] = useTransition()
  const [otimista, setOtimista] = useOptimistic(confirmado)
  const [erro, setErro] = useState<string | null>(null)

  function alternar() {
    setErro(null)
    const novo = !otimista
    startTransition(async () => {
      setOtimista(novo)
      const supabase = createClient()
      const { error } = novo
        ? await supabase.from('presencas').insert({ rodada_id: rodadaId, jogador_id: jogadorId })
        : await supabase.from('presencas').delete().eq('rodada_id', rodadaId).eq('jogador_id', jogadorId)
      if (error) {
        setErro(erroMsg(error))
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="col gap-4">
      <button
        className="btn dark seta full"
        onClick={alternar}
        disabled={pendente || (!otimista && lotado)}
        aria-pressed={otimista}
        style={{ opacity: 1, color: otimista ? '#F5F5F0' : 'var(--yel)' }}
      >
        <span className="col" style={{ alignItems: 'flex-start', lineHeight: 1 }}>
          {otimista ? 'Presença confirmada' : lotado ? 'Lista cheia' : 'Confirmar presença'}
          {otimista && <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, textTransform: 'none', opacity: 0.6, marginTop: 3 }}>toque para cancelar</span>}
        </span>
        <span className="bola" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            {otimista ? <path d="M5 12.5 10 17l9-10" /> : <path d="M12 5v14M5 12h14" />}
          </svg>
        </span>
      </button>
      {erro && <span className="s13" style={{ color: '#7A1F00', fontWeight: 700 }}>{erro}</span>}
    </div>
  )
}
