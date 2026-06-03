import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8001/api',
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  // Cada peticion protegida envia el token de Sanctum generado por el backend.
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    // Si el token no es valido o ha caducado, se limpia la sesion local y se fuerza el login.
    if (status === 401) {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      window.dispatchEvent(new Event('auth-changed'))

      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    if (status === 403) {
      // El backend sigue siendo la fuente real de permisos.
      console.warn('No tienes permiso para esta acción.')
    }

    return Promise.reject(error)
  },
)

export default api
