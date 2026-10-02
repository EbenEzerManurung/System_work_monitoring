import { cn } from '@/lib/utils'
import { OBJECTIVES } from '@/lib/utils'
import { Check } from 'lucide-react'

export default function ObjectivePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
      {OBJECTIVES.map((obj) => {
        const isSelected = value === obj.value
        return (
          <button
            key={obj.value}
            type="button"
            onClick={() => onChange(obj.value)}
            className={cn(
              'relative p-3 rounded-xl border-2 text-left transition-all',
              isSelected
                ? 'border-tosca-500 bg-tosca-50 shadow-sm'
                : 'border-ink-200 bg-white hover:border-tosca-300 hover:bg-tosca-50/30'
            )}
          >
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-tosca-600 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </div>
            )}
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: obj.dotColor }}
              />
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-600">
                {obj.label}
              </span>
            </div>
            <div className={cn(
              'text-2xl font-bold',
              isSelected ? 'text-tosca-700' : 'text-ink-800'
            )}>
              {obj.points}
              <span className="text-xs font-medium text-ink-400 ml-0.5">SP</span>
            </div>
            <div className="text-[10px] text-ink-500 mt-0.5 leading-tight">
              {obj.description}
            </div>
          </button>
        )
      })}
    </div>
  )
}
