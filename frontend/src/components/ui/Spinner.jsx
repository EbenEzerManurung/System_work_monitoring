import { Loader2 } from 'lucide-react'

export default function Spinner({ className = 'w-6 h-6', label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-ink-500">
      <Loader2 className={`${className} animate-spin text-tosca-600`} />
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
}
