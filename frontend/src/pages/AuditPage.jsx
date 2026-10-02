import { useState } from 'react'
import { ScrollText, Search, Filter } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'

const LOGS = [
  { id: 1, user: 'Budi Santoso', action: 'CREATE', entity: 'task', entityId: 'MON-101', desc: 'Membuat task "Buat halaman audit trail"', ip: '192.168.1.10', time: '2026-09-27 10:15:22' },
  { id: 2, user: 'Andi Pratama', action: 'UPDATE', entity: 'task', entityId: 'MON-102', desc: 'Mengubah status menjadi In Progress', ip: '192.168.1.11', time: '2026-09-27 10:20:45' },
  { id: 3, user: 'Siti Nurhaliza', action: 'COMMENT', entity: 'task', entityId: 'MON-103', desc: 'Menambahkan komentar pada task', ip: '192.168.1.12', time: '2026-09-27 10:25:11' },
  { id: 4, user: 'Budi Santoso', action: 'DELETE', entity: 'comment', entityId: 'CMT-45', desc: 'Menghapus komentar', ip: '192.168.1.10', time: '2026-09-27 10:30:00' },
  { id: 5, user: 'Dian Kusuma', action: 'CREATE', entity: 'sprint', entityId: 'SPR-04', desc: 'Membuat sprint "Sprint 4 - Notification"', ip: '192.168.1.13', time: '2026-09-27 11:00:12' }
]

const ACTION_STYLE = {
  CREATE:  'green',
  UPDATE:  'amber',
  DELETE:  'red',
  COMMENT: 'blue'
}

export default function AuditPage() {
  const [search, setSearch] = useState('')
  const filtered = LOGS.filter(l =>
    l.desc.toLowerCase().includes(search.toLowerCase()) ||
    l.user.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-800">Audit Trail</h1>
          <p className="text-sm text-ink-500 mt-1">Jejak semua perubahan data di sistem</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari log..."
              className="h-10 pl-9 pr-3 rounded-lg border border-ink-200 bg-white text-sm w-64 focus:outline-none focus:border-tosca-500 focus:ring-2 focus:ring-tosca-500/20"
            />
          </div>
          <button className="h-10 px-4 rounded-lg border border-ink-200 bg-white text-sm text-ink-600 hover:bg-ink-50 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-ink-100">
          {filtered.map(log => (
            <div key={log.id} className="p-5 hover:bg-ink-50/40 transition flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-tosca-50 flex items-center justify-center shrink-0">
                <ScrollText className="w-5 h-5 text-tosca-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Avatar name={log.user} size="xs" />
                  <span className="text-sm font-medium text-ink-800">{log.user}</span>
                  <Badge color={ACTION_STYLE[log.action]}>{log.action}</Badge>
                  <span className="text-xs font-mono text-ink-500 bg-ink-100 px-2 py-0.5 rounded">
                    {log.entity}#{log.entityId}
                  </span>
                </div>
                <p className="text-sm text-ink-700">{log.desc}</p>
                <div className="flex items-center gap-4 mt-2 text-[11px] text-ink-400">
                  <span>IP: {log.ip}</span>
                  <span>{log.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-ink-400">Tidak ada log ditemukan</div>
        )}
      </div>
    </div>
  )
}
