import { useState, forwardRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  User, Mail, Lock, Eye, EyeOff, Save, Shield,
  Building2, Award, AlertCircle
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'

const profileSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  email: z.string().email('Email tidak valid')
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Password lama wajib diisi'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
  confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi')
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirmPassword']
})

const PasswordInput = forwardRef(({ className, label, error, ...props }, ref) => {
  const [show, setShow] = useState(false)
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-ink-700 mb-1.5">{label}</label>}
      <div className="relative">
        <input
          ref={ref}
          type={show ? 'text' : 'password'}
          className={cn(
            'w-full h-10 pl-3 pr-10 rounded-lg border border-ink-200 bg-white text-sm',
            'placeholder:text-ink-400 focus:outline-none focus:border-tosca-500 focus:ring-2 focus:ring-tosca-500/20',
            error && 'border-red-400',
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-400 hover:text-tosca-600 hover:bg-tosca-50 transition"
          tabIndex={-1}
          title={show ? 'Sembunyikan' : 'Tampilkan'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
})
PasswordInput.displayName = 'PasswordInput'

export default function ProfilePage() {
  const { user, updateProfile } = useAuthStore()
  const [tab, setTab] = useState('profile')

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', email: user?.email || '' }
  })

  const onSubmitProfile = async (values) => {
    try {
      await updateProfile(values)
      toast.success('Profil berhasil diperbarui!')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' }
  })

  const onSubmitPassword = async (values) => {
    try {
      await updateProfile({ password: values.newPassword })
      passwordForm.reset()
      toast.success('Password berhasil diubah!')
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink-800">Profil Saya</h1>
        <p className="text-sm text-ink-500 mt-1">Kelola informasi akun dan keamanan Anda</p>
      </div>

      <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="relative">
            <Avatar name={user?.name} size="lg" className="!w-20 !h-20 !text-2xl" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-ink-800 truncate">{user?.name}</h2>
            <p className="text-sm text-ink-500 truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge color="tosca"><Shield className="w-3 h-3" /><span className="capitalize">{user?.role || 'member'}</span></Badge>
              {user?.position && <Badge color="blue"><Award className="w-3 h-3" />{user.position}</Badge>}
              {user?.department_id && <Badge color="purple"><Building2 className="w-3 h-3" />Dept #{user.department_id}</Badge>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-ink-100 rounded-xl mb-6 w-fit">
        <button onClick={() => setTab('profile')} className={cn('px-5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2', tab === 'profile' ? 'bg-white text-tosca-700 shadow-sm' : 'text-ink-600 hover:text-ink-800')}>
          <User className="w-4 h-4" /> Informasi Profil
        </button>
        <button onClick={() => setTab('security')} className={cn('px-5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2', tab === 'security' ? 'bg-white text-tosca-700 shadow-sm' : 'text-ink-600 hover:text-ink-800')}>
          <Lock className="w-4 h-4" /> Keamanan
        </button>
      </div>

      {tab === 'profile' && (
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6 lg:p-8">
          <h3 className="font-semibold text-ink-800 mb-1">Informasi Pribadi</h3>
          <p className="text-sm text-ink-500 mb-6">Perbarui nama dan alamat email Anda</p>

          <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-5">
            <Input label="Nama Lengkap" placeholder="cth: Budi Santoso" error={profileForm.formState.errors.name?.message} {...profileForm.register('name')} />
            <Input label="Email" type="email" placeholder="nama@company.co.id" error={profileForm.formState.errors.email?.message} {...profileForm.register('email')} />

            <div className="p-4 rounded-xl bg-tosca-50 border border-tosca-100 flex gap-3">
              <AlertCircle className="w-5 h-5 text-tosca-600 shrink-0 mt-0.5" />
              <div className="text-xs text-tosca-700">
                <strong>Catatan:</strong> Perubahan email akan mempengaruhi cara Anda login.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={profileForm.formState.isSubmitting}>
                <Save className="w-4 h-4" /> Simpan Perubahan
              </Button>
            </div>
          </form>
        </div>
      )}

      {tab === 'security' && (
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6 lg:p-8">
          <h3 className="font-semibold text-ink-800 mb-1">Ubah Password</h3>
          <p className="text-sm text-ink-500 mb-6">Gunakan password yang kuat dan tidak digunakan di situs lain</p>

          <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-5 max-w-lg">
            <PasswordInput label="Password Lama" placeholder="Masukkan password saat ini" error={passwordForm.formState.errors.currentPassword?.message} {...passwordForm.register('currentPassword')} />
            <PasswordInput label="Password Baru" placeholder="Minimal 6 karakter" error={passwordForm.formState.errors.newPassword?.message} {...passwordForm.register('newPassword')} />
            <PasswordInput label="Konfirmasi Password Baru" placeholder="Ulangi password baru" error={passwordForm.formState.errors.confirmPassword?.message} {...passwordForm.register('confirmPassword')} />

            <div className="space-y-1.5">
              <div className="text-xs font-medium text-ink-600">Tips password kuat:</div>
              <ul className="text-xs text-ink-500 space-y-0.5 list-disc list-inside">
                <li>Minimal 8 karakter</li>
                <li>Kombinasi huruf besar & kecil</li>
                <li>Tambahkan angka dan simbol (!@#$%)</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={passwordForm.formState.isSubmitting}>
                <Lock className="w-4 h-4" /> Ubah Password
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
