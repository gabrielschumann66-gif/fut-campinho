import { iniciais } from '@/lib/util'

/**
 * Avatar do jogador. Em profiles.avatar:
 * - "tema:<id>" → iniciais com as cores do tema escolhido
 * - "https://…" → foto enviada
 * - "/jogadores/…" → foto oficial do elenco, servida pelo próprio app
 * - vazio → iniciais no tema padrão
 */
export const TEMAS_AVATAR: Record<string, { nome: string; bg: string; fg: string }> = {
  amarelo: { nome: 'Amarelo', bg: '#FDE819', fg: '#0B0B0A' },
  laranja: { nome: 'Laranja', bg: '#FD6201', fg: '#0B0B0A' },
  preto: { nome: 'Preto', bg: '#0B0B0A', fg: '#FDE819' },
  fogo: { nome: 'Fogo', bg: 'linear-gradient(135deg, #FDE819 0%, #FD6201 100%)', fg: '#0B0B0A' },
  meio: { nome: 'Meio a meio', bg: 'linear-gradient(135deg, #FDE819 50%, #FD6201 50%)', fg: '#0B0B0A' },
  noite: { nome: 'Noite', bg: 'linear-gradient(160deg, #2A2A27, #0B0B0A)', fg: '#FD6201' },
  branco: { nome: 'Branco', bg: '#F5F5F0', fg: '#0B0B0A' },
  grafite: { nome: 'Grafite', bg: '#3A3A36', fg: '#F5F5F0' },
}
export const IDS_TEMA = Object.keys(TEMAS_AVATAR)

export const ehFoto = (v?: string | null) => !!v && (/^https?:\/\//.test(v) || v.startsWith('/jogadores/'))
export const temaDe = (v?: string | null) => (v?.startsWith('tema:') ? TEMAS_AVATAR[v.slice(5)] : undefined)

/** Moldura do top 3: 1 = ouro premium (com coroa), 2 = prata, 3 = bronze */
export type Moldura = 1 | 2 | 3
export const molduraDe = (posicao: number): Moldura | null => (posicao >= 0 && posicao < 3 ? ((posicao + 1) as Moldura) : null)

export default function Avatar({
  id,
  nome,
  size = 36,
  borda,
  moldura,
}: {
  id?: string | null
  nome: string
  size?: number
  borda?: string
  moldura?: Moldura | null
}) {
  const anel = borda && !moldura ? { boxShadow: `0 0 0 3px ${borda}` } : undefined
  let corpo: React.ReactNode
  if (ehFoto(id)) {
    corpo = (
      <span style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, display: 'inline-flex', background: 'var(--line)', ...anel }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={id!} alt={`Foto de ${nome}`} width={size} height={size} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </span>
    )
  } else {
    const t = temaDe(id)
    const preto = t?.bg === '#0B0B0A'
    corpo = (
      <span
        className="avatar"
        style={{
          width: size,
          height: size,
          fontSize: Math.max(11, size * 0.38),
          fontFamily: 'var(--font-cond)',
          letterSpacing: 0.5,
          ...(t ? { background: t.bg, color: t.fg } : null),
          ...(preto && !borda && !moldura ? { boxShadow: 'inset 0 0 0 1.5px #FDE819' } : null),
          ...anel,
        }}
        aria-hidden="true"
      >
        {iniciais(nome)}
      </span>
    )
  }
  if (!moldura) return corpo
  const tam = size <= 30 ? ' mini' : size <= 46 ? ' pq' : ''
  return (
    <span className={`mold m-${moldura}${tam}`} style={{ display: 'inline-flex', borderRadius: '50%', width: size, height: size }}>
      {corpo}
    </span>
  )
}
