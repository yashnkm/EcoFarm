import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"

import { useAuthStore } from "@/store/authStore"
import { ProtectedRoute } from "@/components/layout/ProtectedRoute"
import { AppLayout } from "@/components/layout/AppLayout"
import { LoginPage } from "@/pages/auth/LoginPage"
import { AdminLoginPage } from "@/pages/admin/AdminLoginPage"
import { AdminOverviewPage } from "@/pages/admin/AdminOverviewPage"
import { DashboardPage } from "@/pages/dashboard/DashboardPage"
import { SitesPage } from "@/pages/sites/SitesPage"
import { GatewaysPage } from "@/pages/gateways/GatewaysPage"
import { DevicesPage } from "@/pages/devices/DevicesPage"
import { DeviceDetailPage } from "@/pages/devices/DeviceDetailPage"
import { DeviceProfilesPage } from "@/pages/profiles/DeviceProfilesPage"
import { DeviceProfileDetailPage } from "@/pages/profiles/DeviceProfileDetailPage"
import { TenantsPage } from "@/pages/tenants/TenantsPage"
import { UsersPage } from "@/pages/users/UsersPage"
import { GatewayDriversPage } from "@/pages/drivers/GatewayDriversPage"
import { BrokersPage } from "@/pages/brokers/BrokersPage"
import { OpsPage } from "@/pages/admin/OpsPage"

const isAdminPortal = window.location.hostname.startsWith("admin.")

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAdminPortal ? <AdminLoginPage /> : <LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="/admin/overview" element={<AdminOverviewPage />} />
            <Route path="/sites" element={<SitesPage />} />
            <Route path="/gateways" element={<GatewaysPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/devices/:id" element={<DeviceDetailPage />} />
            <Route element={<SuperAdminRoute />}>
              <Route path="/profiles" element={<DeviceProfilesPage />} />
              <Route path="/profiles/:id" element={<DeviceProfileDetailPage />} />
            </Route>
            <Route path="/gateway-drivers" element={<GatewayDriversPage />} />
            <Route path="/alerts" element={<Placeholder title="Alerts" />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/admin/brokers" element={<BrokersPage />} />
            <Route path="/admin/tenants" element={<TenantsPage />} />
            <Route path="/admin/ops" element={<OpsPage />} />
            <Route path="/settings" element={<Placeholder title="Settings" />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function SuperAdminRoute() {
  const role = useAuthStore((s) => s.user?.role)
  if (role !== "SUPER_ADMIN") return <Navigate to="/" replace />
  return <Outlet />
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">This page will be built next.</p>
    </div>
  )
}
