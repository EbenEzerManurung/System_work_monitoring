import { useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import toast from 'react-hot-toast'
import { useTasks, useSprints, useUsers } from '@/lib/taskApi'
import { useAuthStore } from '@/stores/authStore'
import { getObjectiveMeta } from '@/lib/utils' // ⭐ Import untuk warna objective

const locales = { id: localeID }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales
})

export default function CalendarPage() {
  const { user } = useAuthStore()
  const { data: allTasks = [], isLoading: loadingTasks } = useTasks()
  const { data: allSprints = [], isLoading: loadingSprints } = useSprints()
  const { data: users = [], isLoading: loadingUsers } = useUsers()

  const isLoading = loadingTasks || loadingSprints || loadingUsers

  // ============================================================
  // ⭐ 1. FILTER TASK & SPRINT BERDASARKAN ROLE
  // ============================================================
  const role = String(user?.role || '').toLowerCase().replace(/[\s_-]/g, '')
  const isSuperAdmin = role === 'superadmin' || role === 'admin'
  const isManager = role === 'manager'
  const myDept = user?.department_id ?? user?.department ?? null

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    if (isSuperAdmin) return allTasks

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

    // Member: Hanya task miliknya
    return allTasks.filter((t) => {
      if (String(t.assignee_id) === String(user?.id)) return true
      if (t.assignee_id == null && t.assignee_name && t.assignee_name === user?.name) return true
      return false
    })
  }, [allTasks, users, user, isSuperAdmin, isManager, myDept])

  // Filter Sprints (Hanya tampilkan sprint yang berisi task yang terlihat)
  const filteredSprints = useMemo(() => {
    if (isSuperAdmin) return allSprints

    return allSprints.filter((s) => {
      return filteredTasks.some((t) => String(t.sprint_id) === String(s.id))
    })
  }, [allSprints, filteredTasks, isSuperAdmin])

  // ============================================================
  // ⭐ 2. MAPPING DATA KE FORMAT CALENDAR
  // ============================================================
  const events = useMemo(() => {
    const evts = []

    // Mapping Tasks -> Calendar Events (Menggunakan Due Date)
    filteredTasks.forEach((t) => {
      const dueDate = t.due_date || t.due
      if (!dueDate) return

      const dateObj = new Date(dueDate)
      // Pastikan tanggal valid
      if (isNaN(dateObj.getTime())) return

      evts.push({
        id: `task-${t.id}`,
        title: `📌 ${t.title}`,
        start: dateObj,
        end: dateObj,
        allDay: true, // Task due date dianggap all-day event
        type: 'task',
        resource: t // Simpan data asli untuk styling & detail
      })
    })

    // Mapping Sprints -> Calendar Events (Menggunakan Start & End Date)
    filteredSprints.forEach((s) => {
      if (!s.start_date || !s.end_date) return

      const startObj = new Date(s.start_date)
      const endObj = new Date(s.end_date)
      if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) return

      evts.push({
        id: `sprint-${s.id}`,
        title: `🚀 ${s.name}`,
        start: startObj,
        end: endObj,
        allDay: true,
        type: 'sprint',
        resource: s
      })
    })

    return evts
  }, [filteredTasks, filteredSprints])

  // ============================================================
  // ⭐ 3. STYLING EVENT (Berdasarkan Objective Task & Sprint)
  // ============================================================
  const eventStyle = (event) => {
    // Styling untuk Sprint
    if (event.type === 'sprint') {
      return {
        style: {
          backgroundColor: '#8B5CF6', // Purple
          borderColor: '#7C3AED',
          color: 'white',
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 6,
          border: 'none',
          padding: '2px 6px'
        }
      }
    }

    // Styling untuk Task (Menggunakan warna Objective)
    const objectiveMeta = getObjectiveMeta(event.resource?.objective)
    const bgColor = objectiveMeta?.dotColor || '#14B8A6' // Fallback ke Tosca jika tidak ada

    return {
      style: {
        backgroundColor: bgColor,
        borderColor: 'transparent',
        color: 'white',
        fontSize: 12,
        borderRadius: 6,
        border: 'none',
        padding: '2px 6px'
      }
    }
  }

  // ============================================================
  // ⭐ 4. HANDLER KLIK EVENT
  // ============================================================
  const handleSelectEvent = (event) => {
    if (event.type === 'task') {
      const t = event.resource
      toast.custom((toastInstance) => (
        <div className="bg-white rounded-xl shadow-lg border border-ink-100 p-4 max-w-sm">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-lg">📌</span>
            <div>
              <h4 className="font-bold text-ink-800 text-sm">{t.title}</h4>
              <p className="text-xs text-ink-500 mt-0.5">MON-{t.id} · {t.status}</p>
            </div>
          </div>
          <div className="text-xs text-ink-600 space-y-1">
            <p>👤 Assignee: <strong>{t.assignee_name || 'Unassigned'}</strong></p>
            <p>🎯 Objective: <strong>{getObjectiveMeta(t.objective).label}</strong></p>
            <p>📅 Due: <strong>{format(new Date(t.due_date || t.due), 'dd MMM yyyy', { locale: localeID })}</strong></p>
          </div>
        </div>
      ), { duration: 4000 })
    } else if (event.type === 'sprint') {
      const s = event.resource
      toast.custom((toastInstance) => (
        <div className="bg-white rounded-xl shadow-lg border border-ink-100 p-4 max-w-sm">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-lg">🚀</span>
            <div>
              <h4 className="font-bold text-ink-800 text-sm">{s.name}</h4>
              <p className="text-xs text-ink-500 mt-0.5">SPR-{s.id} · {s.status}</p>
            </div>
          </div>
          <div className="text-xs text-ink-600 space-y-1">
            <p>📅 Periode: <strong>{format(new Date(s.start_date), 'dd MMM', { locale: localeID })} - {format(new Date(s.end_date), 'dd MMM yyyy', { locale: localeID })}</strong></p>
            <p>🎯 Goal: <strong>{s.goal || 'Tidak ada goal'}</strong></p>
          </div>
        </div>
      ), { duration: 4000 })
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-center h-[600px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-tosca-200 border-t-tosca-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-ink-500">Memuat kalender...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-800">Calendar</h1>
          <p className="text-sm text-ink-500 mt-1">
            Jadwal sprint dan due date task —{' '}
            <span className="text-tosca-700 font-medium">
              {isSuperAdmin ? 'Semua Tim' : isManager ? `Departemen ${user?.department_name || 'Anda'}` : 'Tugas Anda'}
            </span>
          </p>
        </div>
        {/* Legenda Warna */}
        <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-ink-100 shadow-sm text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
            <span className="text-ink-600">Sprint</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]" />
            <span className="text-ink-600">Task (Objective)</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-4" style={{ height: 700 }}>
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-ink-400 font-medium">Belum ada event untuk ditampilkan</p>
              <p className="text-xs text-ink-400 mt-1">Task dengan due date & sprint akan muncul di sini.</p>
            </div>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            defaultView="month"
            culture="id"
            eventPropGetter={eventStyle}
            onSelectEvent={handleSelectEvent}
            style={{ height: '100%' }}
            messages={{
              next: 'Berikutnya',
              previous: 'Sebelumnya',
              today: 'Hari Ini',
              month: 'Bulan',
              week: 'Minggu',
              day: 'Hari',
              agenda: 'Agenda',
              date: 'Tanggal',
              time: 'Waktu',
              event: 'Event',
              noEventsInRange: 'Tidak ada event di rentang ini.',
              showMore: (total) => `+${total} lainnya`
            }}
          />
        )}
      </div>
    </div>
  )
}