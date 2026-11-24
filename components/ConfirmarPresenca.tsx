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
        className="btn full"
        onClick={alternar}
        disabled={pendente || (!otimista && lotado)}
        aria-pressed={otimista}
        style={{ height: 52, fontSize: 16, background: '#0B0B0A', color: otimista ? '#F5F5F0' : 'var(--yel)', borderColor: '#0B0B0A', opacity: 1 }}
      >
        {otimista ? '✓ Presença confirmada · toque para cancelar' : lotado ? 'Lista cheia' : 'Confirmar presença'}
      </button>
      {erro && <span className="s13" style={{ color: '#7A1F00', fontWeight: 700 }}>{erro}</span>}
    </div>
  )
}
