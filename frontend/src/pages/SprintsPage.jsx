import { useState, useMemo, useEffect } from 'react'
import {
  Timer, TrendingUp, CheckCircle2, Circle, Play, Pause, Trash2, Calendar,
  Info, Archive, ArrowRight, AlertCircle, Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, fmtDate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import {
  useSprints, useDeleteSprint, useStartSprint, useCompleteSprint,
  useTasks, useUsers, useUpdateTaskStatus, useUpdateTaskProgress,
  useAssignTasksToSprint
} from '@/lib/taskApi'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

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

function computeTaskScore(task) {
  const maxScore = getObjectiveScore(task.objective)
  const progress = task.progress_level || 'not_started'
  if (progress === 'done') return maxScore
  if (progress === 'almost_done') return Math.floor(maxScore / 2)
  return 0
}

const KANBAN_COLUMNS = [
  { id: 'todo',        label: 'To Do',       color: '#2DD4BF' },
  { id: 'in_progress', label: 'In Progress', color: '#0D9488' },
  { id: 'review',      label: 'Review',      color: '#F59E0B' },
  { id: 'done',        label: 'Done',        color: '#10B981' }
]

function mapStatusToColumn(status) {
  if (status === 'backlog') return 'todo'
  if (status === 'todo') return 'todo'
  return status
}

const STATUS_META = {
  backlog:   { badge: 'slate', label: 'Belum Dimulai', icon: Circle,       color: 'bg-ink-100 text-ink-500' },
  active:    { badge: 'tosca', label: 'Aktif',         icon: TrendingUp,   color: 'bg-tosca-100 text-tosca-700' },
  completed: { badge: 'green', label: 'Selesai',       icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { badge: 'red',   label: 'Dibatalkan',    icon: Pause,        color: 'bg-red-100 text-red-700' }
}

const STATUS_PRIORITY = { active: 0, backlog: 1 }

function calcProgress(sprint) {
  if (!sprint.total_points || sprint.total_points === 0) return 0
  return Math.min((sprint.completed_points / sprint.total_points) * 100, 100)
}

function getSprintId(t) {
  const v = t.sprint_id ?? t.sprintId ?? t.sprint?.id
  return v != null && Number(v) > 0 ? Number(v) : null
}

function isMine(t, user) {
  if (!user) return false
  if (t.assignee_id != null && user.id != null && String(t.assignee_id) === String(user.id)) return true
  return !!t.assignee_name && t.assignee_name === user.name
}

const TASK_STATUS_LABEL = {
  backlog: 'To Do',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done'
}

function buildStatusBreakdown(taskList) {
  const b = { todo: 0, in_progress: 0, review: 0, done: 0 }
  taskList.forEach((t) => {
    const col = mapStatusToColumn(t.status)
    if (b[col] !== undefined) b[col] += 1
  })
  return b
}

// Task -> state tampilan kartu (disamakan dengan state sprint)
function getTaskCardState(task) {
  if (task.status === 'done') return 'completed'
  if (task.status === 'in_progress' || task.status === 'review') return 'active'
  return 'backlog'
}

// ============================================================
// ⭐ EntityCard — SATU model kartu untuk Sprint & Task
// Dipakai oleh kartu sprint dan kartu task supaya tampilan
// selalu konsisten. Ubah desain kartu cukup di sini.
// ============================================================
const ACTION_VARIANT = {
  primary:   'bg-tosca-600 text-white hover:bg-tosca-700',
  secondary: 'bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200',
  success:   'bg-emerald-600 text-white hover:bg-emerald-700'
}

const STATE_FOOTER = {
  completed: { text: 'Selesai',     icon: CheckCircle2, cls: 'text-emerald-600' },
  active:    { text: 'Berjalan',    icon: TrendingUp,   cls: 'text-tosca-600' },
  backlog:   { text: 'Belum Mulai', icon: Circle,       cls: 'text-ink-500' }
}

function EntityCard({
  icon: Icon,
  iconClass,
  title,
  subtitle,
  badgeColor,
  badgeLabel,
  description,
  startDate,
  endDate,
  showBreakdown,
  breakdown,
  completedPoints,
  totalPoints,
  state,
  onClick,
  actions
}) {
  const isCompleted = state === 'completed'
  const isActive = state === 'active'
  const pct = totalPoints > 0 ? Math.min((completedPoints / totalPoints) * 100, 100) : 0
  const bd = breakdown || { todo: 0, in_progress: 0, review: 0, done: 0 }
  const footer = STATE_FOOTER[state] || STATE_FOOTER.backlog
  const FooterIcon = footer.icon

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl border shadow-sm p-6 hover:shadow-md transition cursor-pointer',
        isCompleted ? 'border-emerald-100 opacity-95 hover:border-emerald-200'
          : isActive ? 'border-tosca-200 ring-1 ring-tosca-100 hover:border-tosca-300'
          : 'border-ink-100 hover:border-tosca-200'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconClass)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-ink-800 truncate">{title}</h3>
            <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <Badge color={badgeColor}>{badgeLabel}</Badge>
      </div>

      <p className="text-sm text-ink-600 mb-4 line-clamp-2">{description}</p>

      <div className="flex items-center gap-2 text-xs text-ink-500 mb-4">
        <Calendar className="w-3.5 h-3.5" />
        {startDate ? fmtDate(startDate) : '-'} → {endDate ? fmtDate(endDate) : '-'}
      </div>

      {showBreakdown && (
        <div className="mb-3 p-2.5 rounded-lg bg-ink-50 border border-ink-100">
          <div className="text-[9px] uppercase tracking-wider text-ink-400 font-bold mb-1.5">
            Status Task (sama dengan Kanban)
          </div>
          <div className="grid grid-cols-4 gap-2">
            {KANBAN_COLUMNS.map((c) => (
              <div key={c.id} className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                  <span className="text-[9px] text-ink-500 font-medium">{c.label}</span>
                </div>
                <div className={cn('text-base font-bold',
                  (bd[c.id] || 0) > 0 ? 'text-ink-800' : 'text-ink-300')}>
                  {bd[c.id] || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-ink-500">SP Score</span>
        <span className="font-medium text-ink-800">
          {completedPoints} / {totalPoints} SP
        </span>
      </div>
      <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all',
            isCompleted ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
              : 'bg-gradient-to-r from-tosca-400 to-tosca-600')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <div className="text-[11px] text-ink-400">{pct.toFixed(0)}% selesai</div>
        <div className={cn('text-[11px] font-medium flex items-center gap-1', footer.cls)}>
          <FooterIcon className="w-3 h-3" /> {footer.text}
        </div>
      </div>

      <div
        className="mt-4 pt-4 border-t border-ink-100 flex items-center gap-2 flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        {actions.map((a) => {
          const ActionIcon = a.icon
          return (
            <button
              key={a.key}
              onClick={a.onClick}
              disabled={a.disabled}
              title={a.title}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition',
                ACTION_VARIANT[a.variant]
              )}
            >
              <ActionIcon className="w-3.5 h-3.5" /> {a.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function SprintsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [tab, setTab] = useState('active')

  const { data: rawSprints = [], isLoading: loadingSprints, error } = useSprints()
  const { data: allTasks = [], isLoading: loadingTasks } = useTasks()
  const { data: users = [], isLoading: loadingUsers } = useUsers()
  const deleteSprint = useDeleteSprint()
  const startSprint = useStartSprint()
  const completeSprint = useCompleteSprint()
  const updateStatus = useUpdateTaskStatus()
  const updateProgress = useUpdateTaskProgress()
  const assignTasksToSprint = useAssignTasksToSprint()
  const [bulkBusy, setBulkBusy] = useState(false)
  const [busyTaskId, setBusyTaskId] = useState(null)

  const isLoading = loadingSprints || loadingTasks || loadingUsers

  const role = String(user?.role || '').toLowerCase().replace(/[\s_-]/g, '')
  const isSuperAdmin = role === 'superadmin' || role === 'admin'
  const isManager = role === 'manager'
  const myDept = user?.department_id ?? user?.department ?? null

  // ============================================================
  // ⭐ sprintByProject — map project_id → sprint_id terbaik
  // ============================================================
  const sprintByProject = useMemo(() => {
    const m = {}
    const sorted = [...rawSprints].sort((a, b) => {
      const pa = a.status === 'active' ? 0 : a.status === 'backlog' ? 1 : 99
      const pb = b.status === 'active' ? 0 : b.status === 'backlog' ? 1 : 99
      if (pa !== pb) return pa - pb
      return a.id - b.id
    })
    sorted.forEach((s) => {
      const key = String(s.project_id)
      if (m[key] === undefined) {
        m[key] = Number(s.id)
      }
    })
    return m
  }, [rawSprints])

  // ============================================================
  // ⭐ tasksWithSprint — enrich task dengan VIRTUAL sprint
  // ============================================================
  const tasksWithSprint = useMemo(() => {
    return allTasks.map((t) => {
      if (getSprintId(t) !== null) return t
      const hasAssignee = t.assignee_name && String(t.assignee_name).trim() !== ''
      if (!hasAssignee) return t

      const vsid = sprintByProject[String(t.project_id)]
      if (!vsid) return t
      return { ...t, sprint_id: vsid, _virtual: true }
    })
  }, [allTasks, sprintByProject])

  // ============================================================
  // ⭐ FIX visibleTasks
  // ============================================================
  const visibleTasks = useMemo(() => {
    if (isSuperAdmin) return tasksWithSprint

    if (isManager && myDept != null) {
      const deptUserIds = new Set(
        users
          .filter((u) => (u.department_id ?? u.department) === myDept)
          .map((u) => u.id)
      )
      const deptUserNames = new Set(
        users
          .filter((u) => (u.department_id ?? u.department) === myDept)
          .map((u) => u.name)
      )
      return tasksWithSprint.filter((t) => {
        if (isMine(t, user)) return true
        if (t.assignee_id != null && deptUserIds.has(Number(t.assignee_id))) return true
        if (t.assignee_name && deptUserNames.has(t.assignee_name)) return true
        return false
      })
    }

    return tasksWithSprint.filter((t) => isMine(t, user))
  }, [tasksWithSprint, users, user, isSuperAdmin, isManager, myDept])

  // ============================================================
  // allSprints
  // ============================================================
  const allSprints = useMemo(() => {
    const computeCompleted = (s, sprintTasks) => {
      const taskScore = sprintTasks.reduce((sum, t) => sum + computeTaskScore(t), 0)
      if (s.status === 'active') {
        if (sprintTasks.length === 0) return 0
        return Math.max(taskScore, 1)
      }
      return taskScore
    }

    const buildSprintData = (s, sprintTasks) => {
      const total_points = sprintTasks.reduce(
        (sum, t) => sum + getObjectiveScore(t.objective), 0
      )
      const completed_points = computeCompleted(s, sprintTasks)
      const statusBreakdown = buildStatusBreakdown(sprintTasks)
      return {
        ...s,
        total_points,
        completed_points,
        task_count: sprintTasks.length,
        statusBreakdown
      }
    }

    if (isSuperAdmin) {
      return rawSprints.map((s) => {
        const sprintTasks = tasksWithSprint.filter((t) => getSprintId(t) === Number(s.id))
        return buildSprintData(s, sprintTasks)
      })
    }

    if (isManager) {
      return rawSprints
        .map((s) => {
          const sprintTasksAll = tasksWithSprint.filter((t) => getSprintId(t) === Number(s.id))
          if (sprintTasksAll.length === 0) return null
          const hasDeptTask = sprintTasksAll.some(
            (t) => visibleTasks.some((v) => v.id === t.id)
          )
          if (!hasDeptTask) return null
          const deptTasks = sprintTasksAll.filter(
            (t) => visibleTasks.some((v) => v.id === t.id)
          )
          return buildSprintData(s, deptTasks)
        })
        .filter(Boolean)
    }

    return rawSprints
      .map((s) => {
        const sprintTasksAll = tasksWithSprint.filter((t) => getSprintId(t) === Number(s.id))
        if (sprintTasksAll.length === 0) return null
        const hasMyTask = sprintTasksAll.some((t) => isMine(t, user))
        if (!hasMyTask) return null
        return buildSprintData(s, sprintTasksAll)
      })
      .filter(Boolean)
  }, [rawSprints, tasksWithSprint, visibleTasks, isSuperAdmin, isManager, myDept, user])

  // ============================================================
  // unsprintedTasks
  // ============================================================
  const unsprintedTasks = useMemo(() => {
    const sprintIds = new Set(rawSprints.map((s) => Number(s.id)))
    return visibleTasks.filter((t) => {
      const hasAssignee = t.assignee_name && String(t.assignee_name).trim() !== ''
      if (!hasAssignee) return false
      const sid = getSprintId(t)
      return sid == null || !sprintIds.has(sid)
    })
  }, [visibleTasks, rawSprints])

  const activeSprints = useMemo(
    () => allSprints.filter((s) => s.status === 'active' || s.status === 'backlog'),
    [allSprints]
  )

  const archiveSprints = useMemo(
    () => allSprints.filter((s) => s.status === 'completed' || s.status === 'cancelled'),
    [allSprints]
  )

  useEffect(() => {
    if (isLoading) return
    if (tab === 'active' && activeSprints.length === 0 && archiveSprints.length > 0) {
      setTab('archive')
    }
  }, [isLoading, tab, activeSprints.length, archiveSprints.length])

  const displaySprints = tab === 'active' ? activeSprints : archiveSprints

  const sprints = useMemo(() => {
    return [...displaySprints].sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status] ?? 99
      const pb = STATUS_PRIORITY[b.status] ?? 99
      if (pa !== pb) return pa - pb
      return b.id - a.id
    })
  }, [displaySprints])

  const stats = {
    active: activeSprints.filter((s) => s.status === 'active').length,
    backlog: activeSprints.filter((s) => s.status === 'backlog').length,
    archive: archiveSprints.length
  }

  // ============================================================
  // Handlers
  // ============================================================
  const handleDelete = (s) => {
    if (!confirm(`Hapus sprint "${s.name}"?\n\nTindakan ini tidak bisa dibatalkan.`)) return
    deleteSprint.mutate(s.id, {
      onSuccess: () => { toast.success('Sprint berhasil dihapus'); setDetail(null) },
      onError: (e) => toast.error(e.response?.data?.message || 'Gagal hapus sprint')
    })
  }

  const handleStart = async (s) => {
    const sprintTasks = tasksWithSprint.filter((t) => getSprintId(t) === Number(s.id))
    const taskCount = sprintTasks.length

    if (taskCount === 0) {
      toast.error('Sprint ini belum punya task. Assign task dulu dari Backlog.')
      return
    }

    if (!confirm(
      `Mulai sprint "${s.name}"?\n\n` +
      `✓ ${taskCount} task akan masuk kolom "In Progress"\n` +
      `✓ Sprint aktif = 1 SP\n` +
      `✓ Task dapat SP penuh saat Done`
    )) return

    const virtualTaskIds = sprintTasks.filter((t) => t._virtual).map((t) => t.id)

    try {
      if (virtualTaskIds.length > 0) {
        await assignTasksToSprint.mutateAsync({
          sprintId: s.id,
          taskIds: virtualTaskIds
        })
      }
      await startSprint.mutateAsync(s.id)
      toast.success('Sprint dimulai! Task sudah muncul di Kanban Board.')
      setDetail(null)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal mulai sprint')
    }
  }

  const handleAlmostDone = async (s) => {
    const sprintTasks = tasksWithSprint.filter((t) => getSprintId(t) === Number(s.id))
    const targetTasks = sprintTasks.filter(
      (t) => t.status !== 'done' && t.status !== 'review'
    )

    if (targetTasks.length === 0) {
      toast.error('Tidak ada task yang perlu diubah (semua sudah Review/Done)')
      return
    }

    if (!confirm(
      `Tandai sprint "${s.name}" hampir selesai (Almost Done)?\n\n` +
      `${targetTasks.length} task akan dipindah ke kolom "Review" dengan SP ½ × objective.`
    )) return

    setBulkBusy(true)
    try {
      const virtualIds = targetTasks.filter((t) => t._virtual).map((t) => t.id)
      if (virtualIds.length > 0) {
        await assignTasksToSprint.mutateAsync({
          sprintId: s.id,
          taskIds: virtualIds
        })
      }

      for (const t of targetTasks) {
        await updateProgress.mutateAsync({ id: t.id, progress_level: 'almost_done' })
        await updateStatus.mutateAsync({ id: t.id, status: 'review' })
      }
      toast.success(`${targetTasks.length} task dipindah ke "Review" (SP ½)`)
      setDetail(null)
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Gagal mengubah status task')
    } finally {
      setBulkBusy(false)
    }
  }

  const handleComplete = async (s) => {
    const sprintTasks = tasksWithSprint.filter((t) => getSprintId(t) === Number(s.id))
    const notDone = sprintTasks.filter((t) => t.status !== 'done')

    if (!confirm(
      `Selesaikan sprint "${s.name}"?\n\n` +
      `✓ ${notDone.length} task akan ditandai "Done" (SP penuh)\n` +
      `✓ Sprint akan ditandai SELESAI & pindah ke arsip\n` +
      `✓ Task TETAP muncul di Kanban Board`
    )) return

    setBulkBusy(true)
    try {
      const virtualIds = notDone.filter((t) => t._virtual).map((t) => t.id)
      if (virtualIds.length > 0) {
        await assignTasksToSprint.mutateAsync({
          sprintId: s.id,
          taskIds: virtualIds
        })
      }

      for (const t of notDone) {
        await updateProgress.mutateAsync({ id: t.id, progress_level: 'done' })
        await updateStatus.mutateAsync({ id: t.id, status: 'done' })
      }
      await completeSprint.mutateAsync(s.id)
      toast.success('Sprint selesai! Semua task berstatus Done (SP penuh).')
      setDetail(null)
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Gagal selesaikan sprint')
    } finally {
      setBulkBusy(false)
    }
  }

  const changeTaskStatus = async (t, status) => {
    setBusyTaskId(t.id)
    try {
      const progressMap = {
        'in_progress': 'in_progress',
        'review': 'almost_done',
        'done': 'done',
        'todo': 'not_started',
        'backlog': 'not_started'
      }
      await updateProgress.mutateAsync({ id: t.id, progress_level: progressMap[status] || 'not_started' })
      await updateStatus.mutateAsync({ id: t.id, status })
      toast.success(`"${t.title}" dipindah ke "${TASK_STATUS_LABEL[status]}"`)
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Gagal mengubah status task')
    } finally {
      setBusyTaskId(null)
    }
  }

  // ============================================================
  // Builder props kartu (sprint & task → EntityCard yang sama)
  // ============================================================
  const buildSprintCardProps = (s) => {
    const style = STATUS_META[s.status] || STATUS_META.backlog
    const isActive = s.status === 'active'
    const isBacklog = s.status === 'backlog'
    const state = s.status === 'completed' ? 'completed' : isActive ? 'active' : 'backlog'

    return {
      icon: style.icon,
      iconClass: style.color,
      title: s.name,
      subtitle: (
        <>
          SPR-{s.id} · Project #{s.project_id}
          {s.task_count > 0 && <> · {s.task_count} task</>}
        </>
      ),
      badgeColor: style.badge,
      badgeLabel: style.label,
      description: s.goal || 'Tidak ada goal',
      startDate: s.start_date,
      endDate: s.end_date,
      showBreakdown: s.task_count > 0,
      breakdown: s.statusBreakdown,
      completedPoints: s.completed_points,
      totalPoints: s.total_points,
      state,
      onClick: () => setDetail(s),
      actions: [
        {
          key: 'start', label: 'Mulai', icon: Play, variant: 'primary',
          onClick: () => handleStart(s),
          disabled: !isBacklog || startSprint.isPending,
          title: isBacklog ? 'Mulai sprint' : 'Hanya untuk sprint yang belum dimulai'
        },
        {
          key: 'almost', label: 'Almost Done', icon: Zap, variant: 'secondary',
          onClick: () => handleAlmostDone(s),
          disabled: !isActive || bulkBusy,
          title: isActive ? 'Pindahkan semua task ke Review (SP ½)' : 'Hanya untuk sprint aktif'
        },
        {
          key: 'complete', label: 'Selesaikan', icon: CheckCircle2, variant: 'success',
          onClick: () => handleComplete(s),
          disabled: !isActive || bulkBusy || completeSprint.isPending,
          title: isActive ? 'Selesaikan semua task (SP penuh) & tutup sprint' : 'Hanya untuk sprint aktif'
        }
      ]
    }
  }

  const buildTaskCardProps = (t) => {
    const state = getTaskCardState(t)
    const style = STATUS_META[state === 'completed' ? 'completed' : state] || STATUS_META.backlog
    const canStart = t.status === 'todo' || t.status === 'backlog'
    const canAlmost = canStart || t.status === 'in_progress'
    const canDone = t.status !== 'done'
    const busy = busyTaskId === t.id
    const col = mapStatusToColumn(t.status)
    const breakdown = { todo: 0, in_progress: 0, review: 0, done: 0 }
    if (breakdown[col] !== undefined) breakdown[col] = 1

    return {
      icon: style.icon,
      iconClass: style.color,
      title: t.title,
      subtitle: (
        <>
          MON-{t.id} · Project #{t.project_id}
          {t.assignee_name && <> · {t.assignee_name}</>}
        </>
      ),
      badgeColor: style.badge,
      badgeLabel: style.label,
      description: t.description || t.goal || 'Tidak ada deskripsi',
      startDate: t.start_date,
      endDate: t.due_date,
      showBreakdown: true,
      breakdown,
      completedPoints: computeTaskScore(t),
      totalPoints: getObjectiveScore(t.objective),
      state,
      onClick: () => navigate('/board'),
      actions: [
        {
          key: 'start', label: 'Mulai', icon: Play, variant: 'primary',
          onClick: () => changeTaskStatus(t, 'in_progress'),
          disabled: !canStart || busy,
          title: 'Mulai task'
        },
        {
          key: 'almost', label: 'Almost Done', icon: Zap, variant: 'secondary',
          onClick: () => changeTaskStatus(t, 'review'),
          disabled: !canAlmost || busy,
          title: 'Pindahkan task ke Review (SP ½)'
        },
        {
          key: 'complete', label: 'Selesaikan', icon: CheckCircle2, variant: 'success',
          onClick: () => changeTaskStatus(t, 'done'),
          disabled: !canDone || busy,
          title: 'Selesaikan task (SP penuh)'
        }
      ]
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
        <Spinner label="Memuat sprint..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong>Gagal memuat data:</strong> {error.message}
            <div className="text-xs text-red-600 mt-1">Pastikan backend berjalan di port 8080.</div>
          </div>
        </div>
      </div>
    )
  }

  if (allSprints.length === 0 && unsprintedTasks.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink-800">Sprints</h1>
          <p className="text-sm text-ink-500 mt-1">Kelola grup task untuk tim</p>
        </div>
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-ink-200">
          <div className="w-20 h-20 rounded-2xl bg-tosca-50 flex items-center justify-center mx-auto mb-4">
            <Timer className="w-10 h-10 text-tosca-400" />
          </div>
          <h3 className="text-base font-semibold text-ink-800 mb-1">Belum ada sprint</h3>
          <p className="text-sm text-ink-500 max-w-md mx-auto mb-5">
            Sprint dibuat oleh admin/manager.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-800">Sprints</h1>
        <p className="text-sm text-ink-500 mt-1">
          Kelola grup task untuk tim —{' '}
          <span className="text-tosca-700 font-medium">{stats.active} sprint aktif</span>
          {stats.backlog > 0 && <> · <span className="text-ink-600">{stats.backlog} belum dimulai</span></>}
          {stats.archive > 0 && <> · <span className="text-emerald-600">{stats.archive} di arsip</span></>}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white rounded-xl border border-ink-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-tosca-100 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-tosca-700" />
            </div>
            <span className="text-xs text-ink-500">Sprint Aktif</span>
          </div>
          <div className="text-2xl font-bold text-tosca-700">{stats.active}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-ink-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-ink-100 flex items-center justify-center">
              <Circle className="w-3.5 h-3.5 text-ink-500" />
            </div>
            <span className="text-xs text-ink-500">Belum Dimulai</span>
          </div>
          <div className="text-2xl font-bold text-ink-500">{stats.backlog}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-ink-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <span className="text-xs text-ink-500">Selesai (arsip)</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.archive}</div>
        </div>
      </div>

      <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-tosca-50 to-white border border-tosca-100 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-tosca-600 flex items-center justify-center text-white shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink-800">Cara Kerja Sprint & Perhitungan SP</div>
          <div className="text-xs text-ink-600 mt-0.5">
            <strong>Assign task ke sprint</strong> → 0 SP.{' '}
            <strong>▶ Mulai Sprint</strong> → sprint 1 SP.{' '}
            <strong>⚡ Almost Done</strong> → task ½ SP.{' '}
            <strong>✓ Task Done</strong> → task <strong>SP penuh</strong> sesuai objective
            (Daily=1, Troubleshooting=8, Compliance=20, Improvement=20, New Project=60).
          </div>
        </div>
      </div>

      {allSprints.length > 0 && (
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('active')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2',
                tab === 'active' ? 'bg-tosca-600 text-white shadow-sm'
                  : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50'
              )}
            >
              <TrendingUp className="w-4 h-4" />
              Aktif & Backlog
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                tab === 'active' ? 'bg-white/20' : 'bg-ink-100')}>{activeSprints.length}</span>
            </button>
            <button
              onClick={() => setTab('archive')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2',
                tab === 'archive' ? 'bg-tosca-600 text-white shadow-sm'
                  : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50'
              )}
            >
              <Archive className="w-4 h-4" />
              Arsip
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                tab === 'archive' ? 'bg-white/20' : 'bg-ink-100')}>{archiveSprints.length}</span>
            </button>
          </div>
        </div>
      )}

      {sprints.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {sprints.map((s) => (
            <EntityCard key={`sprint-${s.id}`} {...buildSprintCardProps(s)} />
          ))}
        </div>
      )}

      {allSprints.length > 0 && sprints.length === 0 && tab === 'active' && (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-ink-200">
          <div className="w-20 h-20 rounded-2xl bg-tosca-50 flex items-center justify-center mx-auto mb-4">
            <Timer className="w-10 h-10 text-tosca-400" />
          </div>
          <h3 className="text-base font-semibold text-ink-800 mb-1">Tidak ada sprint aktif atau backlog</h3>
          <p className="text-sm text-ink-500 max-w-md mx-auto mb-5">Semua sprint sudah selesai.</p>
          {archiveSprints.length > 0 && (
            <button
              onClick={() => setTab('archive')}
              className="px-5 py-2.5 rounded-lg bg-tosca-600 text-white text-sm font-medium hover:bg-tosca-700 transition inline-flex items-center gap-2"
            >
              <Archive className="w-4 h-4" /> Lihat {archiveSprints.length} Sprint di Arsip <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {allSprints.length > 0 && sprints.length === 0 && tab === 'archive' && (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-ink-200">
          <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Archive className="w-10 h-10 text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-ink-800 mb-1">Belum ada sprint selesai</h3>
          <p className="text-sm text-ink-500 max-w-md mx-auto mb-5">Sprint yang sudah diselesaikan akan muncul di sini.</p>
          {activeSprints.length > 0 && (
            <button
              onClick={() => setTab('active')}
              className="px-5 py-2.5 rounded-lg bg-tosca-600 text-white text-sm font-medium hover:bg-tosca-700 transition inline-flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" /> Lihat {activeSprints.length} Sprint Aktif <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Task yang belum masuk sprint — memakai EntityCard yang sama persis */}
      {unsprintedTasks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          {unsprintedTasks.map((t) => (
            <EntityCard key={`task-${t.id}`} {...buildTaskCardProps(t)} />
          ))}
        </div>
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? detail.name : ''}
        size="md"
        footer={
          detail && (
            <div className="flex justify-between items-center">
              <Button variant="danger" size="sm" onClick={() => handleDelete(detail)}
                disabled={detail.status === 'active'}
                title={detail.status === 'active' ? 'Tidak bisa hapus sprint aktif' : ''}>
                <Trash2 className="w-4 h-4" /> Hapus
              </Button>
              <div className="flex gap-2">
                {detail.status === 'backlog' && (
                  <Button size="sm" onClick={() => handleStart(detail)} loading={startSprint.isPending}>
                    <Play className="w-4 h-4" /> Mulai Sprint
                  </Button>
                )}
                {detail.status === 'active' && (
                  <Button size="sm" variant="secondary" onClick={() => handleAlmostDone(detail)} loading={bulkBusy}>
                    <Zap className="w-4 h-4" /> Almost Done
                  </Button>
                )}
                {detail.status === 'active' && (
                  <Button size="sm" onClick={() => handleComplete(detail)} loading={bulkBusy || completeSprint.isPending}>
                    <CheckCircle2 className="w-4 h-4" /> Selesaikan Sprint
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setDetail(null)}>Tutup</Button>
              </div>
            </div>
          )
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color={STATUS_META[detail.status]?.badge || 'slate'}>
                {STATUS_META[detail.status]?.label || detail.status}
              </Badge>
              <Badge color="tosca">SPR-{detail.id}</Badge>
              <Badge color="purple">Project #{detail.project_id}</Badge>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">🎯 Goal</h4>
              <p className="text-sm text-ink-700 leading-relaxed">{detail.goal || 'Tidak ada goal'}</p>
            </div>

            {detail.task_count > 0 && detail.statusBreakdown && (
              <div className="p-3 rounded-xl bg-ink-50 border border-ink-100">
                <div className="text-[10px] uppercase tracking-wider text-ink-400 font-bold mb-2">
                  Status Task di Kanban
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {KANBAN_COLUMNS.map((c) => (
                    <div key={c.id} className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                        <span className="text-[10px] text-ink-500">{c.label}</span>
                      </div>
                      <div className={cn('text-lg font-bold',
                        (detail.statusBreakdown[c.id] || 0) > 0 ? 'text-ink-800' : 'text-ink-300')}>
                        {detail.statusBreakdown[c.id] || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-ink-50 border border-ink-100">
              <div>
                <div className="text-xs text-ink-500 mb-1">Start</div>
                <div className="text-sm font-medium text-ink-800">
                  {detail.start_date ? fmtDate(detail.start_date) : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-ink-500 mb-1">End</div>
                <div className="text-sm font-medium text-ink-800">
                  {detail.end_date ? fmtDate(detail.end_date) : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-ink-500 mb-1">Completed SP</div>
                <div className="text-sm font-bold text-tosca-700">{detail.completed_points} SP</div>
              </div>
              <div>
                <div className="text-xs text-ink-500 mb-1">Total SP</div>
                <div className="text-sm font-medium text-ink-800">{detail.total_points} SP</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-ink-500 font-medium">Progress</span>
                <span className="font-bold text-tosca-700">{calcProgress(detail).toFixed(0)}%</span>
              </div>
              <div className="h-2.5 bg-ink-100 rounded-full overflow-hidden">
                <div className={cn('h-full transition-all',
                  detail.status === 'completed'
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                    : 'bg-gradient-to-r from-tosca-400 to-tosca-600')}
                  style={{ width: `${calcProgress(detail)}%` }} />
              </div>
            </div>

            <div className={cn(
              'p-4 rounded-xl text-xs leading-relaxed',
              detail.status === 'backlog' && 'bg-tosca-50 border border-tosca-100 text-tosca-700',
              detail.status === 'active' && 'bg-amber-50 border border-amber-100 text-amber-800',
              detail.status === 'completed' && 'bg-emerald-50 border border-emerald-100 text-emerald-800',
              detail.status === 'cancelled' && 'bg-red-50 border border-red-100 text-red-700'
            )}>
              {detail.status === 'backlog' && (
                <>
                  <strong>💡 Sprint belum dimulai</strong>
                  <br />
                  Klik <strong>▶ Mulai Sprint</strong> supaya sprint aktif (1 SP) & task masuk In Progress.
                </>
              )}
              {detail.status === 'active' && (
                <>
                  <strong>🔥 Sprint sedang berjalan</strong>
                  <br />
                  Klik <strong>⚡ Almost Done</strong> → semua task pindah Review (SP ½).{' '}
                  Klik <strong>✓ Selesaikan Sprint</strong> → semua task Done (SP penuh) & sprint tutup.
                </>
              )}
              {detail.status === 'completed' && (
                <>
                  <strong>✅ Sprint sudah selesai</strong>
                  <br />
                  Completed SP = SUM(task done).
                </>
              )}
              {detail.status === 'cancelled' && (
                <>
                  <strong>⛔ Sprint dibatalkan</strong>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
