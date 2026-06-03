import { defineStore } from 'pinia'
import api from '@/services/api'

const getStoredUser = () => {
  const storedUser = localStorage.getItem('user')
  return storedUser ? JSON.parse(storedUser) : null
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: getStoredUser(),
    token: localStorage.getItem('token') || null,
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.user && state.token),
    role: (state) => state.user?.role,
  },

  actions: {
    setSession(user, token) {
      // Persiste la sesion para que un refresco de pagina no cierre la sesion del usuario.
      this.user = user
      this.token = token
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('token', token)
    },

    clearSession() {
      this.user = null
      this.token = null
      localStorage.removeItem('user')
      localStorage.removeItem('token')
    },

    async login(credentials) {
      const response = await api.post('/login', credentials)
      this.setSession(response.data.user, response.data.token)
      return response.data
    },

    async register(data) {
      const response = await api.post('/register', data)
      this.setSession(response.data.user, response.data.token)
      return response.data
    },

    async logout() {
      try {
        if (this.token) {
          await api.post('/logout')
        }
      } finally {
        // Limpia los datos locales aunque falle la peticion al servidor.
        this.clearSession()
      }
    },
  },
})
