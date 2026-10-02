import { useMemo, useState, useCallback } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, useDroppable, MouseSensor, TouchSensor
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Search, Info, Zap, CheckCircle2, Clock, X, AlertCircle,
  LayoutGrid, User, Filter
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  cn, PRIORITY_META, fmtDate, initials, getObjectiveMeta
} from '@/lib/utils'
import Spinner from '@/components/ui/Spinner'
import TaskDetailModal from '@/components/task/TaskDetailModal'
import TaskFormModal from '@/components/task/TaskFormModal'
import {
  useTasks, useUpdateTask, useUpdateTaskStatus, useDeleteTask, useSprints
} from '@/lib/taskApi'
import { useAuthStore } from '@/stores/authStore'

// ============================================================
// ⭐ FIX 1: Tambahkan 'improvement' ke dalam OBJECTIVE_SCORE
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
// ⭐ FIX 2: Perbaiki computeTaskScore agar menghitung SP parsial
// ============================================================
function computeTaskScore(task) {
  const maxScore = getObjectiveScore(task.objective)
  const progress = task.progress_level || 'not_started'
  
  if (progress === 'done') return maxScore
  if (progress === 'almost_done') return Math.floor(maxScore / 2)
  if (progress === 'in_progress') return maxScore > 0 ? 1 : 0
  return 0
}

// ============================================================
// ⭐ FIX 3: Fungsi Overdue yang Akurat (Hanya Bandingkan Tanggal)
// ============================================================
function isTaskOverdue(dueDate) {
  if (!dueDate) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0) // Set ke tengah malam hari ini (00:00:00)

  const due = new Date(dueDate)
  
  // Tangani format string YYYY-MM-DD agar terbaca sebagai waktu lokal, bukan UTC
  if (typeof dueDate === 'string' && dueDate.length === 10) {
    const [y, m, d] = dueDate.split('-')
    due.setFullYear(Number(y), Number(m) - 1, Number(d))
  }
  due.setHours(0, 0, 0, 0) // Set ke tengah malam tanggal jatuh tempo

  // Task overdue HANYA JIKA tanggal jatuh tempo SEBELUM hari ini
  return due.getTime() < today.getTime()
}

const PROGRESS_META = {
  not_started: { label: 'Not Started', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  almost_done: { label: 'Almost Done', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Zap },
  done:        { label: 'Done',        color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 }
}

const COLUMNS = [
  { id: 'todo',        title: 'To Do',       color: '#2DD4BF', hint: 'Task di-assign, belum dimulai' },
  { id: 'in_progress', title: 'In Progress', color: '#0D9488', hint: 'Sedang dikerjakan' },
  { id: 'review',      title: 'Review',      color: '#F59E0B', hint: 'Menunggu review manager' },
  { id: 'done',        title: 'Done',        color: '#10B981', hint: 'Selesai ✓' }
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'Semua Priority' },
  { value: 'highest', label: 'Highest' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'lowest', label: 'Lowest' }
]

const STATUS_TO_PROGRESS = {
  backlog: 'not_started',
  todo: 'not_started',
  in_progress: 'in_progress',
  review: 'almost_done',
  done: 'done'
}

function mapStatusToColumn(status) {
  if (status === 'backlog') return 'todo'
  if (status === 'todo') return 'todo'
  return status
}

function getSprintId(t) {
  const v = t.sprint_id ?? t.sprintId ?? t.sprint?.id
  return v != null && Number(v) > 0 ? Number(v) : null
}

