type P = { size?: number; stroke?: number }

const base = (size: number, stroke: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: stroke,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export const IconInicio = ({ size = 18, stroke = 2 }: P) => (
  <svg {...base(size, stroke)}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)
export const IconTrofeu = ({ size = 18, stroke = 2 }: P) => (
  <svg {...base(size, stroke)}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
  </svg>
)
export const IconCaixa = ({ size = 18, stroke = 2 }: P) => (
  <svg {...base(size, stroke)}>
    <rect x="2" y="6" width="20" height="13" rx="2" />
    <path d="M2 10h20" />
  </svg>
)
export const IconPessoa = ({ size = 18, stroke = 2 }: P) => (
  <svg {...base(size, stroke)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
)
export const IconEstrela = ({ size = 18, stroke = 2 }: P) => (
  <svg {...base(size, stroke)}>
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />
  </svg>
)
export const IconMais = ({ size = 26, stroke = 2.6 }: P) => (
  <svg {...base(size, stroke)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IconVoltar = ({ size = 20, stroke = 2 }: P) => (
  <svg {...base(size, stroke)}>
    <path d="m15 18-6-6 6-6" />
  </svg>
)
export const IconSeta = ({ size = 20, stroke = 2 }: P) => (
  <svg {...base(size, stroke)}>
    <path d="m9 18 6-6-6-6" />
  </svg>
)
export const IconLapis = ({ size = 16, stroke = 2.2 }: P) => (
  <svg {...base(size, stroke)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)
export const IconEngrenagem = ({ size = 20, stroke = 2 }: P) => (
  <svg {...base(size, stroke)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
)
export const IconLivro = ({ size = 20, stroke = 2 }: P) => (
  <svg {...base(size, stroke)}>
    <path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2Zm0 0A2 2 0 0 0 6 22h14" />
  </svg>
)
export const IconUpload = ({ size = 18, stroke = 2.2 }: P) => (
  <svg {...base(size, stroke)}>
    <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </svg>
)
export const IconLixo = ({ size = 16, stroke = 2 }: P) => (
  <svg {...base(size, stroke)}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </svg>
)
