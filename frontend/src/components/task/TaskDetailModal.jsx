import { useState, useMemo } from 'react'
import {
  X, Trash2, Edit, Send, MessageSquare, Paperclip, Clock,
  Calendar, Flag, Zap, CheckCircle2, Target, TrendingUp,
  Circle, Play, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  cn, fmtDate, fmtRelative,
  PRIORITY_META, STATUS_META, initials, getObjectiveMeta, OBJECTIVES
} from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useUsers } from '@/lib/taskApi'

// ============================================================
// ⭐ FIX 1: Fungsi Overdue yang Akurat (Hanya Bandingkan Tanggal)
// ============================================================
function isTaskOverdue(dueDate) {
  if (!dueDate) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0) // Set ke tengah malam hari ini (00:00:00)

  const due = new Date(dueDate)
  
  if (typeof dueDate === 'string' && dueDate.length === 10) {
    const [y, m, d] = dueDate.split('-')
    due.setFullYear(Number(y), Number(m) - 1, Number(d))
  }
  due.setHours(0, 0, 0, 0) // Set ke tengah malam tanggal jatuh tempo

  // Task overdue HANYA JIKA tanggal jatuh tempo SEBELUM hari ini
  return due.getTime() < today.getTime()
}

// ============================================================
// Progress Level Meta
// ============================================================
const PROGRESS_META = {
  not_started: {
    label: 'Belum Mulai',
    description: 'Task belum dikerjakan',
    color: 'bg-ink-100 text-ink-600 border-ink-200',
    icon: Circle,
    iconBg: 'bg-ink-100 text-ink-500'
  },
  in_progress: {
    label: 'Sedang Dikerjakan',
    description: 'Task sedang dalam progress',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Play,
    iconBg: 'bg-amber-500 text-white'
  },
  almost_done: {
    label: 'Hampir Selesai',
    description: 'Sudah 50% lebih, tinggal finalisasi',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: TrendingUp,
    iconBg: 'bg-purple-500 text-white'
  },
  done: {
    label: 'Selesai',
    description: 'Task sudah tuntas',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    iconBg: 'bg-emerald-500 text-white'
  }
}

// ============================================================
// ⭐ FIX 2: Compute progress score (SP yang didapat)
// ============================================================
function computeProgressScore(progressLevel, objective, fullSP) {
  // ⭐ FIX: In Progress sekarang memberikan 1 SP (termasuk untuk Daily)
  if (progressLevel === 'in_progress') return fullSP > 0 ? 1 : 0;

  // Logika lama untuk Daily (Almost Done = 0, Done = Full) tetap dipertahankan
  if (objective === 'daily') {
    return progressLevel === 'done' ? fullSP : 0
  }
  
  switch (progressLevel) {
    case 'almost_done': return Math.floor(fullSP / 2)
    case 'done':        return fullSP
    default:            return 0
  }
}

