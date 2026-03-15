import type { RiskLevel } from '@/types'

interface RiskScoreProps {
  score: number
  level: RiskLevel
  size?: 'sm' | 'md' | 'lg'
}

const LEVEL_COLOR: Record<RiskLevel, { ring: string; text: string; bg: string; label: string }> = {
  safe:     { ring: '#22c55e', text: 'text-green-400',  bg: 'bg-green-400/10',  label: 'SAFE'     },
  low:      { ring: '#facc15', text: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'LOW'      },
  medium:   { ring: '#fb923c', text: 'text-orange-400', bg: 'bg-orange-400/10', label: 'MEDIUM'   },
  high:     { ring: '#f87171', text: 'text-red-400',    bg: 'bg-red-400/10',    label: 'HIGH'     },
  critical: { ring: '#dc2626', text: 'text-red-600',    bg: 'bg-red-600/10',    label: 'CRITICAL' },
}

const SIZES = {
  sm: { outer: 64,  stroke: 5,  fontSize: '14px', subSize: '10px' },
  md: { outer: 96,  stroke: 7,  fontSize: '20px', subSize: '11px' },
  lg: { outer: 128, stroke: 9,  fontSize: '28px', subSize: '13px' },
}

export default function RiskScore({ score, level, size = 'md' }: RiskScoreProps) {
  const { ring, text, bg, label } = LEVEL_COLOR[level]
  const { outer, stroke, fontSize, subSize } = SIZES[size]

  const r = (outer - stroke) / 2
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference - (score / 100) * circumference

  return (
    <div className={`flex flex-col items-center gap-1`}>
      <div className={`rounded-full p-1 ${bg}`} style={{ width: outer + 8, height: outer + 8 }}>
        <svg width={outer} height={outer} className="rotate-[-90deg]">
          {/* Background ring */}
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={r}
            fill="none"
            stroke="#374151"
            strokeWidth={stroke}
          />
          {/* Progress ring */}
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={r}
            fill="none"
            stroke={ring}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
          {/* Score text (rotate back to normal) */}
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(90, ${outer / 2}, ${outer / 2})`}
            fill={ring}
            style={{ fontSize, fontWeight: 700, fontFamily: 'monospace' }}
          >
            {score}
          </text>
        </svg>
      </div>
      <span className={`text-xs font-bold tracking-widest ${text}`}>{label}</span>
    </div>
  )
}
