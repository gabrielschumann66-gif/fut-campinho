export type Papel = 'jogador' | 'capitao' | 'financeiro' | 'presidente'
export type Nivel = 'bronze' | 'prata' | 'ouro'

export type Perfil = {
  id: string
  nome: string
  apelido: string | null
  posicao: string
  papel: Papel
  mensalista: boolean
  ativo: boolean
}

export type Stats = {
  jogador_id: string
  nome: string
  v: number
  e: number
  d: number
  jogos: number
  gols: number
  assist: number
  pts: number
  rodadas?: number
}

export const PAPEL_LABEL: Record<Papel, string> = {
  jogador: 'Jogador',
  capitao: 'Capitão',
  financeiro: 'Financeiro',
  presidente: 'Presidente',
}

export const isAdmin = (p?: Papel | null) => p === 'capitao' || p === 'presidente'
export const isFinanceiro = (p?: Papel | null) => p === 'financeiro' || p === 'presidente'

export const nomeExibicao = (p: Pick<Perfil, 'nome' | 'apelido'>) => (p.apelido?.trim() ? p.apelido.trim() : p.nome)

export const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export const primeiroNome = (nome: string) => nome.split(/\s+/)[0] ?? nome

/** Nível da carta do craque pelos pontos na rodada. */
export const nivelRodada = (pts: number): Nivel => (pts >= 15 ? 'ouro' : pts >= 9 ? 'prata' : 'bronze')

/** Overall a partir de pontos (rodada ou média por rodada). */
export const overall = (pts: number) => Math.min(99, Math.max(40, Math.round(61 + pts * 1.25)))

/** Nível da carta do perfil pelo overall da temporada. */
export const nivelOverall = (ovr: number): Nivel => (ovr >= 83 ? 'ouro' : ovr >= 75 ? 'prata' : 'bronze')

export const TIER: Record<Nivel, { label: string; bg: string; fg: string }> = {
  bronze: { label: 'Bronze', bg: 'linear-gradient(160deg, #F2C49B, #C9834A 45%, #7A4A22)', fg: '#1C0F05' },
  prata: { label: 'Prata', bg: 'linear-gradient(160deg, #F4F6F8, #C9CED6 45%, #8A9099)', fg: '#15181C' },
  ouro: { label: 'Ouro', bg: 'linear-gradient(160deg, #FFF6A0, #FDE819 40%, #C99A00)', fg: '#1A1400' },
}

export const CORES_TIME = [
  { nome: 'Laranja', hex: '#FD6201' },
  { nome: 'Branco', hex: '#F5F5F0' },
  { nome: 'Preto', hex: '#0B0B0A' },
  { nome: 'Azul', hex: '#2F6FED' },
  { nome: 'Verde', hex: '#22A355' },
  { nome: 'Vermelho', hex: '#E03131' },
  { nome: 'Amarelo', hex: '#FDE819' },
]
export const corHex = (nome: string) => CORES_TIME.find((c) => c.nome === nome)?.hex ?? '#A3A39B'

const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

/** 'YYYY-MM-DD' -> Date local (sem deslocamento de fuso). */
export const parseData = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const ddmm = (s: string) => {
  const d = parseData(s)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}
export const diaSemana = (s: string) => DIAS[parseData(s).getDay()]
export const hhmm = (t: string) => t.slice(0, 5).replace(':', 'h')

export const fmt1 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const brl = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export const pontosDe = (s: Pick<Stats, 'v' | 'e' | 'gols' | 'assist'>) => s.v * 3 + s.e + s.gols * 2 + s.assist

export const ordenarRanking = <T extends Stats>(lista: T[]) =>
  [...lista].sort((a, b) => b.pts - a.pts || b.v - a.v || b.gols - a.gols || a.nome.localeCompare(b.nome))

export const hojeISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const erroMsg = (e: unknown) =>
  e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Algo deu errado.'
