import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Minimal 6 karakter')
})

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loading } = useAuthStore()
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: 'budi.santoso@company.co.id', password: 'password123' }
  })

  const onSubmit = async (values) => {
    try {
      await login(values.email, values.password)
      toast.success('Login berhasil!')
      navigate('/')
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-tosca-50 via-white to-tosca-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-tosca-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-tosca-600/30">W</div>
          <h1 className="mt-4 text-2xl font-bold text-ink-800">WorkMonitor</h1>
          <p className="text-sm text-ink-500 mt-1">Masuk untuk melanjutkan</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-tosca-900/5 p-8 border border-ink-100">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input label="Email" type="email" placeholder="nama@company.co.id" error={errors.email?.message} {...register('email')} />
            <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
            <Button type="submit" className="w-full" size="lg" loading={loading}>Masuk</Button>
          </form>

          <div className="mt-6 p-3 rounded-lg bg-tosca-50 border border-tosca-100">
            <p className="text-xs text-tosca-700 text-center">
              <strong>Demo:</strong> budi.santoso@company.co.id / password123
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
