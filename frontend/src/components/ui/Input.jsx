import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef(({ className, label, error, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-ink-700 mb-1.5">{label}</label>}
    <input
      ref={ref}
      className={cn(
        'w-full h-10 px-3 rounded-lg border border-ink-200 bg-white text-sm',
        'placeholder:text-ink-400 focus:outline-none focus:border-tosca-500 focus:ring-2 focus:ring-tosca-500/20',
        error && 'border-red-400',
        className
      )}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
))
Input.displayName = 'Input'
