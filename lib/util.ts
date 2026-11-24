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
  telefone: string | null
  login_liberado: boolean
  user_id: string | null
  avatar: string | null
  onboarding_em: string | null
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
  defesas?: number
  rodadas?: number
  avatar?: string | null
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

/** Pontuação de cada lance (igual à view v_stats_rodada no banco). */
export const PONTOS = { vitoria: 4, empate: 2, gol: 8, assist: 5, defesa: 2 } as const

/** Faixas da carta do craque pelos pontos na rodada. */
export const FAIXA_RODADA = { prata: 30, ouro: 60 } as const
export const nivelRodada = (pts: number): Nivel => (pts >= FAIXA_RODADA.ouro ? 'ouro' : pts >= FAIXA_RODADA.prata ? 'prata' : 'bronze')

/** Overall a partir de pontos (rodada ou média por rodada). */
export const overall = (pts: number) => Math.min(99, Math.max(40, Math.round(61 + pts * 0.4)))

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

export const pontosDe = (s: Pick<Stats, 'v' | 'e' | 'gols' | 'assist'> & { defesas?: number }) =>
  s.v * PONTOS.vitoria + s.e * PONTOS.empate + s.gols * PONTOS.gol + s.assist * PONTOS.assist + (s.defesas ?? 0) * PONTOS.defesa

export const ordenarRanking = <T extends Stats>(lista: T[]) =>
  [...lista].sort((a, b) => b.pts - a.pts || b.v - a.v || b.gols - a.gols || a.nome.localeCompare(b.nome))

export const hojeISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const erroMsg = (e: unknown) =>
  e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Algo deu errado.'

/** Só dígitos, com 55 na frente (igual ao banco). */
export const normalizarTelefone = (t: string) => {
  const d = t.replace(/\D/g, '')
  return d.length === 10 || d.length === 11 ? `55${d}` : d
}

/** (21) 98765-4321 */
export const formatarTelefone = (t?: string | null) => {
  if (!t) return ''
  const d = t.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return t
}

/** Máscara enquanto digita */
export const mascaraTelefone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** A conta de login usa um e-mail interno derivado do telefone (ninguém precisa saber dele). */
export const emailDoTelefone = (t: string) => `${normalizarTelefone(t)}@fut.gabrielschumann.com.br`

/**
 * Versão do onboarding. Quem concluiu antes desta data passa pelo tour de novo no próximo acesso
 * (foto, posição e apelido vêm preenchidos; nada se perde). Mude a data para mostrar o tour a todos outra vez.
 */
export const ONBOARDING_VERSAO = '2026-11-24T22:00:00Z'
export const precisaOnboarding = (p: { onboarding_em: string | null }) =>
  !p.onboarding_em || new Date(p.onboarding_em).getTime() < new Date(ONBOARDING_VERSAO).getTime()
