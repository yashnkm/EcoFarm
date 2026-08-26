import { apiClient } from "@/lib/apiClient"
import type { LoginResponse, TokenResponse, User } from "@/types/api"

export const authApi = {
  login: (email: string, password: string, slug?: string, adminPortal = false) =>
    apiClient.post<LoginResponse>("/auth/login", { email, password, slug: slug || undefined, adminPortal }).then((r) => r.data),

  /** Completes a forced first-login password change (or a "forgot password"
   * reset) — signs the user straight in on success. */
  setPassword: (token: string, newPassword: string) =>
    apiClient.post<TokenResponse>("/auth/set-password", { token, newPassword }).then((r) => r.data),

  /** Mails a fresh one-time temp password if the address has an account.
   * Always resolves — the backend responds 204 either way so this can't be
   * used to test which emails have accounts. */
  forgotPassword: (email: string) =>
    apiClient.post<void>("/auth/forgot-password", { email }).then(() => undefined),

  /** Proactive change while already signed in — requires the current
   * password. Revokes all sessions (including this one) on success, so the
   * caller should sign the user out afterward. */
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.patch<void>("/me/password", { currentPassword, newPassword }).then(() => undefined),

  /** Same "prove you're really you" bar as changing the password — requires
   * the current password. Revokes all sessions on success. */
  changeEmail: (currentPassword: string, newEmail: string) =>
    apiClient.patch<void>("/me/email", { currentPassword, newEmail }).then(() => undefined),

  /** Fallback when the password check above can't be cleared — files a
   * request a tenant admin or super admin can approve or reject. */
  requestEmailChange: (requestedEmail: string, note?: string) =>
    apiClient.post<void>("/me/email-change-requests", { requestedEmail, note: note || undefined }).then(() => undefined),

  switchTenant: (slug: string) =>
    apiClient.post<TokenResponse>("/admin/switch-tenant", { slug }).then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient.post<TokenResponse>("/auth/refresh", { refreshToken }).then((r) => r.data),

  logout: (refreshToken: string) =>
    apiClient.post<void>("/auth/logout", { refreshToken }).then(() => undefined),

  me: () => apiClient.get<User>("/me").then((r) => r.data),
}
