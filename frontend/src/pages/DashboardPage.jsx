import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import NotificationBell from '@/components/notifications/NotificationBell'
import {
  Briefcase, Clock, Activity, CheckCircle2, AlertTriangle,
  TrendingUp, Users, Timer, Calendar as CalIcon,
  ArrowRight, Target, Zap
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts'
import { cn, fmtDate, initials, getObjectiveMeta } from '@/lib/utils'
import Spinner from '@/components/ui/Spinner'
import { useTasks, useSprints, useUsers } from '@/lib/taskApi'

// ============================================================
// Colors
// ============================================================
const STATUS_COLORS = {
  backlog:     '#94A3B8',
  todo:        '#2DD4BF',
  in_progress: '#0D9488',
  review:      '#F59E0B',
  done:        '#10B981'
}

const STATUS_LABELS = {
  backlog:     'Backlog',
  todo:        'To Do',
  in_progress: 'In Progress',
  review:      'Review',
  done:        'Done'
}

// ============================================================
// ⭐ FIX 1: Fungsi Overdue yang Akurat (Hanya Bandingkan Tanggal)
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

// ============================================================
// Helper: Hitung SP yang Diperoleh (Earned SP) berdasarkan progress
// ============================================================
function computeTaskScore(task) {
  const objective = getObjectiveMeta(task.objective)
  const maxPoints = objective.points || 0
  
  switch (task.progress_level) {
    case 'done':        return maxPoints
    case 'almost_done': return Math.floor(maxPoints / 2)
    case 'in_progress': return maxPoints > 0 ? 1 : 0 // Daily=1, lainnya=1 saat mulai
    default:            return 0
  }
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  // ============================================================
  // Fetch data
  // ============================================================
  const { data: allTasks = [], isLoading: loadingTasks } = useTasks()
  const { data: allSprints = [], isLoading: loadingSprints } = useSprints()
  const { data: users = [], isLoading: loadingUsers } = useUsers()

  const isLoading = loadingTasks || loadingSprints || loadingUsers

  // ============================================================
  // Role-based scope (SESSION & ROLE CHECK)
  // ============================================================
  const role = String(user?.role || '').toLowerCase().replace(/[\s_-]/g, '')
  const isSuperAdmin = role === 'superadmin' || role === 'admin'
  const isManager = role === 'manager'
  const myDept = user?.department_id ?? user?.department ?? null

  // ============================================================
  // Filter Tasks berdasarkan Role (if / else if / else)
  // ============================================================
  const tasks = useMemo(() => {
    // 1. ADMIN & SUPERADMIN: Lihat SEMUA task dari semua user
    if (isSuperAdmin) {
      return allTasks
    }

    // 2. MANAGER: Lihat task milik departemennya saja
    if (isManager && myDept != null) {
      const deptUserIds = new Set(
        users
          .filter((u) => (u.department_id ?? u.department) === myDept)
          .map((u) => String(u.id))
      )
      
      return allTasks.filter((t) => {
        if (String(t.assignee_id) === String(user?.id)) return true
        if (t.assignee_id != null && deptUserIds.has(String(t.assignee_id))) return true
        if (t.assignee_dept === myDept) return true
        return false
      })
    }

    // 3. MEMBER: Hanya lihat task miliknya sendiri
    return allTasks.filter((t) => {
      if (String(t.assignee_id) === String(user?.id)) return true
      if (t.assignee_id == null && t.assignee_name && t.assignee_name === user?.name) return true
      return false
    })
  }, [allTasks, users, user, isSuperAdmin, isManager, myDept])

  // ============================================================
  // Filter Sprints berdasarkan Role
  // ============================================================
  const sprints = useMemo(() => {
    if (isSuperAdmin) return allSprints

    return allSprints
      .map((s) => {
        const sprintTasks = tasks.filter((t) => t.sprint_id === s.id)
        if (sprintTasks.length === 0) return null
        
        const total_points = sprintTasks.reduce(
          (sum, t) => sum + (getObjectiveMeta(t.objective).points || 0), 0
        )
        const completed_points = sprintTasks
          .filter((t) => t.status === 'done')
          .reduce((sum, t) => sum + (getObjectiveMeta(t.objective).points || 0), 0)
          
        return { ...s, total_points, completed_points }
      })
      .filter(Boolean)
  }, [allSprints, tasks, isSuperAdmin])

  // ============================================================
  // Compute Stats
  // ============================================================
  const stats = useMemo(() => {
    const total = tasks.length
    const todo = tasks.filter((t) => t.status === 'todo').length
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length
    const review = tasks.filter((t) => t.status === 'review').length
    const done = tasks.filter((t) => t.status === 'done').length
    
    // ⭐ Menggunakan fungsi lokal isTaskOverdue
    const overdue = tasks.filter((t) => {
      const due = t.due_date || t.due
      return due && isTaskOverdue(due) && t.status !== 'done'
    }).length

    return { total, todo, inProgress, review, done, overdue }
  }, [tasks])

  // ============================================================
  // Progress per Project
  // ============================================================
  const projectProgress = useMemo(() => {
    const map = new Map()
    tasks.forEach((t) => {
      const proj = t.project_name || `Project #${t.project_id}`
      if (!map.has(proj)) {
        map.set(proj, { name: proj, total: 0, done: 0, score: 0, fullScore: 0 })
      }
      const p = map.get(proj)
      const objective = getObjectiveMeta(t.objective)
      p.total++
      p.fullScore += objective.points || 0
      p.score += computeTaskScore(t)
      if (t.status === 'done') p.done++
    })

    const arr = Array.from(map.values()).map((p) => ({
      name: p.name.length > 15 ? p.name.slice(0, 15) + '…' : p.name,
      full_name: p.name,
      progress: p.fullScore > 0 ? Math.round((p.score / p.fullScore) * 100) : 0,
      total: p.total,
      done: p.done
    }))

    return arr.sort((a, b) => b.progress - a.progress).slice(0, 8)
  }, [tasks])

  // ============================================================
  // Distribusi Status
  // ============================================================
  const statusDist = useMemo(() => {
    const dist = [
      { name: 'Backlog',     value: tasks.filter((t) => t.status === 'backlog').length,     color: STATUS_COLORS.backlog },
      { name: 'To Do',       value: tasks.filter((t) => t.status === 'todo').length,        color: STATUS_COLORS.todo },
      { name: 'In Progress', value: tasks.filter((t) => t.status === 'in_progress').length, color: STATUS_COLORS.in_progress },
      { name: 'Review',      value: tasks.filter((t) => t.status === 'review').length,      color: STATUS_COLORS.review },
      { name: 'Done',        value: tasks.filter((t) => t.status === 'done').length,        color: STATUS_COLORS.done }
    ].filter((s) => s.value > 0)
    return dist
  }, [tasks])

  // ============================================================
  // Employee Workload & Top Performers
  // ============================================================
  const workload = useMemo(() => {
    const map = new Map()
    tasks
      .filter((t) => t.assignee_name)
      .forEach((t) => {
        const name = t.assignee_name
        if (!map.has(name)) {
          const assigneeUser = users.find(u => String(u.id) === String(t.assignee_id));
          const deptName = t.assignee_dept || assigneeUser?.department || assigneeUser?.department_id || 'Tanpa Dept';

          map.set(name, { 
            name, 
            full_name: name,
            department: deptName,
            tasks: 0, 
            earnedSp: 0, 
            maxSp: 0, 
            active: 0 
          })
        }
        const w = map.get(name)
        const objective = getObjectiveMeta(t.objective)
        
        w.tasks++
        w.maxSp += objective.points || 0
        w.earnedSp += computeTaskScore(t)
        if (t.status !== 'done') w.active++
      })

    return Array.from(map.values()).sort((a, b) => b.earnedSp - a.earnedSp)
  }, [tasks, users])

  // ============================================================
  // Sprint Burndown
  // ============================================================
  const burndown = useMemo(() => {
    const activeSprint = sprints.find((s) => s.status === 'active')
    if (!activeSprint) return { sprint: null, data: [] }

    const start = activeSprint.start_date ? new Date(activeSprint.start_date) : null
    const end = activeSprint.end_date ? new Date(activeSprint.end_date) : null
    if (!start || !end) return { sprint: activeSprint, data: [] }

    const totalDays = Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)))
    const totalSP = activeSprint.total_points || 0
    const completedSP = activeSprint.completed_points || 0

    const today = new Date()
    const daysPassed = Math.max(0, Math.round((today - start) / (24 * 60 * 60 * 1000)))
    const daysClamped = Math.min(daysPassed, totalDays)

    const data = []
    for (let i = 0; i <= totalDays; i++) {
      const ideal = totalSP - (totalSP / totalDays) * i
      let actual = null
      if (i <= daysClamped) {
        if (daysClamped === 0) {
          actual = totalSP
        } else {
          actual = totalSP - (completedSP / daysClamped) * i
        }
      }
      data.push({
        day: `D${i + 1}`,
        ideal: Math.max(0, Math.round(ideal)),
        actual: actual !== null ? Math.max(0, Math.round(actual)) : null
      })
    }

    return { sprint: activeSprint, data }
  }, [sprints])

  // ============================================================
  // ⭐ FIX 2: Task Due Soon dengan Normalisasi Tanggal
  // ============================================================
  const dueSoon = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return tasks
      .filter((t) => (t.due_date || t.due) && t.status !== 'done')
      .map((t) => {
        const dueStr = t.due_date || t.due
        const due = new Date(dueStr)
        
        // Normalisasi due date ke tengah malam
        if (typeof dueStr === 'string' && dueStr.length === 10) {
          const [y, m, d] = dueStr.split('-')
          due.setFullYear(Number(y), Number(m) - 1, Number(d))
        }
        due.setHours(0, 0, 0, 0)

        const daysLeft = Math.round((due - today) / (24 * 60 * 60 * 1000))
        return { ...t, daysLeft, due: dueStr }
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5)
  }, [tasks])

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
        <Spinner label="Memuat dashboard..." />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* ===== HEADER ===== */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-800">Dashboard</h1>
          <p className="text-sm text-ink-500 mt-1">
            Selamat datang kembali,{' '}
            <span className="font-medium text-tosca-700">{user?.name}</span> 👋
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      </div>

      {/* ===== QUICK START BANNER ===== */}
      <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-tosca-50 via-white to-tosca-50 border border-tosca-100">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-2xl bg-tosca-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-ink-800">
              🎯 Alur Kerja WorkMonitor
            </h2>
            <p className="text-xs text-ink-600 mt-1">
              <strong>Backlog</strong> (buat task) → <strong>assign</strong> ke staff → muncul di{' '}
              <strong>Kanban</strong> → drag & drop hingga <strong>Done</strong> → pantau di sini.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate('/backlog')}
              className="px-3 py-1.5 rounded-lg bg-white border border-tosca-200 text-xs font-medium text-tosca-700 hover:bg-tosca-50 flex items-center gap-1.5"
            >
              Buka Backlog <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => navigate('/board')}
              className="px-3 py-1.5 rounded-lg bg-tosca-600 text-white text-xs font-medium hover:bg-tosca-700 flex items-center gap-1.5"
            >
              Buka Kanban <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ===== STAT CARDS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Total Pekerjaan"
          value={stats.total}
          icon={Briefcase}
          gradient="from-tosca-500 to-tosca-700"
          onClick={() => navigate('/backlog')}
        />
        <StatCard
          label="To Do"
          value={stats.todo}
          icon={Clock}
          gradient="from-sky-500 to-sky-700"
          onClick={() => navigate('/board')}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={Activity}
          gradient="from-amber-500 to-amber-700"
          onClick={() => navigate('/board')}
        />
        <StatCard
          label="Done"
          value={stats.done}
          icon={CheckCircle2}
          gradient="from-emerald-500 to-emerald-700"
          onClick={() => navigate('/board')}
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          gradient="from-red-500 to-red-700"
          highlight={stats.overdue > 0}
        />
      </div>

      {/* ===== CHARTS ROW 1 ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Progress per Project */}
        <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-ink-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-tosca-600" /> Progress per Project
            </h3>
            <span className="text-xs text-ink-500">
              {projectProgress.length} project
            </span>
          </div>

          {projectProgress.length === 0 ? (
            <EmptyChart message="Belum ada data project" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={projectProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0' }}
                  formatter={(v) => [`${v}%`, 'Progress']}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      const p = payload[0].payload
                      return `${p.full_name} (${p.done}/${p.total} task done)`
                    }
                    return label
                  }}
                />
                <Bar dataKey="progress" fill="#0D9488" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Distribusi Status */}
        <div className="p-6 bg-white rounded-2xl border border-ink-100 shadow-sm">
          <h3 className="font-semibold text-ink-800 mb-4">Distribusi Status</h3>

          {statusDist.length === 0 ? (
            <EmptyChart message="Belum ada task" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusDist}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {statusDist.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {statusDist.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-ink-600">{s.name}</span>
                    </div>
                    <span className="font-bold text-ink-800">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== CHARTS ROW 2 ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Employee Workload */}
        <div className="p-6 bg-white rounded-2xl border border-ink-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-tosca-600" /> Employee Workload
            </h3>
            <span className="text-xs text-ink-500">top {workload.length}</span>
          </div>

          {workload.length === 0 ? (
            <EmptyChart message="Belum ada task di-assign" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(240, workload.length * 50)}>
              <BarChart data={workload} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                <Tooltip
                  contentStyle={{ borderRadius: 10 }}
                  formatter={(v, n, p) => [
                    `${v} task (${p.payload.department} · ${p.payload.active} aktif · ${p.payload.earnedSp} SP diperoleh)`, 
                    p.payload.full_name
                  ]}
                />
                <Bar dataKey="tasks" fill="#14B8A6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sprint Burndown */}
        <div className="p-6 bg-white rounded-2xl border border-ink-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-800 flex items-center gap-2">
              <Timer className="w-4 h-4 text-tosca-600" /> Sprint Burndown
            </h3>
            {burndown.sprint && (
              <span className="text-xs text-tosca-700 font-medium truncate max-w-[150px]">
                {burndown.sprint.name}
              </span>
            )}
          </div>

          {!burndown.sprint || burndown.data.length === 0 ? (
            <EmptyChart message="Belum ada sprint aktif" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={burndown.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="ideal"
                    stroke="#94A3B8"
                    strokeDasharray="5 5"
                    dot={false}
                    name="Ideal"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#0D9488"
                    strokeWidth={2}
                    name="Actual"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-slate-400" style={{ borderStyle: 'dashed' }} />
                    <span className="text-ink-500">Ideal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-tosca-600" />
                    <span className="text-ink-500">Actual</span>
                  </div>
                </div>
                <span className="text-ink-600">
                  <strong className="text-tosca-700">{burndown.sprint.completed_points}</strong>
                  {' / '}
                  <strong>{burndown.sprint.total_points}</strong> SP
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== BOTTOM ROW: Due Soon + Top Performers ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Task Due Soon */}
        <div className="p-6 bg-white rounded-2xl border border-ink-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-800 flex items-center gap-2">
              <CalIcon className="w-4 h-4 text-tosca-600" /> Deadline Terdekat
            </h3>
            <button
              onClick={() => navigate('/sprints')}
              className="text-xs text-tosca-700 hover:underline font-medium flex items-center gap-1"
            >
              Lihat semua <ArrowRight className="w-3 h-3" />
            </button>
            <span className="text-xs text-ink-500">{dueSoon.length} task</span>
          </div>

          {dueSoon.length === 0 ? (
            <div className="text-center py-8 text-sm text-ink-400">
              Tidak ada task dengan deadline 🎉
            </div>
          ) : (
            <div className="space-y-2">
              {dueSoon.map((t) => {
                const objective = getObjectiveMeta(t.objective)
                // ⭐ Menggunakan daysLeft yang sudah dinormalisasi
                const isToday = t.daysLeft === 0
                const isOverdueTask = t.daysLeft < 0
                const urgent = t.daysLeft <= 2 && t.daysLeft > 0

                return (
                  <button
                    key={t.id}
                    onClick={() => navigate('/board')}
                    className="w-full flex items-start gap-3 p-3 rounded-xl bg-ink-50 border border-ink-100 hover:border-tosca-300 hover:bg-tosca-50/30 transition text-left"
                  >
                    <div
                      className="w-1.5 h-full min-h-[40px] rounded-full shrink-0"
                      style={{ background: objective.dotColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink-800 truncate">
                        {t.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded',
                          isOverdueTask ? 'bg-red-100 text-red-700' :
                          isToday ? 'bg-amber-100 text-amber-700' :
                          urgent ? 'bg-orange-100 text-orange-700' :
                          'bg-ink-100 text-ink-500'
                        )}>
                          {isOverdueTask
                            ? `OVERDUE ${Math.abs(t.daysLeft)} hari`
                            : isToday
                              ? 'HARI INI'
                              : `${t.daysLeft} hari lagi`}
                        </span>
                        {t.assignee_name && (
                          <span className="text-[10px] text-ink-500 truncate">
                            {t.assignee_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Top Performers */}
        <div className="p-6 bg-white rounded-2xl border border-ink-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-tosca-600" /> Top Performers
            </h3>
            <span className="text-xs text-ink-500">berdasarkan SP diperoleh</span>
          </div>

          {workload.length === 0 ? (
            <div className="text-center py-8 text-sm text-ink-400">
              Belum ada data
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {workload.map((w, i) => {
                const maxEarnedSp = Math.max(...workload.map((x) => x.earnedSp), 1)
                const pct = (w.earnedSp / maxEarnedSp) * 100

                return (
                  <div key={w.full_name} className="flex items-center gap-3">
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0',
                      i === 0 ? 'bg-amber-500' :
                      i === 1 ? 'bg-slate-400' :
                      i === 2 ? 'bg-orange-500' :
                      'bg-tosca-500'
                    )}>
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-ink-800 truncate">
                          {w.full_name}
                        </span>
                        <span className="text-xs font-bold text-tosca-700 ml-2">
                          {w.earnedSp} SP
                        </span>
                      </div>
                      <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-tosca-400 to-tosca-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-ink-500 mt-0.5 flex items-center gap-1 flex-wrap">
                        <span className="font-semibold text-ink-600 bg-ink-100 px-1 py-0.5 rounded">
                          {w.department}
                        </span>
                        <span>·</span>
                        <span>{w.tasks} task total</span>
                        <span>·</span>
                        <span>{w.active} aktif</span>
                        <span>·</span>
                        <span>Maks {w.maxSp} SP</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================
function StatCard({ label, value, icon: Icon, gradient, onClick, highlight }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'text-left bg-white rounded-2xl p-5 border shadow-sm transition',
        onClick && 'hover:shadow-md cursor-pointer',
        highlight ? 'border-red-200 ring-1 ring-red-100' : 'border-ink-100'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-xl bg-gradient-to-br mb-3 flex items-center justify-center text-white',
        gradient
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-ink-800">{value}</div>
      <div className="text-xs text-ink-500 mt-1">{label}</div>
    </button>
  )
}

function EmptyChart({ message }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-sm text-ink-400 border border-dashed border-ink-200 rounded-xl">
      {message}
    </div>
  )
}