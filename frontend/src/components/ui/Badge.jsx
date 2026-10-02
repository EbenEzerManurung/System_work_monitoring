import { cn } from '@/lib/utils'

const COLORS = {
  gray:   'bg-ink-100 text-ink-700',
  tosca:  'bg-tosca-100 text-tosca-700',
  green:  'bg-emerald-100 text-emerald-700',
  amber:  'bg-amber-100 text-amber-700',
  orange: 'bg-orange-100 text-orange-700',
  red:    'bg-red-100 text-red-700',
  blue:   'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  slate:  'bg-slate-100 text-slate-700'
}

export default function Badge({ color = 'gray', children, className }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      COLORS[color], className
    )}>
      {children}
    </span>
  )
}
