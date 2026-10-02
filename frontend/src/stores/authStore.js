import { create } from 'zustand'
import api from '@/lib/api'

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('wm_user') || 'null'),
  token: localStorage.getItem('wm_token'),
  loading: false,

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/login', { email, password })
      const { token, user } = data.data
      localStorage.setItem('wm_token', token)
      localStorage.setItem('wm_user', JSON.stringify(user))
      set({ user, token, loading: false })
      return user
    } catch (e) {
      set({ loading: false })
      throw new Error(e.response?.data?.message || 'Login gagal')
    }
  },

  logout: () => {
    localStorage.removeItem('wm_token')
    localStorage.removeItem('wm_user')
    set({ user: null, token: null })
  },

  // Update profile — kalau backend belum ready, update lokal dulu
  updateProfile: async (payload) => {
    try {
      const { data } = await api.put('/me', payload)
      const updated = data.data
      localStorage.setItem('wm_user', JSON.stringify(updated))
      set({ user: updated })
      return updated
    } catch (e) {
      // Fallback: update lokal saja kalau API belum ada
      if (e.response?.status === 404 || e.code === 'ERR_NETWORK') {
        const current = JSON.parse(localStorage.getItem('wm_user') || '{}')
        const updated = { ...current, ...payload }
        delete updated.password // jangan simpan password di localStorage
        localStorage.setItem('wm_user', JSON.stringify(updated))
        set({ user: updated })
        return updated
      }
      throw new Error(e.response?.data?.message || 'Gagal update profil')
    }
  }
}))