function TaskCard({ task, isDragging, onClick }) {
  const priority = PRIORITY_META[task.priority] || PRIORITY_META.medium
  const objective = getObjectiveMeta(task.objective)
  // ⭐ Menggunakan fungsi lokal yang sudah diperbaiki
  const overdue = isTaskOverdue(task.due_date)

  const progress = PROGRESS_META[task.progress_level] || PROGRESS_META.not_started
  const ProgressIcon = progress.icon
  const showProgress = task.progress_level && task.progress_level !== 'not_started'
  
  const spScore = computeTaskScore(task)
  const spMax = getObjectiveScore(task.objective)

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl p-3.5 border border-ink-100 shadow-sm cursor-pointer',
        'hover:shadow-md hover:border-tosca-300 transition group',
        isDragging && 'shadow-2xl ring-2 ring-tosca-500/40 rotate-2 cursor-grabbing'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn(
            'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide',
            task.type === 'bug' ? 'bg-red-100 text-red-700' :
            task.type === 'story' ? 'bg-tosca-100 text-tosca-700' :
            task.type === 'epic' ? 'bg-purple-100 text-purple-700' :
            task.type === 'subtask' ? 'bg-slate-100 text-slate-700' :
            'bg-blue-100 text-blue-700'
          )}>
            {task.type}
          </span>
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide text-white"
            style={{ background: objective.dotColor }}>
            {objective.label}
          </span>
        </div>
        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', priority.color)}
          title={`Priority: ${priority.label}`} />
      </div>

      <h4 className="text-sm font-medium text-ink-800 leading-snug mb-1.5 group-hover:text-tosca-700 transition line-clamp-2">
        {task.title}
      </h4>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-mono text-ink-400">MON-{task.id}</span>
        {overdue && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
            <AlertCircle className="w-2.5 h-2.5" /> OVERDUE
          </span>
        )}
      </div>

      {showProgress && (
        <div className="mb-2">
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border',
            progress.color
          )}>
            <ProgressIcon className="w-3 h-3" />
            {progress.label}
            {spMax > 0 && <span className="ml-0.5">· {spScore} / {spMax} SP</span>}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {task.assignee_name ? (
            <>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-tosca-500 to-tosca-700 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white shrink-0"
                title={task.assignee_name}>
                {initials(task.assignee_name)}
              </div>
              {task.assignee_dept && (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 shrink-0">
                  {task.assignee_dept}
                </span>
              )}
            </>
          ) : (
            <span className="text-[10px] text-ink-400 italic">Unassigned</span>
          )}
          <span className="text-[10px] font-bold text-tosca-700 bg-tosca-50 px-1.5 py-0.5 rounded shrink-0"
            title={`Objective score: ${spMax} SP`}>
            {spMax} SP
          </span>
        </div>
        <span className={cn('text-[10px] font-medium shrink-0', overdue ? 'text-red-500' : 'text-ink-500')}>
          {task.due_date ? fmtDate(task.due_date) : '-'}
        </span>
      </div>
    </div>
  )
}

function SortableTask({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1 }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={() => onOpen(task)} />
    </div>
  )
}

