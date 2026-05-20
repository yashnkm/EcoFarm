import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"

import { useAuthStore } from "@/store/authStore"

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1"

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
})

// ── Request interceptor: attach JWT ────────────────────────────

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor: refresh on 401 ───────────────────────

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let refreshInFlight: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const store = useAuthStore.getState()
  if (!store.refreshToken) throw new Error("No refresh token")

  const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
    refreshToken: store.refreshToken,
  })
  store.setAuth(res.data.accessToken, res.data.refreshToken, res.data.user)
  return res.data.accessToken as string
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableRequest | undefined
    if (!original || original._retry || error.response?.status !== 401) {
      return Promise.reject(error)
    }
    // Don't try to refresh auth calls themselves
    if (original.url?.includes("/auth/")) return Promise.reject(error)

    original._retry = true
    try {
      refreshInFlight ??= refreshAccessToken()
      const newToken = await refreshInFlight
      original.headers.Authorization = `Bearer ${newToken}`
      return apiClient(original)
    } catch (refreshError) {
      useAuthStore.getState().clear()
      window.location.href = "/login"
      return Promise.reject(refreshError)
    } finally {
      refreshInFlight = null
    }
  },
)
