import { useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'

export function usePWAInstall() {
  const { installPrompt, setInstallPrompt, clearInstallPrompt } = useUIStore()

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [setInstallPrompt])

  const promptInstall = async () => {
    if (!installPrompt) return false
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') { clearInstallPrompt(); return true }
    return false
  }

  return { canInstall: !!installPrompt, promptInstall }
}
