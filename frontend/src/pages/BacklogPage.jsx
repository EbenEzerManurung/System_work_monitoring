import { useState, useMemo } from 'react'
import {
  Plus, Search, Eye, Trash2, Clock, Info, Filter, X,
  ArrowRight, UserCheck, TrendingUp, ListChecks, AlertCircle,
  ShieldAlert
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  cn, PRIORITY_META, fmtDate, isOverdue, getObjectiveMeta, initials
} from '@/lib/utils'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import TaskFormModal from '@/components/task/TaskFormModal'
import TaskDetailModal from '@/components/task/TaskDetailModal'
import {
  useBacklogTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useSprints,                // ⭐ BARU
  useAssignTasksToSprint     // ⭐ BARU
} from '@/lib/taskApi'
import { useAuthStore } from '@/stores/authStore'

// ============================================================
// OBJECTIVE_SCORE
// ============================================================
const OBJECTIVE_SCORE = {
  daily: 1,
  troubleshooting: 8,
  compliance: 20,
  improvement: 20,
  new_project: 60,
  'new-project': 60,
  newProject: 60
}

function getObjectiveScore(objective) {
  if (!objective) return 0
  if (OBJECTIVE_SCORE[objective] != null) return OBJECTIVE_SCORE[objective]
  const key = String(objective).toLowerCase().replace(/[\s-]+/g, '_')
  return OBJECTIVE_SCORE[key] ?? 0
}

// ============================================================
// Constants
// ============================================================
const PRIORITY_OPTIONS = [
  { value: '', label: 'Semua Priority' },
  { value: 'highest', label: 'Highest' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'lowest', label: 'Lowest' }
]

const PRIORITY_ORDER = {
  highest: 0, high: 1, medium: 2, low: 3, lowest: 4
}

