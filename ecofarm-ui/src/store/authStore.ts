import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { UserSummary } from "@/types/api"

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserSummary | null
  adminOverview: boolean
  setAuth: (token: string, refreshToken: string, user: UserSummary, adminOverview?: boolean) => void
  updateAccessToken: (token: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      adminOverview: false,
      setAuth: (accessToken, refreshToken, user, adminOverview = false) =>
        set({ accessToken, refreshToken, user, adminOverview }),
      updateAccessToken: (accessToken) => set({ accessToken }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null, adminOverview: false }),
    }),
    { name: "ecofarm-auth" },
  ),
)
