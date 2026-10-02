import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Check, ChevronDown, X, User as UserIcon } from 'lucide-react'
import { cn, initials } from '@/lib/utils'
import api from '@/lib/api'

export default function UserPicker({ value, onChange, placeholder = 'Pilih assignee...', allowClear = true }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data.data),
    staleTime: 60_000
  })

  const selected = useMemo(
    () => users.find((u) => u.id === value || u.name === value),
    [users, value]
  )

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return users
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department_code || '').toLowerCase().includes(q) ||
        (u.department_name || '').toLowerCase().includes(q)
    )
  }, [users, search])

  const handleSelect = (user) => {
    onChange(user)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full min-h-10 px-3 py-1.5 rounded-lg border border-ink-200 bg-white text-sm',
          'flex items-center gap-2 text-left transition',
          'hover:border-tosca-400 focus:outline-none focus:border-tosca-500 focus:ring-2 focus:ring-tosca-500/20',
          open && 'border-tosca-500 ring-2 ring-tosca-500/20'
        )}
      >
        {selected ? (
          <>
            <UserAvatar user={selected} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink-800 truncate">{selected.name}</div>
              {selected.department_code && (
                <div className="text-[10px] text-tosca-600 font-medium">
                  {selected.department_code} · {selected.position || 'Member'}
                </div>
              )}
            </div>
            {allowClear && (
              <span
                onClick={handleClear}
                className="p-1 rounded hover:bg-ink-100 text-ink-400 hover:text-red-500 transition"
                title="Hapus assignee"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
          </>
        ) : (
          <>
            <div className="w-7 h-7 rounded-full bg-ink-100 flex items-center justify-center">
              <UserIcon className="w-3.5 h-3.5 text-ink-400" />
            </div>
            <span className="flex-1 text-ink-400">{placeholder}</span>
          </>
        )}
        <ChevronDown
          className={cn('w-4 h-4 text-ink-400 transition-transform shrink-0', open && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-xl border border-ink-200 shadow-2xl overflow-hidden animate-fade-in">
          {/* Search */}
          <div className="p-2 border-b border-ink-100">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, email, atau departemen..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-ink-200 bg-ink-50 text-sm focus:outline-none focus:border-tosca-500 focus:bg-white"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto scrollbar-thin">
            {isLoading && (
              <div className="px-3 py-6 text-center text-sm text-ink-400">Memuat user...</div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-ink-400">
                {search ? `Tidak ada user cocok "${search}"` : 'Belum ada user'}
              </div>
            )}

            {filtered.map((u) => {
              const isSelected = selected?.id === u.id
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelect(u)}
                  className={cn(
                    'w-full px-3 py-2 flex items-center gap-3 text-left transition',
                    'hover:bg-tosca-50',
                    isSelected && 'bg-tosca-50'
                  )}
                >
                  <UserAvatar user={u} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink-800 truncate">{u.name}</span>
                      {u.role && (
                        <span className={cn(
                          'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded',
                          u.role === 'admin' ? 'bg-red-100 text-red-700' :
                          u.role === 'manager' ? 'bg-amber-100 text-amber-700' :
                          u.role === 'member' ? 'bg-tosca-100 text-tosca-700' :
                          'bg-ink-100 text-ink-600'
                        )}>
                          {u.role}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-ink-500 truncate">{u.email}</span>
                    </div>
                    {u.department_code && (
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                          {u.department_code}
                        </span>
                        <span className="text-[10px] text-ink-400 truncate">
                          {u.department_name}
                        </span>
                      </div>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-tosca-600 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* Avatar with department color ring */
function UserAvatar({ user, size = 'sm' }) {
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm'
  }
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-semibold text-white shrink-0',
      'bg-gradient-to-br from-tosca-500 to-tosca-700',
      sizes[size]
    )} title={user.name}>
      {initials(user.name)}
    </div>
  )
}
