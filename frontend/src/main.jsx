import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Versi baru tersedia. Muat ulang sekarang?')) {
      updateSW(true)
    }
  },
  onOfflineReady() { console.log('✅ Aplikasi siap digunakan offline') },
  onRegistered(r)  { console.log('✅ Service Worker registered:', r) },
  onRegisterError(err) { console.error('❌ Service Worker error:', err) }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
