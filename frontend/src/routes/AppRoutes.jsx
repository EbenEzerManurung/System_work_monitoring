import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import Spinner from '@/components/ui/Spinner'

// ============================================================
// LAZY LOADING — code splitting per halaman
// ============================================================
const LoginPage         = lazy(() => import('@/pages/LoginPage'))
const DashboardPage     = lazy(() => import('@/pages/DashboardPage'))
const BoardPage         = lazy(() => import('@/pages/BoardPage'))
const BacklogPage       = lazy(() => import('@/pages/BacklogPage'))
const SprintsPage       = lazy(() => import('@/pages/SprintsPage'))
const CalendarPage      = lazy(() => import('@/pages/CalendarPage'))
const AuditPage         = lazy(() => import('@/pages/AuditPage'))
const ProfilePage       = lazy(() => import('@/pages/ProfilePage'))
const DepartmentsPage   = lazy(() => import('@/pages/DepartmentsPage'))
const UsersPage         = lazy(() => import('@/pages/UsersPage'))
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'))
const NotFoundPage      = lazy(() => import('@/pages/NotFoundPage'))

// ============================================================
// AUTH HELPERS
// ============================================================

/**
 * Cek apakah user sudah login DAN token masih valid.
 * Token dianggap valid kalau ada, panjang OK, dan belum expired.
 */
function isAuthenticated() {
  const token = localStorage.getItem('wm_token')
  if (!token || token.length < 10) return false

  // Cek expiry kalau token JWT (format: header.payload.signature)
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]))
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        // Token expired → hapus
        localStorage.removeItem('wm_token')
        localStorage.removeItem('wm_user')
        return false
      }
    }
  } catch {
    // Kalau bukan JWT valid, anggap expired
    return false
  }

  return true
}

/**
 * Ambil user dari localStorage.
 * Return empty object kalau tidak ada / corrupt.
 */
function getUser() {
  try {
    const raw = localStorage.getItem('wm_user')
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

// ============================================================
// ROLE CHECKS
// ============================================================
const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
  VIEWER: 'viewer'
}

function hasRole(user, ...allowedRoles) {
  if (!user || !user.role) return false
  return allowedRoles.includes(user.role)
}

// ============================================================
// ROUTE GUARDS
// ============================================================

/**
 * ProtectedRoute — hanya user yang login & token valid.
 * Redirect ke /login kalau tidak.
 */
function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return children
}

/**
 * GuestRoute — untuk halaman publik seperti /login.
 * Redirect ke dashboard kalau sudah login.
 */
function GuestRoute({ children }) {
  if (isAuthenticated()) {
    return <Navigate to="/" replace />
  }
  return children
}

/**
 * RoleRoute — batasi akses berdasarkan role.
 * Redirect ke dashboard kalau role tidak sesuai.
 *
 * Contoh:
 *   <RoleRoute allowed={['admin']}>...</RoleRoute>
 *   <RoleRoute allowed={['admin', 'manager']}>...</RoleRoute>
 */
function RoleRoute({ allowed = [], children }) {
  const user = getUser()
  if (!hasRole(user, ...allowed)) {
    return <Navigate to="/" replace />
  }
  return children
}

// Shorthand role guards
function AdminRoute({ children }) {
  return <RoleRoute allowed={[ROLES.ADMIN]}>{children}</RoleRoute>
}

function ManagerRoute({ children }) {
  return (
    <RoleRoute allowed={[ROLES.ADMIN, ROLES.MANAGER]}>
      {children}
    </RoleRoute>
  )
}

// ============================================================
// FALLBACKS
// ============================================================

/**
 * PageLoader — fallback saat halaman lazy-loaded sedang dimuat.
 */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner label="Memuat halaman..." />
    </div>
  )
}

// ============================================================
// APP ROUTES
// ============================================================
export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ============================================================
            PUBLIC ROUTES
            ============================================================ */}
        <Route
          path="/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            </Suspense>
          }
        />

        {/* ============================================================
            PROTECTED ROUTES (butuh login)
            AppLayout sebagai wrapper dengan nested routes
            ============================================================ */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* --- Dashboard (semua role) --- */}
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            }
          />

          {/* --- Eksekusi Task (semua role) --- */}
          <Route
            path="board"
            element={
              <Suspense fallback={<PageLoader />}>
                <BoardPage />
              </Suspense>
            }
          />
          <Route
            path="backlog"
            element={
              <Suspense fallback={<PageLoader />}>
                <BacklogPage />
              </Suspense>
            }
          />
          <Route
            path="sprints"
            element={
              <Suspense fallback={<PageLoader />}>
                <SprintsPage />
              </Suspense>
            }
          />
          <Route
            path="calendar"
            element={
              <Suspense fallback={<PageLoader />}>
                <CalendarPage />
              </Suspense>
            }
          />

          {/* --- Audit Trail (admin & manager) --- */}
          <Route
            path="audit"
            element={
              <ManagerRoute>
                <Suspense fallback={<PageLoader />}>
                  <AuditPage />
                </Suspense>
              </ManagerRoute>
            }
          />

          {/* --- User Personal (semua role) --- */}
          <Route
            path="profile"
            element={
              <Suspense fallback={<PageLoader />}>
                <ProfilePage />
              </Suspense>
            }
          />
          <Route
            path="notifications"
            element={
              <Suspense fallback={<PageLoader />}>
                <NotificationsPage />
              </Suspense>
            }
          />

          {/* --- Master Data (admin only) --- */}
          <Route
            path="departments"
            element={
              <AdminRoute>
                <Suspense fallback={<PageLoader />}>
                  <DepartmentsPage />
                </Suspense>
              </AdminRoute>
            }
          />
          <Route
            path="users"
            element={
              <AdminRoute>
                <Suspense fallback={<PageLoader />}>
                  <UsersPage />
                </Suspense>
              </AdminRoute>
            }
          />
        </Route>

        {/* ============================================================
            404 FALLBACK
            ============================================================ */}
        <Route
          path="*"
          element={
            <Suspense fallback={<PageLoader />}>
              <NotFoundPage />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}