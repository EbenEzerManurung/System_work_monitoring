import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, KanbanSquare, ListChecks, Timer,
  CalendarDays, ScrollText, LogOut, ChevronsLeft, ChevronsRight,
  User, Settings, ChevronUp, Shield, Building2, Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import Avatar from '@/components/ui/Avatar'
import toast from 'react-hot-toast'

// ============================================================
// NAV — menu utama
//   - Tanpa `roles` → tampil untuk SEMUA role (member, manager, admin)
//   - Dengan `roles` → hanya untuk role yang terdaftar
// ============================================================
const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/board',    icon: KanbanSquare,    label: 'Kanban Board' },
  { to: '/backlog',  icon: ListChecks,      label: 'Backlog',     roles: ['admin', 'manager'] },
  { to: '/sprints',  icon: Timer,           label: 'Sprints' },   // ⭐ member boleh akses
  { to: '/calendar', icon: CalendarDays,    label: 'Calendar' },
  { to: '/audit',    icon: ScrollText,      label: 'Audit Trail', roles: ['admin', 'manager'] }
]

const MASTER_NAV = [
  { to: '/departments', icon: Building2, label: 'Departments', roles: ['admin'] },
  { to: '/users',       icon: Users,     label: 'Users',       roles: ['admin'] }
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    toast.success('Berhasil logout')
    navigate('/login')
  }

  const goProfile = () => {
    setMenuOpen(false)
    navigate('/profile')
  }

  // Filter menu utama berdasarkan role user
  const navItems = NAV.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  )

  const masterItems = MASTER_NAV.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  )

  return (
    <aside className={cn(
      'flex flex-col bg-tosca-900 text-tosca-100 transition-all duration-200 shrink-0 relative',
      sidebarOpen ? 'w-64' : 'w-20'
    )}>
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-tosca-800">
        <div className="w-9 h-9 rounded-xl bg-tosca-500 flex items-center justify-center text-white font-bold shadow-lg">
          W
        </div>
        {sidebarOpen && (
          <div className="leading-tight">
            <div className="font-semibold text-white">WorkMonitor</div>
            <div className="text-[11px] text-tosca-300">Task Management</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
              'hover:bg-tosca-800 hover:text-white',
              isActive ? 'bg-tosca-500 text-white shadow-lg' : 'text-tosca-200'
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* Master Data section (khusus admin) */}
        {masterItems.length > 0 && sidebarOpen && (
          <div className="pt-4 mt-2 border-t border-tosca-800">
            <div className="text-[10px] uppercase tracking-wider text-tosca-400 font-semibold px-3 mb-2">
              Master Data
            </div>
            {masterItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                  'hover:bg-tosca-800 hover:text-white',
                  isActive ? 'bg-tosca-500 text-white shadow-lg' : 'text-tosca-200'
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* User Card + Dropdown */}
      <div className="border-t border-tosca-800 p-3 relative" ref={menuRef}>
        {menuOpen && (
          <div className={cn(
            'absolute z-50 bg-white rounded-xl shadow-2xl border border-ink-100 overflow-hidden animate-fade-in',
            sidebarOpen
              ? 'left-3 right-3 bottom-[76px]'
              : 'left-[76px] bottom-3 w-56'
          )}>
            <div className="px-4 py-3 border-b border-ink-100 bg-ink-50/50">
              <div className="flex items-center gap-2.5">
                <Avatar name={user?.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink-800 truncate">{user?.name}</div>
                  <div className="text-[11px] text-ink-500 truncate">{user?.email}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-tosca-600" />
                <span className="text-[10px] font-medium text-tosca-700 uppercase tracking-wide">
                  {user?.role || 'member'}
                </span>
              </div>
            </div>

            <div className="py-1">
              <button
                onClick={goProfile}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-tosca-50 hover:text-tosca-700 transition"
              >
                <User className="w-4 h-4" />
                <span>Profil Saya</span>
              </button>
              <button
                onClick={() => { setMenuOpen(false); toast('Settings akan datang') }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-tosca-50 hover:text-tosca-700 transition"
              >
                <Settings className="w-4 h-4" />
                <span>Pengaturan</span>
              </button>
            </div>

            <div className="border-t border-ink-100 py-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            'w-full flex items-center gap-3 p-2 rounded-xl transition',
            'hover:bg-tosca-800',
            menuOpen && 'bg-tosca-800'
          )}
        >
          <Avatar name={user?.name} size="sm" />
          {sidebarOpen && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium text-white truncate">{user?.name}</div>
                <div className="text-[11px] text-tosca-300 truncate capitalize">{user?.role}</div>
              </div>
              <ChevronUp className={cn(
                'w-4 h-4 text-tosca-300 transition-transform',
                menuOpen ? 'rotate-180' : ''
              )} />
            </>
          )}
        </button>
      </div>

      {/* Toggle */}
      <button
        onClick={toggleSidebar}
        className="h-10 flex items-center justify-center border-t border-tosca-800 text-tosca-300 hover:text-white hover:bg-tosca-800"
      >
        {sidebarOpen ? <ChevronsLeft className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />}
      </button>
    </aside>
  )
}