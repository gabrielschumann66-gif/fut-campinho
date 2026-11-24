'use client'

import { useState } from 'react'
import Avatar, { IDS_TEMA, TEMAS_AVATAR, ehFoto } from '@/components/Avatar'
import { createClient } from '@/lib/supabase/client'
import { erroMsg } from '@/lib/util'

/** Corta a foto em quadrado e reduz para 480px (sobe rápido e fica leve no ranking). */
async function prepararFoto(f: File): Promise<Blob> {
  const img = await createImageBitmap(f)
  const lado = Math.min(img.width, img.height)
  const tam = Math.min(480, lado)
  const c = document.createElement('canvas')
  c.width = tam
  c.height = tam
  c.getContext('2d')!.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, tam, tam)
  return new Promise((ok, falha) => c.toBlob((b) => (b ? ok(b) : falha(new Error('Não deu para ler a foto.'))), 'image/jpeg', 0.85))
}

/** Escolha do avatar: cor das iniciais ou foto. O valor vai em profiles.avatar. */
export default function EscolherAvatar({
  perfilId,
  nome,
  valor,
  onChange,
}: {
  perfilId: string
  nome: string
  valor: string | null
  onChange: (v: string | null) => void
}) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const foto = ehFoto(valor)

  async function enviar(f?: File) {
    if (!f) return
    if (!f.type.startsWith('image/')) return setErro('Escolha uma imagem.')
    setEnviando(true)
    setErro(null)
    try {
      const blob = await prepararFoto(f)
      const caminho = `${perfilId}/foto-${Date.now()}.jpg`
      const supabase = createClient()
      const { error } = await supabase.storage.from('avatares').upload(caminho, blob, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      onChange(supabase.storage.from('avatares').getPublicUrl(caminho).data.publicUrl)
    } catch (e) {
      setErro(erroMsg(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="col gap-12">
      <div className="col" style={{ alignItems: 'center', gap: 10 }}>
        <Avatar id={valor} nome={nome} size={112} borda="var(--yel)" />
        <label className="btn yel" style={{ minWidth: 200 }}>
          {enviando ? 'Enviando foto…' : foto ? 'Trocar foto' : 'Subir uma foto'}
          <input type="file" accept="image/*" hidden disabled={enviando} onChange={(e) => enviar(e.target.files?.[0])} />
        </label>
        {foto && (
          <button className="small mut" style={{ background: 'none', border: 'none' }} onClick={() => onChange(null)}>
            Tirar a foto e usar as iniciais
          </button>
        )}
      </div>
      {erro && <span className="erro" role="alert">{erro}</span>}
      <div className="field">
        Ou escolha a cor das suas iniciais
        <div className="onb-avatares" role="radiogroup" aria-label="Cor das iniciais">
          {IDS_TEMA.map((t) => {
            const on = valor === `tema:${t}`
            return (
              <button
                key={t}
                role="radio"
                aria-checked={on}
                aria-label={TEMAS_AVATAR[t].nome}
                className={`onb-avatar${on ? ' on' : ''}`}
                onClick={() => onChange(`tema:${t}`)}
              >
                <Avatar id={`tema:${t}`} nome={nome} size={60} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
