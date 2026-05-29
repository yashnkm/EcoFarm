import { apiClient } from "@/lib/apiClient"
import type { TokenResponse, User } from "@/types/api"

export const authApi = {
  login: (email: string, password: string, slug?: string, adminPortal = false) =>
    apiClient.post<TokenResponse>("/auth/login", { email, password, slug: slug || undefined, adminPortal }).then((r) => r.data),

  switchTenant: (slug: string) =>
    apiClient.post<TokenResponse>("/admin/switch-tenant", { slug }).then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient.post<TokenResponse>("/auth/refresh", { refreshToken }).then((r) => r.data),

  logout: (refreshToken: string) =>
    apiClient.post<void>("/auth/logout", { refreshToken }).then(() => undefined),

  me: () => apiClient.get<User>("/me").then((r) => r.data),
}
