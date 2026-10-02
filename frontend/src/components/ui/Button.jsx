import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary: 'bg-tosca-600 text-white hover:bg-tosca-700 shadow-sm',
  secondary: 'bg-white text-ink-700 border border-ink-200 hover:bg-ink-50',
  ghost: 'text-ink-600 hover:bg-ink-100',
  danger: 'bg-red-500 text-white hover:bg-red-600'
}
const SIZES = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base'
}

export default function Button({
  variant = 'primary', size = 'md', className,
  loading, disabled, children, ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-tosca-500/30',
        VARIANTS[variant], SIZES[size], className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
