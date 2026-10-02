import { create } from 'zustand'

// Dummy notifications — nanti bisa diganti fetch dari API
const SEED = [
  {
    id: 1,
    type: 'task_assigned',
    title: 'Task baru ditugaskan ke Anda',
    body: 'Andi Pratama menugaskan "Implementasi autentikasi JWT" kepada Anda',
    entity_type: 'task',
    entity_id: 101,
    entity_key: 'MON-101',
    link: '/board',
    is_read: false,
    actor: 'Andi Pratama',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    type: 'task_commented',
    title: 'Komentar baru di task Anda',
    body: 'Siti Nurhaliza: "Sudah saya review, tinggal perbaiki validasi di bagian email"',
    entity_type: 'task',
    entity_id: 102,
    entity_key: 'MON-102',
    link: '/board',
    is_read: false,
    actor: 'Siti Nurhaliza',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    type: 'task_due_soon',
    title: 'Task akan segera jatuh tempo',
    body: '"Perbaiki bug pada filter task" jatuh tempo hari ini pukul 17:00',
    entity_type: 'task',
    entity_id: 105,
    entity_key: 'MON-105',
    link: '/backlog',
    is_read: false,
    actor: 'System',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 4,
    type: 'sprint_started',
    title: 'Sprint baru telah dimulai',
    body: 'Sprint 3 - Dashboard telah dimulai oleh Budi Santoso',
    entity_type: 'sprint',
    entity_id: 3,
    entity_key: 'SPR-03',
    link: '/sprints',
    is_read: true,
    actor: 'Budi Santoso',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 5,
    type: 'mention',
    title: 'Anda di-mention dalam komentar',
    body: 'Rizky Ramadhan menyebut Anda di task "Optimasi render kanban"',
    entity_type: 'task',
    entity_id: 106,
    entity_key: 'MON-106',
    link: '/board',
    is_read: true,
    actor: 'Rizky Ramadhan',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
]

export const useNotificationStore = create((set, get) => ({
  items: SEED,

  unreadCount: () => get().items.filter((n) => !n.is_read).length,

  markAsRead: (id) =>
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    })),

  markAllAsRead: () =>
    set((s) => ({
      items: s.items.map((n) => ({ ...n, is_read: true }))
    })),

  remove: (id) =>
    set((s) => ({ items: s.items.filter((n) => n.id !== id) })),

  clearAll: () => set({ items: [] }),

  add: (notif) =>
    set((s) => ({
      items: [
        {
          id: Date.now(),
          is_read: false,
          created_at: new Date().toISOString(),
          ...notif
        },
        ...s.items
      ]
    }))
}))
