import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Check, CheckCheck, Trash2, X,
  UserPlus, MessageSquare, Clock, Timer, AtSign, Info, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, fmtRelative, fmtDate } from '@/lib/utils'
import { useNotificationStore } from '@/stores/notificationStore'
import { useTasks } from '@/lib/taskApi' // ⭐ Import useTasks
import { useAuthStore } from '@/stores/authStore' // ⭐ Import useAuthStore

// ============================================================
// ⭐ Tambahkan 'task_pending' ke TYPE_META
// ============================================================
const TYPE_META = {
  task_assigned:  { icon: UserPlus,       color: 'bg-tosca-100 text-tosca-700',   label: 'Ditugaskan' },
  task_commented: { icon: MessageSquare,  color: 'bg-blue-100 text-blue-700',     label: 'Komentar' },
  task_due_soon:  { icon: Clock,          color: 'bg-amber-100 text-amber-700',   label: 'Jatuh Tempo' },
  sprint_started: { icon: Timer,          color: 'bg-purple-100 text-purple-700', label: 'Sprint' },
  mention:        { icon: AtSign,         color: 'bg-pink-100 text-pink-700',     label: 'Mention' },
  task_pending:   { icon: AlertCircle,    color: 'bg-red-100 text-red-700',       label: 'Segera Selesaikan' } // ⭐ Baru
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all') // 'all' | 'unread'
  const ref = useRef(null)
  const navigate = useNavigate()

  const { user } = useAuthStore()
  const { data: allTasks = [] } = useTasks()

  const items = useNotificationStore((s) => s.items)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  const remove = useNotificationStore((s) => s.remove)
  const clearAll = useNotificationStore((s) => s.clearAll)

  // ============================================================
  // ⭐ 1. Filter Task yang Belum Selesai (Pending Tasks)
  // ============================================================
  const pendingTasks = useMemo(() => {
    if (!user) return []
    
    return allTasks
      .filter((t) => {
        // Cek apakah task ini milik user yang sedang login
        const isMyTask = String(t.assignee_id) === String(user.id) || t.assignee_name === user.name
        // Cek apakah task belum selesai (bukan done, bukan backlog)
        const isNotFinished = t.status !== 'done' && t.status !== 'backlog'
        return isMyTask && isNotFinished
      })
      .map((t) => ({
        id: `task-${t.id}`, // Prefix agar tidak bentrok dengan ID notifikasi
        is_pending_task: true, // ⭐ Flag khusus untuk task pending
        type: 'task_pending',
        title: `Segera selesaikan: ${t.title}`,
        body: `Status: ${t.status.replace('_', ' ')} • Deadline: ${t.due_date ? fmtDate(t.due_date) : 'Tidak ada'}`,
        created_at: t.due_date || t.created_at || new Date().toISOString(),
        link: '/board', // Arahkan ke Kanban Board
        is_read: false, // Task pending selalu dianggap "belum dibaca" (urgent)
        entity_key: `MON-${t.id}`
      }))
  }, [allTasks, user])

  // ============================================================
  // ⭐ 2. Gabungkan Notifikasi Sistem dengan Task Pending
  // ============================================================
  const combinedItems = useMemo(() => {
    const all = [...pendingTasks, ...items]
    // Urutkan berdasarkan tanggal terbaru / deadline terdekat
    return all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [pendingTasks, items])

  // ============================================================
  // ⭐ 3. Hitung Total Unread (Termasuk Task Pending)
  // ============================================================
  const unreadCount = useMemo(() => {
    const unreadStoreCount = items.filter((n) => !n.is_read).length
    // Task pending selalu dihitung sebagai unread/urgent
    return unreadStoreCount + pendingTasks.length
  }, [items, pendingTasks])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on ESC
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [])

  // Filter untuk tampilan
  const filtered = useMemo(() => {
    if (filter === 'unread') {
      // Jika filter 'unread', tampilkan notifikasi yang belum dibaca + semua task pending
      return combinedItems.filter((n) => !n.is_read || n.is_pending_task)
    }
    return combinedItems
  }, [combinedItems, filter])

  const handleOpenItem = (notif) => {
    if (!notif.is_pending_task) {
      markAsRead(notif.id)
    }
    setOpen(false)
    if (notif.link) navigate(notif.link)
  }

  // ⭐ Hanya tandai baca untuk notifikasi sistem, bukan task pending
  const handleMarkAll = () => {
    markAllAsRead()
    toast.success('Notifikasi sistem ditandai sudah dibaca. Task pending tetap ada.')
  }

  // ⭐ Hanya hapus notifikasi sistem, bukan task pending
  const handleClearAll = () => {
    if (!confirm('Hapus semua notifikasi sistem? (Task pending tidak akan terhapus)')) return
    clearAll()
    toast.success('Semua notifikasi sistem dihapus')
  }

  const handleRemove = (e, id) => {
    e.stopPropagation()
    // Cegah penghapusan task pending dari lonceng
    if (String(id).startsWith('task-')) {
      toast.error('Selesaikan task-nya terlebih dahulu untuk menghapus pengingat ini.')
      return
    }
    remove(id)
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative p-2.5 rounded-xl border transition',
          open
            ? 'bg-tosca-50 border-tosca-300 text-tosca-700'
            : 'bg-white border-ink-200 hover:bg-ink-50 text-ink-600'
        )}
        aria-label="Notifikasi"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <>
            <span className={cn(
              "absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full ring-2 ring-white text-[10px] font-bold text-white flex items-center justify-center",
              pendingTasks.length > 0 ? "bg-red-500" : "bg-tosca-500" // Merah jika ada task pending
            )}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
            <span className={cn(
              "absolute top-1 right-1 w-[18px] h-[18px] rounded-full animate-ping opacity-40",
              pendingTasks.length > 0 ? "bg-red-500" : "bg-tosca-500"
            )} />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[420px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-ink-100 overflow-hidden z-50 animate-fade-in">
          {/* Header */}
          <div className="px-4 py-3 border-b border-ink-100 bg-gradient-to-r from-tosca-50 to-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-ink-800">Notifikasi</h3>
                {unreadCount > 0 && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-bold",
                    pendingTasks.length > 0 ? "bg-red-100 text-red-700" : "bg-tosca-100 text-tosca-700"
                  )}>
                    {unreadCount} baru
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-ink-100 text-ink-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-0.5 bg-ink-100 rounded-lg w-fit">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition',
                  filter === 'all' ? 'bg-white text-tosca-700 shadow-sm' : 'text-ink-500'
                )}
              >
                Semua ({combinedItems.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition',
                  filter === 'unread' ? 'bg-white text-tosca-700 shadow-sm' : 'text-ink-500'
                )}
              >
                Belum Dibaca ({unreadCount})
              </button>
            </div>
          </div>

          {/* Actions */}
          {combinedItems.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-ink-100 bg-ink-50/50">
              <button
                onClick={handleMarkAll}
                disabled={items.filter(i => !i.is_read).length === 0}
                className="text-xs font-medium text-tosca-700 hover:text-tosca-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Tandai sistem dibaca
              </button>
              <button
                onClick={handleClearAll}
                disabled={items.length === 0}
                className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus sistem
              </button>
            </div>
          )}

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
            {filtered.length === 0 && (
              <div className="py-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-tosca-50 flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-tosca-500" />
                </div>
                <p className="text-sm font-medium text-ink-700">
                  {filter === 'unread' ? 'Tidak ada notifikasi baru' : 'Belum ada notifikasi'}
                </p>
                <p className="text-xs text-ink-400 mt-1">
                  {filter === 'unread' ? 'Semua sudah dibaca 👍' : 'Notifikasi akan muncul di sini'}
                </p>
              </div>
            )}

            {filtered.map((n) => {
              const meta = TYPE_META[n.type] || TYPE_META.task_assigned
              const Icon = meta.icon
              const isPending = n.is_pending_task

              return (
                <button
                  key={n.id}
                  onClick={() => handleOpenItem(n)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-ink-50 hover:bg-tosca-50/40 transition relative group',
                    !n.is_read && !isPending && 'bg-tosca-50/30',
                    isPending && 'bg-red-50/50 hover:bg-red-50' // ⭐ Background merah muda untuk task pending
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                      meta.color
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {(!n.is_read || isPending) && (
                            <span className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              isPending ? "bg-red-500 animate-pulse" : "bg-tosca-500"
                            )} />
                          )}
                          <div className={cn(
                            "text-sm font-medium leading-tight",
                            isPending ? "text-red-800" : "text-ink-800"
                          )}>
                            {n.title}
                          </div>
                        </div>
                        {/* ⭐ Hanya tampilkan tombol hapus jika BUKAN task pending */}
                        {!isPending && (
                          <button
                            onClick={(e) => handleRemove(e, n.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-ink-400 hover:text-red-500 transition shrink-0"
                            title="Hapus"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <p className={cn(
                        "text-xs mt-1 line-clamp-2",
                        isPending ? "text-red-700" : "text-ink-600"
                      )}>
                        {n.body}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-ink-400">
                        {n.entity_key && (
                          <span className={cn(
                            "font-mono px-1.5 py-0.5 rounded font-medium",
                            isPending ? "bg-red-100 text-red-700" : "bg-ink-100 text-tosca-700"
                          )}>
                            {n.entity_key}
                          </span>
                        )}
                        <span>{fmtRelative(n.created_at)}</span>
                        {(!n.is_read || isPending) && (
                          <span className={cn(
                            "ml-auto font-medium",
                            isPending ? "text-red-600" : "text-tosca-600"
                          )}>
                            {isPending ? 'Selesaikan Task →' : 'Klik untuk baca →'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer */}
          {combinedItems.length > 0 && (
            <div className="px-4 py-2.5 border-t border-ink-100 bg-ink-50/50">
              <button
                onClick={() => { setOpen(false); navigate('/notifications') }}
                className="w-full text-xs font-medium text-tosca-700 hover:text-tosca-800 flex items-center justify-center gap-1"
              >
                Lihat semua notifikasi →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}