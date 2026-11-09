'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { erroMsg } from '@/lib/util'

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
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function alternar() {
    setSalvando(true)
    setErro(null)
    const supabase = createClient()
    const { error } = confirmado
      ? await supabase.from('presencas').delete().eq('rodada_id', rodadaId).eq('jogador_id', jogadorId)
      : await supabase.from('presencas').insert({ rodada_id: rodadaId, jogador_id: jogadorId })
    setSalvando(false)
    if (error) return setErro(erroMsg(error))
    startTransition(() => router.refresh())
  }

  const ocupado = salvando || pendente
  return (
    <div className="col gap-4">
      <button
        className="btn full"
        onClick={alternar}
        disabled={ocupado || (!confirmado && lotado)}
        style={{ background: '#0B0B0A', color: confirmado ? '#F5F5F0' : '#FDE819', borderColor: '#0B0B0A' }}
      >
        {ocupado ? 'Salvando…' : confirmado ? 'Presença confirmada · cancelar' : lotado ? 'Lista cheia' : 'Confirmar presença'}
      </button>
      {erro && <span className="small" style={{ color: '#7A1F00', fontWeight: 600 }}>{erro}</span>}
    </div>
  )
}
