import { useState, useEffect, useRef } from 'react'
import {
  X, AlertCircle, Zap, CheckCircle2, Clock, Rocket,
  Play, TrendingUp, Circle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import UserPicker from '@/components/ui/UserPicker'
import ObjectivePicker from '@/components/ui/ObjectivePicker'

// ============================================================
// ⭐ OBJECTIVE_SP — mapping lokal, source of truth
// ============================================================
const OBJECTIVE_SP = {
  daily: 1,
  troubleshooting: 8,
  compliance: 20,
  improvement: 20,
  new_project: 60,
  'new-project': 60,
  newProject: 60
}

function getObjectiveSP(objective) {
  if (!objective) return 0
  if (OBJECTIVE_SP[objective] != null) return OBJECTIVE_SP[objective]
  const key = String(objective).toLowerCase().replace(/[\s-]+/g, '_')
  return OBJECTIVE_SP[key] ?? 0
}

// ============================================================
// Constants
// ============================================================
const TYPES = ['story', 'task', 'bug', 'epic', 'subtask']
const PRIORITIES = ['lowest', 'low', 'medium', 'high', 'highest']

const PROGRESS_ICONS = {
  not_started: Circle,
  in_progress: Play,
  almost_done: TrendingUp,
  done:        CheckCircle2
}

const EMPTY = {
  title: '',
  description: '',
  type: 'task',
  priority: 'medium',
  objective: 'daily',
  progress_level: 'not_started',
  assignee_id: null,
  assignee_name: null,
  assignee_dept: null,
  project_id: null, 
  due: ''
}

// ============================================================
// Helper Functions
// ============================================================
function normalizeProgressLevel(progressLevel, objective) {
  const valid = ['not_started', 'in_progress', 'almost_done', 'done']
  if (!progressLevel || !valid.includes(progressLevel)) {
    return 'not_started'
  }
  return progressLevel
}

function computeProgressScore(progressLevel, objective, fullSP) {
  switch (progressLevel) {
    case 'in_progress': return 1
    case 'almost_done': return Math.floor(fullSP / 2)
    case 'done':        return fullSP
    default:            return 0
  }
}

function getProgressOptions(objective, fullSP) {
  return [
    { value: 'not_started', label: 'Belum Mulai', description: 'Task belum dikerjakan', sp: 0 },
    { value: 'in_progress', label: 'Sedang Dikerjakan', description: 'Task sedang dalam progress', sp: 1 },
    { value: 'almost_done', label: 'Hampir Selesai', description: 'Sudah 50% lebih, tinggal finalisasi', sp: Math.floor(fullSP / 2) },
    { value: 'done',        label: 'Selesai', description: 'Task sudah tuntas', sp: fullSP }
  ]
}

// ============================================================
// TaskFormModal
// ============================================================
export default function TaskFormModal({ open, onClose, task, onSave, defaultProjectId }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const bodyRef = useRef(null)

  const isEdit = !!task

  // ============================================================
  // Reset form setiap kali modal dibuka
  // ============================================================
  useEffect(() => {
    if (!open) return

    if (task) {
      const objective = task.objective || 'daily'
      const rawProgress = task.progress_level || 'not_started'

      setForm({
        ...EMPTY,
        ...task,
        objective,
        progress_level: normalizeProgressLevel(rawProgress, objective),
        assignee_id: task.assignee_id ? Number(task.assignee_id) : null,
        assignee_name: task.assignee_name || null,
        assignee_dept: task.assignee_dept || null,
        // Prioritaskan project_id dari task, jika tidak ada baru ambil defaultProjectId
        project_id: task.project_id || defaultProjectId || null, 
        due: task.due_date
          ? String(task.due_date).slice(0, 10)
          : task.due
            ? String(task.due).slice(0, 10)
            : ''
      })
    } else {
      setForm({
        ...EMPTY,
        project_id: defaultProjectId || null 
      })
    }

    setErrors({})
    setSubmitting(false)

    setTimeout(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = 0
    }, 50)
  }, [open, task, defaultProjectId])

  if (!open) return null

  // ============================================================
  // Computed values
  // ============================================================
  const computedSP = getObjectiveSP(form.objective)
  const hasAssignee = form.assignee_id && Number(form.assignee_id) > 0
  const autoStatus = hasAssignee ? 'todo' : 'backlog'
  const currentScore = computeProgressScore(form.progress_level, form.objective, computedSP)
  const progressOptions = getProgressOptions(form.objective, computedSP)

  // ============================================================
  // Handlers
  // ============================================================
  const handleObjectiveChange = (val) => {
    setForm((prev) => ({
      ...prev,
      objective: val,
      progress_level: 'not_started'
    }))
  }

  // ⭐ FIX: Hapus validasi project_id yang kaku. Hanya validasi Judul & Objective.
  const validate = () => {
    const err = {}
    if (!form.title.trim()) err.title = 'Judul task wajib diisi'
    if (!form.objective) err.objective = 'Objective wajib dipilih'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) {
      toast.error('Lengkapi field yang wajib diisi (Judul & Objective)')
      if (bodyRef.current) bodyRef.current.scrollTop = 0
      return
    }

    setSubmitting(true)

    // ⭐ KIRIM DATA: project_id boleh null jika dari Backlog
    onSave?.({
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      priority: form.priority,
      objective: form.objective,
      progress_level: form.progress_level,
      status: autoStatus,
      assignee_id: hasAssignee ? Number(form.assignee_id) : null,
      assignee_name: hasAssignee ? String(form.assignee_name) : null,
      assignee_dept: hasAssignee ? String(form.assignee_dept) : null,
      project_id: form.project_id ? Number(form.project_id) : null, // ⭐ Kirim null jika kosong
      due: form.due || null,
      points: computedSP,
      story_points: computedSP
    })
  }

  const submitLabel = isEdit
    ? 'Simpan Perubahan'
    : hasAssignee
      ? 'Buat & Assign'
      : 'Simpan ke Backlog'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl animate-fade-in flex flex-col max-h-[92vh] overflow-hidden">
        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 bg-gradient-to-r from-tosca-50/60 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-tosca-600 flex items-center justify-center text-white font-bold shadow-md shadow-tosca-600/20">
              {isEdit ? '✎' : '+'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink-800">
                {isEdit ? 'Edit Task' : 'Buat Task Baru'}
              </h2>
              {isEdit && (
                <p className="text-xs text-ink-500 font-mono">MON-{task.id}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-ink-100 text-ink-500 transition"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ===== BODY ===== */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
          {/* ---------- Judul ---------- */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              Judul Task <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => {
                setForm({ ...form, title: e.target.value })
                if (errors.title) setErrors({ ...errors, title: '' })
              }}
              placeholder="cth: Fix bug login error 500"
              autoFocus
              className={cn(
                'w-full h-11 px-3 rounded-lg border bg-white text-sm transition',
                'focus:outline-none focus:ring-2 focus:ring-tosca-500/20',
                errors.title
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-ink-200 focus:border-tosca-500'
              )}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.title}
              </p>
            )}
          </div>

          {/* ---------- Deskripsi ---------- */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              Deskripsi
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Detail task, acceptance criteria, dll..."
              className="w-full p-3 rounded-lg border border-ink-200 bg-white text-sm resize-y focus:outline-none focus:border-tosca-500 focus:ring-2 focus:ring-tosca-500/20"
            />
          </div>

          {/* ---------- Objective ---------- */}
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <label className="block text-sm font-medium text-ink-700">
                🎯 Objective <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-ink-500">
                Story Points dihitung otomatis
              </span>
            </div>
            <ObjectivePicker
              value={form.objective}
              onChange={handleObjectiveChange}
            />
            {errors.objective && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.objective}
              </p>
            )}

            <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-tosca-50 to-white border border-tosca-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-tosca-600" />
                <span className="text-xs text-tosca-700 font-medium">
                  Story Points otomatis
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-tosca-700">{computedSP}</span>
                <span className="text-xs font-medium text-tosca-600">SP</span>
              </div>
            </div>
          </div>

          {/* ---------- Progress Level ---------- */}
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <label className="block text-sm font-medium text-ink-700">
                📊 Progress Level
              </label>
              <span className="text-xs text-ink-500">
                Pilih tingkat penyelesaian task
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {progressOptions.map((opt) => {
                const isSelected = form.progress_level === opt.value
                const Icon = PROGRESS_ICONS[opt.value] || Circle

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, progress_level: opt.value })}
                    className={cn(
                      'relative p-3 rounded-xl border-2 text-left transition',
                      isSelected
                        ? 'border-tosca-500 bg-tosca-50 shadow-sm'
                        : 'border-ink-200 bg-white hover:border-tosca-300 hover:bg-tosca-50/30'
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-tosca-600 flex items-center justify-center">
                        <CheckCircle2 className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                    )}

                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center mb-1.5',
                      isSelected ? 'bg-tosca-600 text-white' : 'bg-ink-100 text-ink-500'
                    )}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className={cn(
                      'text-xs font-bold mb-0.5',
                      isSelected ? 'text-tosca-700' : 'text-ink-800'
                    )}>
                      {opt.label}
                    </div>

                    <div className="text-[10px] text-ink-500 leading-tight mb-2">
                      {opt.description}
                    </div>

                    <div className={cn(
                      'text-sm font-bold',
                      opt.sp === 0 ? 'text-ink-400' :
                      opt.sp === computedSP ? 'text-emerald-600' :
                      'text-tosca-700'
                    )}>
                      {opt.sp}
                      <span className="text-[10px] font-medium ml-0.5">SP</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ---------- Tipe + Priority ---------- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Tipe</label>
              <div className="grid grid-cols-5 gap-1">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, type: t })}
                    className={cn(
                      'py-2 rounded-lg text-[11px] font-medium capitalize transition',
                      form.type === t
                        ? 'bg-tosca-600 text-white shadow-sm'
                        : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-tosca-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ---------- Assignee ---------- */}
          <div className="p-4 rounded-xl border-2 border-tosca-200 bg-tosca-50/40">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <label className="block text-sm font-semibold text-ink-800">
                👤 Assign ke Staff
              </label>
              <span className="text-[11px] text-ink-500">
                (Opsional — kosongkan untuk simpan di Backlog)
              </span>
            </div>

            <UserPicker
              value={form.assignee_id}
              onChange={(user) =>
                setForm({
                  ...form,
                  assignee_id: user?.id ? Number(user.id) : null,
                  assignee_name: user?.name || null,
                  assignee_dept: user?.department_code || null
                })
              }
            />

            <div className={cn(
              'mt-3 p-3 rounded-lg flex items-start gap-2 text-xs',
              hasAssignee
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border border-amber-200 text-amber-800'
            )}>
              {hasAssignee ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Task akan langsung masuk Kanban Board {form.assignee_name}.</strong>
                    <div className="text-[11px] mt-0.5 text-emerald-700">
                      Staff bisa langsung melihat & mengerjakan task ini.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Task akan disimpan di Backlog (belum di-assign).</strong>
                    <div className="text-[11px] mt-0.5 text-amber-700">
                      Assign nanti untuk mengirim task ke staff.
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ---------- Due Date ---------- */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              📅 Due Date
            </label>
            <input
              type="date"
              value={form.due}
              onChange={(e) => setForm({ ...form, due: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-tosca-500"
            />
          </div>

          {/* ---------- Info box ---------- */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-ink-50 to-white border border-ink-100">
            <div className="text-xs font-semibold text-ink-700 mb-2">
              ℹ️ Setelah task {isEdit ? 'diperbarui' : 'dibuat'}:
            </div>
            <div className="space-y-1.5 text-xs text-ink-600">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-tosca-100 text-tosca-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                  1
                </span>
                <span>
                  {hasAssignee
                    ? `Task muncul di Kanban Board ${form.assignee_name || 'assignee'} kolom "To Do"`
                    : 'Task disimpan di Backlog, menunggu di-assign'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-tosca-100 text-tosca-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                  2
                </span>
                <span>
                  Sprint <strong>completed points</strong> bertambah{' '}
                  <strong>{currentScore} SP</strong> dari task ini
                </span>
              </div>
              {hasAssignee && (
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-tosca-100 text-tosca-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                    3
                  </span>
                  <span>Staff drag task: To Do → In Progress → Review → Done</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="px-6 py-4 border-t border-ink-100 bg-ink-50/50 flex items-center justify-between shrink-0">
          <div className="text-xs text-ink-500">
            <span className="text-red-500">*</span> Wajib diisi
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-ink-600 hover:bg-ink-100 transition disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-medium bg-tosca-600 text-white',
                'hover:bg-tosca-700 transition shadow-sm shadow-tosca-600/20',
                'flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isEdit ? (
                <>Simpan Perubahan</>
              ) : hasAssignee ? (
                <>
                  <Rocket className="w-4 h-4" />
                  {submitLabel}
                </>
              ) : (
                <>📥 {submitLabel}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}