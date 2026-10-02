import { cn, initials } from '@/lib/utils'

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base'
}

export default function Avatar({ name, src, size = 'sm', className }) {
  return (
    <div className={cn(
      'inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0',
      'bg-gradient-to-br from-tosca-500 to-tosca-700 ring-2 ring-white',
      SIZES[size], className
    )} title={name}>
      {src ? <img src={src} alt={name} className="w-full h-full rounded-full object-cover" />
           : initials(name)}
    </div>
  )
}
