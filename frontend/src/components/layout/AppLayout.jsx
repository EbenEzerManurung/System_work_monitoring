import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import PWAInstallBanner from '@/components/pwa/PWAInstallBanner'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        <Outlet />
        <PWAInstallBanner />
      </main>
    </div>
  )
}
