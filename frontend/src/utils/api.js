import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aegix_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ADD THIS INTERCEPTOR
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.requires2FASetup) {
      window.location.href = '/dashboard/settings?setup2fa=true'
    }
    return Promise.reject(error)
  }
)

export default api
