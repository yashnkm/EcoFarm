import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { UserSummary } from "@/types/api"

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserSummary | null
  setAuth: (token: string, refreshToken: string, user: UserSummary) => void
  updateAccessToken: (token: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user }),
      updateAccessToken: (accessToken) => set({ accessToken }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: "ecofarm-auth" },
  ),
)
