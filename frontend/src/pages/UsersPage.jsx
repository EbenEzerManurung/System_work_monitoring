import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Search, Edit, Trash2, Users, Download, Eye, EyeOff,
  ChevronLeft, ChevronRight // ⭐ Tambahan ikon untuk pagination
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { exportToExcel } from '@/lib/exportExcel'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'

const ROLE_COLOR = {
  admin: 'red',
  manager: 'amber',
  member: 'tosca',
  viewer: 'slate'
}

const EXPORT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Nama' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'position', label: 'Jabatan' },
  { key: 'department_name', label: 'Departemen' },
  { key: 'department_code', label: 'Kode Dept' }
]

const emptyForm = {
  name: '',
  email: '',
  password: '',
  department_id: '',
  role: 'member',
  position: '',
  is_active: true
}

// ⭐ Helper untuk membuat rentang nomor halaman yang smooth
function getPaginationRange(currentPage, totalPages) {
  const delta = 1 // Jumlah halaman di kiri dan kanan halaman aktif
  const range = []
  const rangeWithDots = []
  let l

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
      range.push(i)
    }
  }

  for (let i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1)
      } else if (i - l !== 1) {
        rangeWithDots.push('...')
      }
    }
    rangeWithDots.push(i)
    l = i
  }

  return rangeWithDots
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [showPassword, setShowPassword] = useState(false)

  // ⭐ State untuk Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Fetch users
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data.data)
  })

  // Fetch departments untuk dropdown
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then((r) => r.data.data)
  })

  const createMut = useMutation({
    mutationFn: (body) => api.post('/users', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User ditambahkan!')
      closeModal()
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || 'Gagal menambahkan user')
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/users/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User diperbarui!')
      closeModal()
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || 'Gagal update user')
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User dihapus!')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal hapus')
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowPassword(false)
    setModalOpen(true)
  }

  const openEdit = (u) => {
    setEditing(u)
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      department_id: u.department_id,
      role: u.role,
      position: u.position || '',
      is_active: u.is_active
    })
    setShowPassword(false)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
    setShowPassword(false)
  }

  const handleSubmit = () => {
    if (!form.name.trim() || !form.email.trim() || !form.department_id) {
      toast.error('Nama, email, dan departemen wajib diisi')
      return
    }
    if (!editing && form.password.length < 6) {
      toast.error('Password minimal 6 karakter')
      return
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      department_id: Number(form.department_id),
      role: form.role,
      position: form.position.trim(),
      is_active: form.is_active
    }

    if (editing) {
      if (form.password) payload.password = form.password
      updateMut.mutate({ id: editing.id, ...payload })
    } else {
      payload.password = form.password
      createMut.mutate(payload)
    }
  }

  const handleDelete = (u) => {
    if (!confirm(`Hapus user "${u.name}"?`)) return
    deleteMut.mutate(u.id)
  }

  const handleExport = () => {
    try {
      exportToExcel(users || [], EXPORT_COLUMNS, 'users')
      toast.success('Berhasil export Excel!')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const filtered = (users || []).filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = !filterRole || u.role === filterRole
    return matchSearch && matchRole
  })

  // ⭐ Logika Pagination
  // Reset ke halaman 1 ketika pencarian atau filter berubah
  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterRole])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentUsers = filtered.slice(indexOfFirstItem, indexOfLastItem)
  const paginationRange = getPaginationRange(currentPage, totalPages)

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-800">Users</h1>
          <p className="text-sm text-ink-500 mt-1">
            Kelola user, role, dan akses —{' '}
            <span className="text-tosca-700 font-medium">{users?.length || 0}</span> user
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / email..."
              className="h-10 pl-9 pr-3 rounded-lg border border-ink-200 bg-white text-sm w-56 focus:outline-none focus:border-tosca-500 focus:ring-2 focus:ring-tosca-500/20"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="h-10 px-3 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-tosca-500"
          >
            <option value="">Semua Role</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> User Baru
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading && <Spinner label="Memuat data..." />}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          Error: {error.message}
        </div>
      )}

      {!isLoading && !error && (
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ink-50 border-b border-ink-100">
                <tr className="text-xs font-semibold text-ink-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Nama</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Departemen</th>
                  <th className="text-left px-4 py-3">Jabatan</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-center px-4 py-3 w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {/* ⭐ Menggunakan currentUsers, bukan filtered */}
                {currentUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-ink-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-ink-800">{u.name}</div>
                          <div className="text-[11px] text-ink-400">#{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge color="purple">{u.department_code || '-'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-600">{u.position || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge color={ROLE_COLOR[u.role] || 'slate'}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-ink-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-ink-400" />
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-2 rounded-lg hover:bg-tosca-50 text-tosca-600 transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <EmptyState
              icon={Users}
              title={search || filterRole ? 'Tidak ditemukan' : 'Belum ada user'}
              description={
                search || filterRole
                  ? 'Coba ubah kata kunci atau filter role.'
                  : "Klik tombol 'User Baru' untuk menambahkan."
              }
            />
          )}

          {/* ⭐ UI PAGINATION */}
          {filtered.length > 0 && totalPages > 1 && (
            <div className="px-4 py-3 border-t border-ink-100 bg-ink-50/50 flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-ink-500">
                Menampilkan <strong>{indexOfFirstItem + 1}</strong> - <strong>{Math.min(indexOfLastItem, filtered.length)}</strong> dari <strong>{filtered.length}</strong> data
              </div>
              
              <div className="flex items-center gap-1">
                {/* Tombol Previous */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-ink-200 bg-white text-ink-500 hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Nomor Halaman */}
                {paginationRange.map((page, index) => {
                  if (page === '...') {
                    return (
                      <span key={`dots-${index}`} className="px-2 text-ink-400 text-sm">
                        ...
                      </span>
                    )
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition ${
                        currentPage === page
                          ? 'bg-tosca-600 text-white shadow-sm'
                          : 'bg-white border border-ink-200 text-ink-600 hover:bg-tosca-50 hover:border-tosca-300'
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}

                {/* Tombol Next */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-ink-200 bg-white text-ink-500 hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? `Edit User — ${editing.name}` : 'User Baru'}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              loading={createMut.isPending || updateMut.isPending}
            >
              Simpan
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nama Lengkap *"
            placeholder="cth: Budi Santoso"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Email *"
            type="email"
            placeholder="nama@company.co.id"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              Password {editing ? '(kosongkan jika tidak diubah)' : '*'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? '••••••••' : 'Minimal 6 karakter'}
                className="w-full h-10 pl-3 pr-10 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-tosca-500 focus:ring-2 focus:ring-tosca-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-400 hover:text-tosca-600 hover:bg-tosca-50 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              Departemen *
            </label>
            <select
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-tosca-500"
            >
              <option value="">-- Pilih Departemen --</option>
              {(departments || []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                Role *
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-tosca-500"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <Input
              label="Jabatan"
              placeholder="cth: Backend Developer"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-ink-300 text-tosca-600 focus:ring-tosca-500"
            />
            <span className="text-sm text-ink-700">User aktif (bisa login)</span>
          </label>
        </div>
      </Modal>
    </div>
  )
}