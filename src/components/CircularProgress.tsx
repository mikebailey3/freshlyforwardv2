interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  label?: string
}

export function CircularProgress({ value, size = 80, strokeWidth = 8, label = 'Complete' }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))

  const colorClass = clamped >= 80 ? 'text-success-500' : clamped >= 50 ? 'text-warning-500' : 'text-error-500'
  const textColorClass = clamped >= 80 ? 'text-success-600' : clamped >= 50 ? 'text-warning-600' : 'text-error-600'

  return (
    <div className="relative" style={{ height: size, width: size }}>
      <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          className="text-neutral-100"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
          strokeLinecap="round"
          className={`${colorClass} transition-all duration-700`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-serif font-bold ${textColorClass}`} style={{ fontSize: size * 0.24 }}>
          {clamped}%
        </span>
        {label && <span className="text-neutral-500" style={{ fontSize: size * 0.09 }}>{label}</span>}
      </div>
    </div>
  )
}