function Column({ column, tasks, onOpen, isOver, sprintStatusMap }) {
  const { setNodeRef } = useDroppable({ id: column.id })

  const baseScore = tasks.reduce((acc, t) => acc + computeTaskScore(t), 0)

  let activeSprintBonus = 0
  if (column.id === 'in_progress') {
    const activeSprintIds = new Set()
    tasks.forEach((t) => {
      const sid = getSprintId(t)
      if (sid && sprintStatusMap && sprintStatusMap[sid] === 'active') {
        activeSprintIds.add(sid)
      }
    })
    activeSprintBonus = activeSprintIds.size
  }

  const totalScore = baseScore + activeSprintBonus
  const totalFull = tasks.reduce((acc, t) => acc + getObjectiveScore(t.objective), 0)
  const pct = totalFull > 0 ? (totalScore / totalFull) * 100 : 0

  return (
    <div className={cn(
      'flex flex-col w-72 shrink-0 bg-ink-100/60 rounded-2xl transition',
      isOver && 'bg-tosca-100/70 ring-2 ring-tosca-400'
    )}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: column.color }} />
            <h3 className="text-sm font-semibold text-ink-700">{column.title}</h3>
            <span className="text-xs text-ink-400 bg-white px-1.5 py-0.5 rounded-md">{tasks.length}</span>
          </div>
        </div>
        <p className="text-[10px] text-ink-400 mt-1 ml-4">{column.hint}</p>
        {tasks.length > 0 && (
          <div className="mt-2 ml-4">
            <div className="flex items-center justify-between text-[10px] text-ink-500 mb-1">
              <span>SP Score</span>
              <span className="font-bold text-tosca-700">{totalScore} / {totalFull} SP</span>
            </div>
            <div className="h-1 bg-ink-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-tosca-400 to-tosca-600 transition-all"
                style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto scrollbar-thin min-h-[200px]">
          {tasks.map((t) => <SortableTask key={t.id} task={t} onOpen={onOpen} />)}
          {tasks.length === 0 && (
            <div className="flex items-center justify-center h-20 text-[11px] text-ink-400 italic">Kosong</div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export default function BoardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'superadmin'

  const [activeId, setActiveId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [myTasksOnly, setMyTasksOnly] = useState(false)
  const [openDetail, setOpenDetail] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [openForm, setOpenForm] = useState(false)

  const { data: allTasks = [], isLoading, error } = useTasks()
  const { data: sprints = [] } = useSprints()
  const updateTask = useUpdateTask()
  const updateStatus = useUpdateTaskStatus()
  const deleteTask = useDeleteTask()

  // ⭐ Sprint status map: { sprint_id: status }
  const sprintStatusMap = useMemo(() => {
    const m = {}
    sprints.forEach((s) => { m[Number(s.id)] = s.status })
    return m
  }, [sprints])

  // ============================================================
  // ⭐ FILTER TASK (HAPUS mySprintIds, PERKETAT FILTER MEMBER)
  // ============================================================
  const tasks = useMemo(() => {
    return allTasks.filter((t) => {
      const hasAssignee = t.assignee_name && t.assignee_name.trim() !== ''
      const sid = getSprintId(t)
      const sprintStatus = sid ? sprintStatusMap[sid] : null

      // Rule: sprint belum dimulai → task TIDAK tampil di Kanban
      if (sid && sprintStatus === 'backlog') return false

      const inSprint = sid !== null
      if (!hasAssignee && !inSprint) return false

      // Cek apakah task ini benar-benar milik user yang sedang login
      const isMyTask = String(t.assignee_id) === String(user?.id) || 
                       (t.assignee_id == null && t.assignee_name === user?.name)

      // Filter "Tugas Saya" (jika tombol filter diaktifkan)
      if (myTasksOnly) {
        return isMyTask
      }

      // Manager/Admin melihat semua task
      if (isManagerOrAdmin) return true

      // Member HANYA melihat task miliknya SENDIRI (tidak ada task rekan sesama sprint)
      return isMyTask
    })
  }, [allTasks, myTasksOnly, user, isManagerOrAdmin, sprintStatusMap])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return tasks.filter((t) => {
      const matchSearch = !q || t.title.toLowerCase().includes(q) ||
        String(t.id).includes(q) ||
        (t.assignee_name && t.assignee_name.toLowerCase().includes(q))
      const matchPriority = !filterPriority || t.priority === filterPriority
      return matchSearch && matchPriority
    })
  }, [tasks, search, filterPriority])

  const grouped = useMemo(() => {
    const g = {}
    COLUMNS.forEach((c) => { g[c.id] = [] })
    filtered.forEach((t) => {
      const colId = mapStatusToColumn(t.status)
      if (g[colId]) g[colId].push(t)
    })
    return g
  }, [filtered])

  const activeTask = tasks.find((t) => t.id === activeId)

  const handleDragStart = useCallback((e) => { setActiveId(e.active.id) }, [])

  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveId(null)
    if (!over) return
    const dragged = tasks.find((t) => t.id === active.id)
    if (!dragged) return
    if (!isManagerOrAdmin && dragged.assignee_name !== user?.name) {
      toast.error('Anda hanya bisa memindahkan task milik Anda')
      return
    }
    let targetCol = over.id
    if (!COLUMNS.find((c) => c.id === over.id)) {
      const overTask = tasks.find((t) => t.id === over.id)
      if (overTask) targetCol = mapStatusToColumn(overTask.status)
    }
    if (!targetCol || !COLUMNS.find((c) => c.id === targetCol)) return
    const currentCol = mapStatusToColumn(dragged.status)
    if (currentCol === targetCol) return
    const col = COLUMNS.find((c) => c.id === targetCol)
    updateStatus.mutate(
      { id: active.id, status: targetCol },
      {
        onSuccess: () => toast.success(`Task dipindah ke "${col.title}"`),
        onError: (e) => toast.error(e.response?.data?.message || 'Gagal pindah task')
      }
    )
  }, [tasks, updateStatus, isManagerOrAdmin, user])

  const handleStatusChange = useCallback((id, status) => {
    const t = tasks.find((x) => x.id === id)
    if (t && !isManagerOrAdmin && t.assignee_name !== user?.name) {
      toast.error('Anda hanya bisa mengubah task milik Anda')
      return
    }
    updateStatus.mutate({ id, status }, {
      onSuccess: () => {
        setSelectedTask((prev) => prev ? { ...prev, status, progress_level: STATUS_TO_PROGRESS[status] || 'not_started' } : prev)
        toast.success('Status berhasil diubah')
      },
      onError: (e) => toast.error(e.response?.data?.message || 'Gagal ubah status')
    })
  }, [updateStatus, tasks, isManagerOrAdmin, user])

  const openEdit = useCallback((task) => {
    setEditingTask(task); setOpenDetail(false); setOpenForm(true)
  }, [])

  const handleUpdate = useCallback((data) => {
    const hasAssignee = data.assignee_id && data.assignee_id > 0
    let status = data.status
    if (editingTask) {
      if (!hasAssignee) status = 'backlog'
      else if (editingTask.status === 'backlog') status = 'todo'
      else status = editingTask.status
    } else {
      status = hasAssignee ? 'todo' : 'backlog'
    }

    const payload = {
      title: data.title, description: data.description, status,
      priority: data.priority, type: data.type, objective: data.objective,
      progress_level: data.progress_level || 'not_started',
      assignee_id: data.assignee_id || null,
      due_date: data.due || null
    }

    updateTask.mutate({ id: editingTask.id, ...payload }, {
      onSuccess: (updated) => {
        toast.success('Task berhasil diperbarui!')
        setOpenForm(false); setEditingTask(null)
        if (selectedTask?.id === updated.id) setSelectedTask(updated)
      },
      onError: (e) => toast.error(e.response?.data?.message || 'Gagal update')
    })
  }, [editingTask, updateTask, selectedTask])

  const handleDelete = useCallback((id) => {
    deleteTask.mutate(id, {
      onSuccess: () => { toast.success('Task berhasil dihapus'); setOpenDetail(false); setSelectedTask(null) },
      onError: (e) => toast.error(e.response?.data?.message || 'Gagal hapus')
    })
  }, [deleteTask])

  const hasActiveFilter = search || filterPriority || myTasksOnly
  const clearFilters = () => { setSearch(''); setFilterPriority(''); setMyTasksOnly(false) }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 lg:px-8 pt-5">
        <div className="p-4 rounded-xl bg-gradient-to-r from-tosca-50 to-white border border-tosca-100 flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-tosca-600 flex items-center justify-center text-white shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink-800">🎯 Papan Kerja — Task tim Anda</div>
            <div className="text-xs text-ink-600 mt-0.5">
              Task di sprint yang <strong>belum dimulai</strong> tidak muncul di sini.
              Buka <strong>Sprints</strong> untuk memulai sprint.{' '}
              <button onClick={() => navigate('/sprints')} className="text-tosca-700 underline font-medium hover:text-tosca-800">
                Buka Sprints
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-4 border-b border-ink-100 bg-white/70 backdrop-blur shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink-800">Kanban Board</h1>
            <p className="text-xs text-ink-500 mt-0.5">
              Department {user?.department_name || 'Anda'} ·{' '}
              <span className="text-tosca-700 font-medium">{filtered.length} task</span>
              {filtered.length !== tasks.length && <span className="text-ink-400"> (dari {tasks.length})</span>}
              {isLoading && ' · memuat...'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari task / assignee..."
                className="h-10 pl-9 pr-3 rounded-lg border border-ink-200 bg-white text-sm w-56 focus:outline-none focus:border-tosca-500 focus:ring-2 focus:ring-tosca-500/20" />
            </div>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
              className="h-10 px-3 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-tosca-500">
              {PRIORITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <button onClick={() => setMyTasksOnly((v) => !v)}
              className={cn(
                'h-10 px-3 rounded-lg text-sm font-medium transition flex items-center gap-1.5 border',
                myTasksOnly ? 'bg-tosca-600 text-white border-tosca-600' : 'bg-white text-ink-600 border-ink-200 hover:bg-ink-50'
              )}>
              <User className="w-3.5 h-3.5" /> Tugas Saya
            </button>
            {hasActiveFilter && (
              <button onClick={clearFilters}
                className="h-10 px-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium hover:bg-red-100 transition flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading && tasks.length === 0 && (
        <div className="flex-1 flex items-center justify-center"><Spinner label="Memuat task dari database..." /></div>
      )}

      {error && (
        <div className="m-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong>Gagal memuat data:</strong> {error.message}
            <div className="text-xs text-red-600 mt-1">Pastikan backend berjalan di port 8080.</div>
          </div>
        </div>
      )}

      {!error && tasks.length > 0 && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <DndContext sensors={sensors} collisionDetection={closestCorners}
            onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 h-full">
              {COLUMNS.map((col) => (
                <Column key={col.id} column={col} tasks={grouped[col.id] || []}
                  sprintStatusMap={sprintStatusMap}
                  onOpen={(task) => { setSelectedTask(task); setOpenDetail(true) }} />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {!isLoading && !error && tasks.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-tosca-50 flex items-center justify-center mx-auto mb-4">
              <LayoutGrid className="w-10 h-10 text-tosca-400" />
            </div>
            <h3 className="text-base font-semibold text-ink-800 mb-1">
              {myTasksOnly ? 'Anda belum punya task' : 'Belum ada task di Kanban'}
            </h3>
            <p className="text-sm text-ink-500 mb-5">
              {myTasksOnly
                ? <>Coba matikan filter "Tugas Saya".</>
                : <>Task muncul setelah <strong>sprint dimulai</strong>. Buka halaman Sprints & klik ▶ Mulai Sprint.</>}
            </p>
            <button onClick={() => navigate('/sprints')}
              className="px-5 py-2.5 rounded-lg bg-tosca-600 text-white text-sm font-medium hover:bg-tosca-700 transition">
              Buka Sprints
            </button>
          </div>
        </div>
      )}

      <TaskDetailModal open={openDetail} task={selectedTask}
        onClose={() => { setOpenDetail(false); setSelectedTask(null) }}
        onEdit={openEdit} onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        canEdit={isManagerOrAdmin || selectedTask?.assignee_name === user?.name} />

      <TaskFormModal open={openForm}
        onClose={() => { setOpenForm(false); setEditingTask(null) }}
        task={editingTask} defaultStatus="todo" onSave={handleUpdate} />
    </div>
  )
}