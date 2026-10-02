import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-6xl font-bold text-tosca-600">404</h1>
      <p className="mt-2 text-ink-500">Halaman tidak ditemukan</p>
      <Button className="mt-6" onClick={() => navigate('/')}>Kembali ke Dashboard</Button>
    </div>
  )
}
