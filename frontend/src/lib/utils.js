import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast, parseISO, differenceInDays } from 'date-fns'
import { id as localeID } from 'date-fns/locale'

/* ==================== ClassName ==================== */
export const cn = (...inputs) => twMerge(clsx(inputs))

/* ==================== Date Formatters ==================== */
export const fmtDate = (d) =>
  d ? format(new Date(d), 'dd MMM yyyy', { locale: localeID }) : '-'

export const fmtDateTime = (d) =>
  d ? format(new Date(d), 'dd MMM yyyy HH:mm', { locale: localeID }) : '-'

export const fmtRelative = (d) =>
  d
    ? formatDistanceToNow(new Date(d), { addSuffix: true, locale: localeID })
    : '-'

export const isOverdue = (d) => d && isPast(parseISO(d))

/* ==================== String Helpers ==================== */
export const initials = (name = '') =>
  name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

/* ==================== Priority Metadata ==================== */
export const PRIORITY_META = {
  lowest:  { label: 'Lowest',  color: 'bg-slate-400',   text: 'text-slate-700',   hex: '#94A3B8' },
  low:     { label: 'Low',     color: 'bg-emerald-500', text: 'text-emerald-700', hex: '#10B981' },
  medium:  { label: 'Medium',  color: 'bg-amber-500',   text: 'text-amber-700',   hex: '#F59E0B' },
  high:    { label: 'High',    color: 'bg-orange-500',  text: 'text-orange-700',  hex: '#F97316' },
  highest: { label: 'Highest', color: 'bg-red-500',     text: 'text-red-700',     hex: '#EF4444' }
}

/* ==================== Status Metadata ==================== */
export const STATUS_META = {
  backlog:     { label: 'Backlog',     color: 'bg-slate-400',   hex: '#94A3B8' },
  todo:        { label: 'To Do',       color: 'bg-tosca-400',   hex: '#2DD4BF' },
  in_progress: { label: 'In Progress', color: 'bg-tosca-600',   hex: '#0D9488' },
  review:      { label: 'Review',      color: 'bg-amber-500',   hex: '#F59E0B' },
  done:        { label: 'Done',        color: 'bg-emerald-500', hex: '#10B981' }
}

/* ==================== Objectives (Story Points) ==================== */
export const OBJECTIVES = [
  {
    value: 'daily',
    label: 'Daily',
    points: 3,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dotColor: '#3B82F6',
    description: 'Pekerjaan rutin harian'
  },
  {
    value: 'troubleshooting',
    label: 'Troubleshooting',
    points: 8,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    dotColor: '#F59E0B',
    description: 'Perbaikan bug / issue'
  },
  {
    value: 'compliance',
    label: 'Compliance',
    points: 20,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    dotColor: '#8B5CF6',
    description: 'Kepatuhan regulasi'
  },
  {
    value: 'improvement',
    label: 'Improvement',
    points: 20,
    color: 'bg-tosca-100 text-tosca-700 border-tosca-200',
    dotColor: '#0D9488',
    description: 'Peningkatan sistem'
  },
  {
    value: 'new_project',
    label: 'New Project',
    points: 60,
    color: 'bg-red-100 text-red-700 border-red-200',
    dotColor: '#EF4444',
    description: 'Project baru'
  }
]

export const getObjectiveMeta = (value) =>
  OBJECTIVES.find((o) => o.value === value) || OBJECTIVES[0]

export const getStoryPoints = (objectiveValue) =>
  getObjectiveMeta(objectiveValue).points

/* ==================== Departments ==================== */
export const DEPARTMENTS = [
  { code: 'IT',  name: 'Information Technology' },
  { code: 'ACC', name: 'Accounting' },
  { code: 'HR',  name: 'Human Resources' },
  { code: 'MKT', name: 'Marketing' },
  { code: 'TAX', name: 'Tax' },
  { code: 'CLM', name: 'Claim' },
  { code: 'FIN', name: 'Finance' }
]