// ============================================================
// Backlog Page
// ============================================================
export default function BacklogPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const isManager =
    user?.role === 'admin' ||
    user?.role === 'superadmin' ||
    user?.role === 'manager'

  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [detailTask, setDetailTask] = useState(null)

  const { data: rawTasks = [], isLoading, error } = useBacklogTasks()
  const { data: sprints = [] } = useSprints()                    // ⭐ BARU
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const assignTasksToSprint = useAssignTasksToSprint()           // ⭐ BARU

  // Filter defense-in-depth
  const tasks = useMemo(() => {
    return rawTasks.filter((t) => {
      if (t.assignee_name && t.assignee_name.trim() !== '') return false
      if (t.sprint_id && t.sprint_id > 0) return false
      if (t.status !== 'backlog') return false
      return true
    })
  }, [rawTasks])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const result = tasks.filter((t) => {
      const matchSearch =
        !q || t.title.toLowerCase().includes(q) || String(t.id).includes(q)
      const matchPriority = !filterPriority || t.priority === filterPriority
      return matchSearch && matchPriority
    })
    return result.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99
      const pb = PRIORITY_ORDER[b.priority] ?? 99
      if (pa !== pb) return pa - pb
      const da = a.due_date || a.due
      const db = b.due_date || b.due
      if (da && db) return new Date(da) - new Date(db)
      if (da) return -1
      if (db) return 1
      return b.id - a.id
    })
  }, [tasks, search, filterPriority])

  const stats = useMemo(() => {
    const total = tasks.length
    const overdue = tasks.filter((t) => {
      const due = t.due_date || t.due
      return due && isOverdue(due)
    }).length
    const highPriority = tasks.filter(
      (t) => t.priority === 'high' || t.priority === 'highest'
    ).length
    const totalSP = tasks.reduce(
      (acc, t) => acc + getObjectiveScore(t.objective), 0
    )
    return { total, overdue, highPriority, totalSP }
  }, [tasks])

  // ============================================================
  // ⭐ findSprintForTask — cari sprint di project task
  //
  // Prioritas: sprint active > backlog
  // ============================================================
  const findSprintForTask = (projectID) => {
    if (!projectID) return null
    const candidates = sprints.filter(
      (s) =>
        Number(s.project_id) === Number(projectID) &&
        (s.status === 'active' || s.status === 'backlog')
    )
    if (candidates.length === 0) return null
    // Prioritas active
    candidates.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1
      if (a.status !== 'active' && b.status === 'active') return 1
      return a.id - b.id
    })
    return candidates[0]
  }

  // ============================================================
  // ⭐ handleSave — create/update + auto-assign sprint via API
  // ============================================================
  const handleSave = async (data) => {
    const payload = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      type: data.type,
      objective: data.objective,
      progress_level: data.progress_level || 'not_started',
      assignee_id: data.assignee_id || null,
      due_date: data.due || null
    }

    if (editingTask) {
      // ---------- UPDATE ----------
      updateTask.mutate(
        { id: editingTask.id, ...payload },
        {
          onSuccess: (updated) => {
            toast.success('Task berhasil diperbarui!')
            setShowForm(false)
            setEditingTask(null)
          },
          onError: (e) => toast.error(e.response?.data?.message || 'Gagal update')
        }
      )
      return
    }

    // ---------- CREATE ----------
    try {
      const created = await createTask.mutateAsync(payload)

      // ⭐ AUTO-ASSIGN KE SPRINT via API (kalau di-assign & belum punya sprint)
      let sprintAssigned = false
      if (created?.assignee_id && !created?.sprint_id) {
        const targetSprint = findSprintForTask(created.project_id)
        if (targetSprint) {
          try {
            await assignTasksToSprint.mutateAsync({
              sprintId: targetSprint.id,
              taskIds: [created.id]
            })
            sprintAssigned = true
          } catch (assignErr) {
            console.warn('Auto-assign sprint gagal:', assignErr)
            // Tidak fail — task tetap dibuat, hanya tidak masuk sprint
          }
        }
      }

      // Toast sesuai kondisi
      if (created?.assignee_name) {
        if (sprintAssigned) {
          toast.success(
            `Task di-assign ke ${created.assignee_name} & masuk sprint!`,
            { icon: '🚀' }
          )
        } else {
          toast.success(
            `Task di-assign ke ${created.assignee_name} → muncul di Kanban!`,
            { icon: '🚀' }
          )
        }
      } else {
        toast.success('Task ditambahkan ke Backlog')
      }

      setShowForm(false)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal buat task')
    }
  }

  const handleDelete = (id) => {
    if (!confirm('Hapus task ini?\n\nTindakan ini tidak bisa dibatalkan.')) return
    deleteTask.mutate(id, {
      onSuccess: () => {
        toast.success('Task berhasil dihapus')
        setDetailTask(null)
      },
      onError: (e) => toast.error(e.response?.data?.message || 'Gagal hapus')
    })
  }

  const openCreate = () => {
    setEditingTask(null)
    setShowForm(true)
  }

  const openEdit = (task) => {
    setEditingTask(task)
    setDetailTask(null)
    setShowForm(true)
  }

  const hasActiveFilter = search || filterPriority
  const clearFilters = () => {
    setSearch('')
    setFilterPriority('')
  }

  if (!isManager) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="py-16 text-center bg-white rounded-2xl border border-ink-100">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-base font-semibold text-ink-800 mb-1">
            Akses Ditolak
          </h3>
          <p className="text-sm text-ink-500 mb-5 max-w-md mx-auto">
            Halaman Backlog hanya bisa diakses oleh <strong>Manager</strong>,{' '}
            <strong>Admin</strong>, & <strong>Superadmin</strong>.
          </p>
          <Button onClick={() => navigate('/board')}>
            <ArrowRight className="w-4 h-4" /> Buka Kanban Board
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* ===== BANNER ===== */}
      <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-tosca-50 via-white to-tosca-50 border border-tosca-100">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-2xl bg-tosca-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Plus className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-ink-800">
              📥 Pusat Pembuatan Task
            </h2>
            <p className="text-sm text-ink-600 mt-1">
              <strong>Langkah 1:</strong> Buat task baru. Kalau{' '}
              <strong>di-assign ke staff</strong>, task otomatis{' '}
              <span className="text-tosca-700 font-semibold">
                muncul di Kanban Board &amp; Sprint staff
              </span>.
            </p>
          </div>
          <Button
            size="lg"
            onClick={openCreate}
            className="shadow-lg shadow-tosca-600/20"
          >
            <Plus className="w-5 h-5" /> Buat Task Baru
          </Button>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white rounded-xl border border-ink-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-tosca-100 flex items-center justify-center">
              <ListChecks className="w-3.5 h-3.5 text-tosca-700" />
            </div>
            <span className="text-xs text-ink-500">Total Backlog</span>
          </div>
          <div className="text-2xl font-bold text-ink-800">{stats.total}</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-ink-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <span className="text-xs text-ink-500">Priority Tinggi</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">{stats.highPriority}</div>
        </div>

        <div className={cn(
          'p-4 bg-white rounded-xl border',
          stats.overdue > 0 ? 'border-red-200 bg-red-50/30' : 'border-ink-100'
        )}>
          <div className="flex items-center gap-2 mb-1">
            <div className={cn(
              'w-6 h-6 rounded-lg flex items-center justify-center',
              stats.overdue > 0 ? 'bg-red-100' : 'bg-ink-100'
            )}>
              <AlertCircle className={cn(
                'w-3.5 h-3.5',
                stats.overdue > 0 ? 'text-red-600' : 'text-ink-500'
              )} />
            </div>
            <span className="text-xs text-ink-500">Overdue</span>
          </div>
          <div className={cn(
            'text-2xl font-bold',
            stats.overdue > 0 ? 'text-red-600' : 'text-ink-800'
          )}>
            {stats.overdue}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-ink-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <span className="text-xs text-ink-500">Total SP</span>
          </div>
          <div className="text-2xl font-bold text-purple-700">{stats.totalSP}</div>
        </div>
      </div>

      {/* ===== FILTER BAR ===== */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <div className="relative">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari task..."
            className="h-10 pl-9 pr-3 rounded-lg border border-ink-200 bg-white text-sm w-64 focus:outline-none focus:border-tosca-500 focus:ring-2 focus:ring-tosca-500/20"
          />
        </div>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="h-10 px-3 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-tosca-500"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {hasActiveFilter && (
          <button
            onClick={clearFilters}
            className="h-10 px-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium hover:bg-red-100 transition flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}

        <div className="ml-auto text-xs text-ink-500 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Diurutkan berdasarkan priority &amp; deadline
        </div>
      </div>

      {/* ===== LOADING / ERROR ===== */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Spinner label="Memuat backlog..." />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong>Gagal memuat data:</strong> {error.message}
            <div className="text-xs text-red-600 mt-1">
              Pastikan backend berjalan di port 8080.
            </div>
          </div>
        </div>
      )}

      {/* ===== TABLE ===== */}
      {!isLoading && !error && tasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ink-50 border-b border-ink-100">
                <tr className="text-xs font-semibold text-ink-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 w-20">Key</th>
                  <th className="text-left px-4 py-3">Judul</th>
                  <th className="text-left px-4 py-3 w-32">Objective</th>
                  <th className="text-left px-4 py-3 w-28">Priority</th>
                  <th className="text-center px-4 py-3 w-20">SP</th>
                  <th className="text-left px-4 py-3 w-36">Due</th>
                  <th className="text-center px-4 py-3 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((t) => {
                  const p = PRIORITY_META[t.priority] || PRIORITY_META.medium
                  const obj = getObjectiveMeta(t.objective)
                  const overdue = isOverdue(t.due_date || t.due)
                  const sp = getObjectiveScore(t.objective)

                  return (
                    <tr key={t.id} className="hover:bg-ink-50/50 transition">
                      <td className="px-4 py-3 text-xs font-mono text-tosca-700 font-medium">
                        MON-{t.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-ink-800 font-medium line-clamp-1">
                          {t.title}
                        </div>
                        {t.description && (
                          <div className="text-[11px] text-ink-400 line-clamp-1 mt-0.5">
                            {t.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white inline-block"
                          style={{ background: obj.dotColor }}
                        >
                          {obj.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('w-2 h-2 rounded-full', p.color)} />
                          <span className="text-xs text-ink-600">{p.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="text-xs font-bold text-tosca-700 bg-tosca-50 px-2 py-0.5 rounded"
                          title={`Objective score: ${sp} SP`}
                        >
                          {sp}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs',
                          overdue ? 'text-red-500 font-semibold' : 'text-ink-500'
                        )}>
                          {t.due_date || t.due ? fmtDate(t.due_date || t.due) : '-'}
                        </span>
                        {overdue && (
                          <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                            OVERDUE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setDetailTask(t)}
                            className="p-1.5 rounded-lg hover:bg-tosca-50 text-tosca-600 transition"
                            title="Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition"
                            title="Edit &amp; Assign"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Filter className="w-10 h-10 text-ink-300 mx-auto mb-2" />
              <p className="text-sm text-ink-500">Tidak ada task cocok filter</p>
              <button
                onClick={clearFilters}
                className="mt-3 text-xs text-tosca-700 hover:underline font-medium"
              >
                Reset filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== EMPTY STATE ===== */}
      {!isLoading && !error && tasks.length === 0 && (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-ink-200">
          <div className="w-16 h-16 rounded-2xl bg-tosca-50 flex items-center justify-center mx-auto mb-4">
            <ListChecks className="w-8 h-8 text-tosca-500" />
          </div>
          <h3 className="text-base font-semibold text-ink-800 mb-1">
            Belum ada task di Backlog
          </h3>
          <p className="text-sm text-ink-500 mb-5 max-w-md mx-auto">
            Backlog adalah tempat task yang belum di-assign &amp; belum masuk sprint.
          </p>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Buat Task Baru
          </Button>
        </div>
      )}

      {/* ===== INFO BANNER ===== */}
      {!isLoading && !error && tasks.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-tosca-50 to-white border border-tosca-100 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-tosca-600 flex items-center justify-center text-white shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink-800">
              Cara Assign Task ke Staff
            </div>
            <div className="text-xs text-ink-600 mt-0.5">
              Klik tombol <UserCheck className="w-3 h-3 inline" /> pada task, pilih{' '}
              <strong>Assignee</strong>, lalu Simpan. Task otomatis pindah ke{' '}
              <strong>Kanban Board</strong> &amp; <strong>Sprint</strong> staff.
            </div>
          </div>
        </div>
      )}

      {/* ===== MODALS ===== */}
      <TaskFormModal
        open={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingTask(null)
        }}
        task={editingTask}
        defaultStatus="backlog"
        onSave={handleSave}
      />

      <TaskDetailModal
        open={!!detailTask}
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}