/** O app usa sempre a marca Fut Campinho (amarelo, laranja e preto). Só o fundo da arte do craque muda por grupo. */
export const CORES_ARTE = [
  { nome: 'Laranja', hex: '#FD6201', fg: '#0B0B0A' },
  { nome: 'Amarelo', hex: '#FDE819', fg: '#0B0B0A' },
  { nome: 'Preto', hex: '#0B0B0A', fg: '#F5F5F0' },
  { nome: 'Verde', hex: '#22A355', fg: '#0B0B0A' },
  { nome: 'Azul', hex: '#2F6FED', fg: '#F5F5F0' },
  { nome: 'Vermelho', hex: '#E03131', fg: '#F5F5F0' },
  { nome: 'Roxo', hex: '#7C3AED', fg: '#F5F5F0' },
  { nome: 'Branco', hex: '#F5F5F0', fg: '#0B0B0A' },
]
export const corArte = (hex?: string | null) => CORES_ARTE.find((c) => c.hex.toLowerCase() === (hex ?? '').toLowerCase()) ?? CORES_ARTE[0]
