import { useState } from 'react'
import { Bell, CheckCheck, Trash2, UserPlus, MessageSquare, Clock, Timer, AtSign, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { cn, fmtRelative } from '@/lib/utils'
import { useNotificationStore } from '@/stores/notificationStore'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'

const TYPE_META = {
  task_assigned:  { icon: UserPlus,       label: 'Ditugaskan', color: 'tosca' },
  task_commented: { icon: MessageSquare,  label: 'Komentar',   color: 'blue' },
  task_due_soon:  { icon: Clock,          label: 'Jatuh Tempo',color: 'amber' },
  sprint_started: { icon: Timer,          label: 'Sprint',     color: 'purple' },
  mention:        { icon: AtSign,         label: 'Mention',    color: 'red' }
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState('all')
  const navigate = useNavigate()

  const items = useNotificationStore((s) => s.items)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  const remove = useNotificationStore((s) => s.remove)
  const clearAll = useNotificationStore((s) => s.clearAll)

  const filtered = filter === 'unread' ? items.filter((n) => !n.is_read) : items
  const unreadCount = items.filter((n) => !n.is_read).length

  const open = (n) => {
    markAsRead(n.id)
    if (n.link) navigate(n.link)
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-800">Notifikasi</h1>
          <p className="text-sm text-ink-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua sudah dibaca 👍'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { markAllAsRead(); toast.success('Semua ditandai sudah dibaca') }}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="w-4 h-4" /> Tandai Semua
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => { if (confirm('Hapus semua?')) { clearAll(); toast.success('Dihapus') } }}
            disabled={items.length === 0}
          >
            <Trash2 className="w-4 h-4" /> Hapus Semua
          </Button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-ink-100 rounded-xl mb-5 w-fit">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition',
            filter === 'all' ? 'bg-white text-tosca-700 shadow-sm' : 'text-ink-600'
          )}
        >
          Semua ({items.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition',
            filter === 'unread' ? 'bg-white text-tosca-700 shadow-sm' : 'text-ink-600'
          )}
        >
          Belum Dibaca ({unreadCount})
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={filter === 'unread' ? 'Tidak ada notifikasi baru' : 'Belum ada notifikasi'}
            description={filter === 'unread' ? 'Semua sudah dibaca 👍' : 'Notifikasi akan muncul di sini'}
          />
        ) : (
          <div className="divide-y divide-ink-100">
            {filtered.map((n) => {
              const meta = TYPE_META[n.type] || TYPE_META.task_assigned
              const Icon = meta.icon
              return (
                <button
                  key={n.id}
                  onClick={() => open(n)}
                  className={cn(
                    'w-full text-left p-4 hover:bg-tosca-50/40 transition group relative',
                    !n.is_read && 'bg-tosca-50/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      n.is_read ? 'bg-ink-100 text-ink-500' : 'bg-tosca-100 text-tosca-700'
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {!n.is_read && <span className="w-2 h-2 rounded-full bg-tosca-500" />}
                            <span className="text-sm font-semibold text-ink-800">{n.title}</span>
                            <Badge color={meta.color}>{meta.label}</Badge>
                          </div>
                          <p className="text-sm text-ink-600 mt-1">{n.body}</p>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-ink-400">
                            {n.entity_key && (
                              <span className="font-mono px-1.5 py-0.5 rounded bg-ink-100 text-tosca-700">
                                {n.entity_key}
                              </span>
                            )}
                            <span>{fmtRelative(n.created_at)}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); remove(n.id); toast.success('Dihapus') }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-50 text-ink-400 hover:text-red-500 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
