export const colors = {
  primary: '#0066FF',
  primaryHover: '#0052CC',
  success: '#00D4AA',
  warning: '#FFB800',
  danger: '#FF4757',
  background: '#0F1117',
  surface: '#1A1D27',
  elevated: '#242836',
  border: '#2A2E3A',
  textPrimary: '#F1F3F5',
  textSecondary: '#8B8FA3',
  textMuted: '#5A5F73',
} as const

export const providerColors = {
  aws: '#FF9900',
  gcp: '#4285F4',
  azure: '#0078D4',
} as const

export const priorityColors = {
  critical: { text: '#FF4757', bg: 'rgba(255,71,87,0.12)', border: 'rgba(255,71,87,0.3)' },
  high:     { text: '#FF8C42', bg: 'rgba(255,140,66,0.12)', border: 'rgba(255,140,66,0.3)' },
  medium:   { text: '#FFB800', bg: 'rgba(255,184,0,0.12)', border: 'rgba(255,184,0,0.3)' },
  low:      { text: '#00D4AA', bg: 'rgba(0,212,170,0.12)', border: 'rgba(0,212,170,0.3)' },
} as const

export const cardStyles = {
  base: 'rounded-xl border backdrop-blur-sm',
  default: 'bg-[#1A1D27] border-[#2A2D3E]',
  glass: 'bg-[#1A1D27]/80 border-[#2A2D3E] backdrop-blur-md',
  elevated: 'bg-[#222535] border-[#2A2D3E]',
} as const