export default function TaskDetailModal({
  open, onClose, task,
  onEdit, onDelete, onStatusChange,
  comments = [], onAddComment
}) {
  // ============================================================
  // ⭐ SEMUA HOOKS HARUS DI ATAS (Sebelum conditional return)
  // ============================================================
  const [commentText, setCommentText] = useState('')
  const [activeTab, setActiveTab] = useState('comments')
  const { user } = useAuthStore()
  
  const { data: users = [] } = useUsers()

  const reporterUser = useMemo(() => {
    if (!task || !task.reporter_id) return null;
    return users.find((u) => String(u.id) === String(task.reporter_id));
  }, [users, task]);

  // ============================================================
  // Early return SETELAH semua hooks dipanggil
  // ============================================================
  if (!open || !task) return null

  // ============================================================
  // Meta & values
  // ============================================================
  const priority = PRIORITY_META[task.priority] || PRIORITY_META.medium
  const status = STATUS_META[task.status] || STATUS_META.todo
  const objective = getObjectiveMeta(task.objective)
  const progressLevel = task.progress_level || 'not_started'
  const progressMeta = PROGRESS_META[progressLevel] || PROGRESS_META.not_started
  const ProgressIcon = progressMeta.icon

  const dueDate = task.due_date || task.due
  // ⭐ Menggunakan fungsi lokal isTaskOverdue
  const overdue = isTaskOverdue(dueDate)

  const currentScore = computeProgressScore(progressLevel, task.objective, objective.points)
  const scorePct = objective.points > 0 ? (currentScore / objective.points) * 100 : 0

  const reporterName = reporterUser?.name || task.reporter_name || 'System';
  const reporterInitials = initials(reporterName);
  const reporterDept = reporterUser?.department || task.reporter_dept;

  // ============================================================
  // Handlers
  // ============================================================
  const handleAddComment = () => {
    if (!commentText.trim()) {
      toast.error('Komentar tidak boleh kosong')
      return
    }
    onAddComment?.(commentText.trim())
    setCommentText('')
    toast.success('Komentar ditambahkan!')
  }

  const handleDelete = () => {
    if (!confirm(`Hapus task "${task.title}"?\n\nTindakan ini tidak bisa dibatalkan.`)) return
    onDelete?.(task.id)
  }

  // ============================================================
  // Mock activity
  // ============================================================
  const ACTIVITY = [
    {
      user: 'Budi Santoso',
      action: 'membuat task ini',
      time: task.created_at || new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      color: 'tosca'
    },
    {
      user: 'Andi Pratama',
      action: `mengubah status ke ${status.label}`,
      time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      color: 'amber'
    },
    {
      user: 'Siti Nurhaliza',
      action: 'menambahkan assignee',
      time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      color: 'blue'
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl animate-fade-in flex flex-col max-h-[92vh] overflow-hidden">
        {/* ============ HEADER ============ */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 bg-gradient-to-r from-tosca-50/50 to-white shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-mono font-bold text-tosca-700 bg-tosca-100 px-2 py-1 rounded">
              {task.key || `MON-${task.id}`}
            </span>
            <span className={cn('w-2 h-2 rounded-full', status.color)} />
            <span className="text-xs font-medium text-ink-600">{status.label}</span>

            {progressLevel !== 'not_started' && (
              <>
                <span className="text-ink-300">·</span>
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border',
                  progressMeta.color
                )}>
                  <ProgressIcon className="w-3 h-3" />
                  {progressMeta.label}
                </span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-ink-100 text-ink-500 transition"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============ BODY ============ */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* ---------- LEFT: Main Content ---------- */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title + Badges */}
              <div>
                <h2 className="text-2xl font-bold text-ink-800 leading-snug">
                  {task.title}
                </h2>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium capitalize',
                    task.type === 'bug' ? 'bg-red-100 text-red-700' :
                    task.type === 'story' ? 'bg-tosca-100 text-tosca-700' :
                    task.type === 'epic' ? 'bg-purple-100 text-purple-700' :
                    task.type === 'subtask' ? 'bg-slate-100 text-slate-700' :
                    'bg-blue-100 text-blue-700'
                  )}>
                    {task.type}
                  </span>

                  <span className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 text-white',
                    priority.color
                  )}>
                    <Flag className="w-3 h-3" /> {priority.label}
                  </span>

                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 text-white shadow-sm"
                    style={{ background: objective.dotColor }}
                    title={objective.description}
                  >
                    <Target className="w-3 h-3" /> {objective.label}
                  </span>

                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-tosca-50 text-tosca-700 border border-tosca-200 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> {objective.points} SP
                  </span>
                </div>
              </div>

              {/* PROGRESS LEVEL BOX */}
              <div className="p-4 rounded-xl border-2 border-tosca-100 bg-gradient-to-r from-white to-tosca-50/30">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center',
                      progressMeta.iconBg
                    )}>
                      <ProgressIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                        Progress Level
                      </div>
                      <div className="text-sm font-bold text-ink-800">
                        {progressMeta.label}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      'text-2xl font-bold',
                      currentScore === 0 ? 'text-ink-400' :
                      currentScore === objective.points ? 'text-emerald-600' :
                      'text-tosca-700'
                    )}>
                      {currentScore}
                    </span>
                    <span className="text-xs font-medium text-ink-500">
                      / {objective.points} SP
                    </span>
                  </div>
                </div>

                <div className="text-xs text-ink-500 mb-3">
                  {progressMeta.description}
                </div>

                <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      currentScore === objective.points
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                        : 'bg-gradient-to-r from-tosca-400 to-tosca-600'
                    )}
                    style={{ width: `${scorePct}%` }}
                  />
                </div>
                <div className="text-[10px] text-ink-400 mt-1.5">
                  Kontribusi ke sprint: <strong>{currentScore} SP</strong> dari total <strong>{objective.points} SP</strong>
                </div>

                {task.objective !== 'daily' && (
                  <div className="mt-3 pt-3 border-t border-tosca-100">
                    <div className="text-[10px] text-ink-400 mb-2">
                      Skor SP berdasarkan progress level:
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { lvl: 'not_started', label: 'Belum', sp: 0 },
                        { lvl: 'in_progress', label: 'Progress', sp: 1 },
                        { lvl: 'almost_done', label: 'Hampir', sp: Math.floor(objective.points / 2) },
                        { lvl: 'done', label: 'Selesai', sp: objective.points }
                      ].map((item) => {
                        const isActive = progressLevel === item.lvl
                        return (
                          <div
                            key={item.lvl}
                            className={cn(
                              'p-2 rounded-lg text-center border transition',
                              isActive
                                ? 'border-tosca-400 bg-tosca-50'
                                : 'border-ink-200 bg-white'
                            )}
                          >
                            <div className={cn(
                              'text-[10px] font-bold mb-0.5 truncate',
                              isActive ? 'text-tosca-700' : 'text-ink-600'
                            )}>
                              {item.label}
                            </div>
                            <div className={cn(
                              'text-xs font-bold',
                              isActive ? 'text-tosca-700' : 'text-ink-500'
                            )}>
                              {item.sp} SP
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {task.objective === 'daily' && (
                  <div className="mt-3 pt-3 border-t border-tosca-100 text-[10px] text-ink-500">
                    💡 Daily task: skor SP langsung penuh ({objective.points} SP) ketika selesai, tanpa partial progress.
                  </div>
                )}
              </div>

              {/* Objective Detail Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-tosca-50/80 to-white border border-tosca-100">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                    style={{ background: objective.dotColor }}
                  >
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                      Objective
                    </div>
                    <div className="text-sm font-bold text-ink-800">
                      {objective.label}
                      <span className="ml-2 text-xs font-medium text-tosca-700">
                        · {objective.points} Story Points
                      </span>
                    </div>
                    <div className="text-xs text-ink-500 mt-0.5">
                      {objective.description}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-tosca-100/60">
                  <div className="text-[10px] text-ink-400 mb-2">
                    Story Points berdasarkan Objective:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {OBJECTIVES.map((obj) => (
                      <span
                        key={obj.value}
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[10px] font-medium border',
                          obj.value === task.objective
                            ? 'text-white border-transparent'
                            : 'bg-white text-ink-500 border-ink-200'
                        )}
                        style={obj.value === task.objective ? { background: obj.dotColor } : {}}
                      >
                        {obj.label}: {obj.points} SP
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
                  Deskripsi
                </h3>
                <div className="p-4 rounded-xl bg-ink-50 border border-ink-100 text-sm text-ink-700 leading-relaxed min-h-[60px]">
                  {task.description || (
                    <span className="text-ink-400 italic">Belum ada deskripsi.</span>
                  )}
                </div>
              </div>

              {/* Tabs (Comments / Activity) */}
              <div>
                <div className="flex items-center gap-1 border-b border-ink-100 mb-4">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={cn(
                      'px-4 py-2 text-sm font-medium border-b-2 transition -mb-px flex items-center gap-2',
                      activeTab === 'comments'
                        ? 'border-tosca-600 text-tosca-700'
                        : 'border-transparent text-ink-500 hover:text-ink-700'
                    )}
                  >
                    <MessageSquare className="w-4 h-4" /> Komentar ({comments.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={cn(
                      'px-4 py-2 text-sm font-medium border-b-2 transition -mb-px flex items-center gap-2',
                      activeTab === 'activity'
                        ? 'border-tosca-600 text-tosca-700'
                        : 'border-transparent text-ink-500 hover:text-ink-700'
                    )}
                  >
                    <Clock className="w-4 h-4" /> Activity ({ACTIVITY.length})
                  </button>
                </div>

                {activeTab === 'comments' && (
                  <div className="space-y-4">
                    {comments.length === 0 && (
                      <div className="text-center py-8">
                        <MessageSquare className="w-10 h-10 text-ink-300 mx-auto mb-2" />
                        <p className="text-sm text-ink-500">Belum ada komentar</p>
                        <p className="text-xs text-ink-400 mt-1">
                          Jadilah yang pertama berkomentar
                        </p>
                      </div>
                    )}

                    {comments.map((c, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tosca-500 to-tosca-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                          {initials(c.user || 'User')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-ink-800">
                              {c.user || 'User'}
                            </span>
                            <span className="text-xs text-ink-400">
                              {fmtRelative(c.created_at || new Date())}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-ink-50 border border-ink-100 text-sm text-ink-700">
                            {c.body}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="pt-4 border-t border-ink-100">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tosca-500 to-tosca-700 flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                          {initials(user?.name || 'You')}
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Tulis komentar... (Ctrl+Enter untuk kirim)"
                            rows={3}
                            className="w-full p-3 rounded-xl border border-ink-200 bg-white text-sm resize-none focus:outline-none focus:border-tosca-500 focus:ring-2 focus:ring-tosca-500/20"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddComment()
                            }}
                          />
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1">
                              <button
                                className="p-1.5 rounded hover:bg-ink-100 text-ink-400"
                                title="Attachment (coming soon)"
                              >
                                <Paperclip className="w-4 h-4" />
                              </button>
                              <span className="text-[10px] text-ink-400 ml-1">
                                Ctrl+Enter untuk kirim
                              </span>
                            </div>
                            <button
                              onClick={handleAddComment}
                              disabled={!commentText.trim()}
                              className="px-3 py-1.5 rounded-lg bg-tosca-600 text-white text-xs font-medium hover:bg-tosca-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                            >
                              <Send className="w-3.5 h-3.5" /> Kirim
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-3">
                    {ACTIVITY.map((a, i) => (
                      <div key={i} className="flex gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                          style={{
                            background:
                              a.color === 'tosca' ? '#0D9488' :
                              a.color === 'amber' ? '#F59E0B' :
                              a.color === 'blue' ? '#3B82F6' : '#64748B'
                          }}
                        >
                          {initials(a.user)}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm text-ink-700">
                            <span className="font-semibold">{a.user}</span>{' '}
                            <span className="text-ink-600">{a.action}</span>
                          </p>
                          <p className="text-xs text-ink-400 mt-0.5">
                            {fmtRelative(a.time)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ---------- RIGHT: Metadata Sidebar ---------- */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-ink-50 border border-ink-100 space-y-4">
                <h4 className="text-xs font-semibold text-ink-500 uppercase tracking-wide">
                  Detail Task
                </h4>

                {/* Assignee */}
                <div>
                  <div className="text-xs text-ink-500 mb-1.5">Assignee</div>
                  {task.assignee_name ? (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tosca-500 to-tosca-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {initials(task.assignee_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink-800 truncate">
                          {task.assignee_name}
                        </div>
                        {task.assignee_dept && (
                          <div className="text-[10px] font-bold uppercase text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            {task.assignee_dept}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm text-ink-400 italic">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Belum di-assign
                    </div>
                  )}
                </div>

                {/* Reporter */}
                <div>
                  <div className="text-xs text-ink-500 mb-1.5">Reporter</div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                      {reporterInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ink-800 truncate">
                        {reporterName}
                      </div>
                      {reporterDept && (
                        <div className="text-[10px] font-bold uppercase text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          {reporterDept}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Objective */}
                <div>
                  <div className="text-xs text-ink-500 mb-1.5 flex items-center gap-1">
                    <Target className="w-3 h-3" /> Objective
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: objective.dotColor }}
                    />
                    <span className="text-sm font-medium text-ink-800">
                      {objective.label}
                    </span>
                  </div>
                </div>

                {/* Progress Level */}
                <div>
                  <div className="text-xs text-ink-500 mb-1.5 flex items-center gap-1">
                    <ProgressIcon className="w-3 h-3" /> Progress Level
                  </div>
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border',
                    progressMeta.color
                  )}>
                    <ProgressIcon className="w-3 h-3" />
                    {progressMeta.label}
                  </span>
                </div>

                {/* Story Points */}
                <div>
                  <div className="text-xs text-ink-500 mb-1.5 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Story Points
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      'text-2xl font-bold',
                      currentScore === 0 ? 'text-ink-400' :
                      currentScore === objective.points ? 'text-emerald-600' :
                      'text-tosca-700'
                    )}>
                      {currentScore}
                    </span>
                    <span className="text-xs font-medium text-ink-500">
                      / {objective.points} SP
                    </span>
                  </div>
                  <div className="text-[10px] text-ink-400 mt-0.5">
                    {currentScore === objective.points
                      ? '✅ Full SP tercapai'
                      : currentScore > 0
                        ? `📊 ${Math.round(scorePct)}% dari total SP`
                        : 'Task belum dikerjakan'}
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <div className="text-xs text-ink-500 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Due Date
                  </div>
                  <div className={cn(
                    'text-sm font-medium',
                    overdue ? 'text-red-500' : 'text-ink-800'
                  )}>
                    {dueDate ? fmtDate(dueDate) : '-'}
                    {overdue && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                        OVERDUE
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Changer */}
                <div>
                  <div className="text-xs text-ink-500 mb-1.5">Ubah Status</div>
                  <div className="grid grid-cols-1 gap-1">
                    {Object.entries(STATUS_META).map(([key, meta]) => (
                      <button
                        key={key}
                        onClick={() => onStatusChange?.(task.id, key)}
                        className={cn(
                          'w-full px-3 py-1.5 rounded-lg text-xs font-medium text-left flex items-center gap-2 transition',
                          task.status === key
                            ? 'bg-tosca-100 text-tosca-700 border border-tosca-300'
                            : 'bg-white border border-ink-200 text-ink-600 hover:border-tosca-300 hover:bg-tosca-50'
                        )}
                      >
                        <span className={cn('w-2 h-2 rounded-full', meta.color)} />
                        {meta.label}
                        {task.status === key && (
                          <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-tosca-600" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-ink-400 mt-2 leading-snug">
                    ℹ️ Ubah status dari sini juga meng-update progress level otomatis.
                  </div>
                </div>
              </div>

              {/* Attachment info */}
              <div className="p-4 rounded-xl bg-tosca-50 border border-tosca-100">
                <div className="flex items-center gap-2 text-tosca-700">
                  <Paperclip className="w-4 h-4" />
                  <span className="text-xs font-medium">Attachment</span>
                </div>
                <p className="text-xs text-tosca-600 mt-1.5">
                  Belum ada attachment. Fitur upload akan datang.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ============ FOOTER ============ */}
        <div className="px-6 py-4 border-t border-ink-100 bg-ink-50/50 flex items-center justify-between shrink-0">
          <button
            onClick={handleDelete}
            className="px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition"
          >
            <Trash2 className="w-4 h-4" /> Hapus Task
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-ink-600 hover:bg-ink-100 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}