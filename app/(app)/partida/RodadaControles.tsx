'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { erroMsg } from '@/lib/util'

export default function RodadaControles({ rodadaId, status, temAoVivo }: { rodadaId: number; status: string; temAoVivo: boolean }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function mudar(novo: 'em_andamento' | 'encerrada') {
    if (novo === 'encerrada' && !confirm('Encerrar a rodada? O craque será definido com os pontos atuais.')) return
    setOcupado(true)
    setErro(null)
    const { error } = await createClient().from('rodadas').update({ status: novo }).eq('id', rodadaId)
    setOcupado(false)
    if (error) return setErro(erroMsg(error))
    router.refresh()
  }

  return (
    <div className="col gap-4">
      {status === 'agendada' ? (
        <button className="btn yel full" disabled={ocupado} onClick={() => mudar('em_andamento')}>
          Iniciar rodada
        </button>
      ) : (
        <button className="btn full" disabled={ocupado || temAoVivo} onClick={() => mudar('encerrada')}>
          {temAoVivo ? 'Encerre o jogo ao vivo para fechar a rodada' : 'Encerrar rodada'}
        </button>
      )}
      {erro && <span className="erro">{erro}</span>}
    </div>
  )
}
