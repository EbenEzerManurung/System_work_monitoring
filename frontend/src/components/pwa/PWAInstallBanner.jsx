import { Download, X } from 'lucide-react'
import { useState } from 'react'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import Button from '@/components/ui/Button'

export default function PWAInstallBanner() {
  const { canInstall, promptInstall } = usePWAInstall()
  const [dismissed, setDismissed] = useState(false)

  if (!canInstall || dismissed) return null

  const handleInstall = async () => {
    const ok = await promptInstall()
    if (ok) setDismissed(true)
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-tosca-900 text-white shadow-2xl border border-tosca-700">
        <div className="w-9 h-9 rounded-xl bg-tosca-500 flex items-center justify-center">
          <Download className="w-4 h-4" />
        </div>
        <div className="text-sm">
          <div className="font-semibold">Install WorkMonitor</div>
          <div className="text-[11px] text-tosca-300">Akses cepat dari home screen</div>
        </div>
        <Button size="sm" variant="primary" onClick={handleInstall}>Install</Button>
        <button onClick={() => setDismissed(true)} className="p-1 rounded-lg hover:bg-tosca-800 text-tosca-300">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
