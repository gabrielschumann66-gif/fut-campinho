'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { erroMsg, hojeISO } from '@/lib/util'

/** Um toque: cria (se preciso) e começa a rodada de hoje. */
export default function IniciarRodada({
  agendadaId,
  proximoNumero,
  temporada,
  horario,
  local,
  rotulo,
}: {
  agendadaId: number | null
  proximoNumero: number
  temporada: number
  horario: string
  local: string
  rotulo?: string
}) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function iniciar() {
    setOcupado(true)
    setErro(null)
    const supabase = createClient()
    const { error } = agendadaId
      ? await supabase.from('rodadas').update({ status: 'em_andamento' }).eq('id', agendadaId)
      : await supabase.from('rodadas').insert({ temporada, numero: proximoNumero, data: hojeISO(), horario, local, status: 'em_andamento' })
    setOcupado(false)
    if (error) return setErro(erroMsg(error))
    router.refresh()
  }

  return (
    <div className="col gap-4">
      <button className="btn yel full" style={{ height: 56, fontSize: 16 }} disabled={ocupado} onClick={iniciar}>
        {ocupado ? 'Começando…' : rotulo ?? (agendadaId ? 'Começar a rodada' : 'Começar a rodada de hoje')}
      </button>
      {erro && <span className="erro">{erro}</span>}
    </div>
  )
}
