import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, AuthTokens } from '../types'
import { api } from '../lib/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string, tenantSlug?: string) => Promise<void>
  logout: () => Promise<void>
  setAuth: (tokens: AuthTokens) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (tokens: AuthTokens) => {
        localStorage.setItem('lineage_access_token', tokens.accessToken)
        localStorage.setItem('lineage_refresh_token', tokens.refreshToken)
        set({ user: tokens.user, isAuthenticated: true })
      },

      login: async (email, password, tenantSlug) => {
        set({ isLoading: true })
        try {
          const payload: Record<string, string> = { email, password }
          if (tenantSlug) payload.tenantSlug = tenantSlug
          const { data } = await api.post<AuthTokens>('/auth/login', payload)
          get().setAuth(data)
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        const refreshToken = localStorage.getItem('lineage_refresh_token')
        try {
          if (refreshToken) await api.post('/auth/logout', { refreshToken })
        } catch {}
        localStorage.removeItem('lineage_access_token')
        localStorage.removeItem('lineage_refresh_token')
        set({ user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'lineage_auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
