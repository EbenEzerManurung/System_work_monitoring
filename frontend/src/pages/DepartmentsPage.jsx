import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit, Trash2, Building2, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { exportToExcel } from '@/lib/exportExcel'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'

const EXPORT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'code', label: 'Kode' },
  { key: 'name', label: 'Nama Departemen' },
  { key: 'description', label: 'Deskripsi' }
]

export default function DepartmentsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', description: '' })

  const { data, isLoading, error } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then((r) => r.data.data)
  })

  const createMut = useMutation({
    mutationFn: (body) => api.post('/departments', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      toast.success('Departemen ditambahkan!')
      closeModal()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal')
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/departments/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      toast.success('Departemen diperbarui!')
      closeModal()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal')
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/departments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      toast.success('Departemen dihapus!')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal')
  })

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', code: '', description: '' })
    setModalOpen(true)
  }

  const openEdit = (dept) => {
    setEditing(dept)
    setForm({ name: dept.name, code: dept.code, description: dept.description || '' })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
  }

  const handleSubmit = () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Nama & kode wajib diisi')
      return
    }
    if (editing) updateMut.mutate({ id: editing.id, ...form })
    else createMut.mutate(form)
  }

  const handleDelete = (dept) => {
    if (!confirm(`Hapus departemen "${dept.name}"?`)) return
    deleteMut.mutate(dept.id)
  }

  const handleExport = () => {
    try {
      exportToExcel(data || [], EXPORT_COLUMNS, 'departments')
      toast.success('Berhasil export Excel!')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const filtered = (data || []).filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-800">Departments</h1>
          <p className="text-sm text-ink-500 mt-1">Kelola master data departemen</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari departemen..."
              className="h-10 pl-9 pr-3 rounded-lg border border-ink-200 bg-white text-sm w-64 focus:outline-none focus:border-tosca-500 focus:ring-2 focus:ring-tosca-500/20"
            />
          </div>
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export Excel
          </Button>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Departemen Baru
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
                  <th className="text-left px-4 py-3 w-16">ID</th>
                  <th className="text-left px-4 py-3 w-24">Kode</th>
                  <th className="text-left px-4 py-3">Nama</th>
                  <th className="text-left px-4 py-3">Deskripsi</th>
                  <th className="text-center px-4 py-3 w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-ink-50/50 transition">
                    <td className="px-4 py-3 text-xs font-mono text-ink-500">#{d.id}</td>
                    <td className="px-4 py-3">
                      <Badge color="tosca">{d.code}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-800 font-medium">{d.name}</td>
                    <td className="px-4 py-3 text-sm text-ink-500">{d.description || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(d)}
                          className="p-2 rounded-lg hover:bg-tosca-50 text-tosca-600 transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(d)}
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
              icon={Building2}
              title={search ? 'Tidak ditemukan' : 'Belum ada departemen'}
              description={
                search
                  ? `Tidak ada departemen cocok dengan "${search}"`
                  : "Klik tombol 'Departemen Baru' untuk menambahkan."
              }
            />
          )}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Departemen' : 'Departemen Baru'}
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
            label="Nama Departemen *"
            placeholder="cth: Information Technology"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Kode *"
            placeholder="cth: IT"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            maxLength={10}
          />
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              Deskripsi
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Deskripsi departemen..."
              className="w-full p-3 rounded-lg border border-ink-200 bg-white text-sm resize-y focus:outline-none focus:border-tosca-500 focus:ring-2 focus:ring-tosca-500/20"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
