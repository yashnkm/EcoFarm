import { Navigate, Outlet } from "react-router-dom"

import { useAuthStore } from "@/store/authStore"

export function ProtectedRoute() {
  const authenticated = useAuthStore((s) => !!s.accessToken)
  if (!authenticated) return <Navigate to="/login" replace />
  return <Outlet />
}
