import { create } from 'zustand'

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),

  installPrompt: null,
  setInstallPrompt: (p) => set({ installPrompt: p }),
  clearInstallPrompt: () => set({ installPrompt: null })
}))
