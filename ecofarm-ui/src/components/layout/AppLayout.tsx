import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { toast } from "sonner"
import { useMutation } from "@tanstack/react-query"
import {
  Sprout,
  LayoutDashboard,
  MapPin,
  Radio,
  Cpu,
  Package,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  Users,
  Building2,
  Cloud,
  BarChart3,
  ArrowLeft,
  Terminal,
  LineChart,
} from "lucide-react"

import { useAuthStore } from "@/store/authStore"
import { authApi } from "@/api/auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/ThemeToggle"

const isAdminPortal = window.location.hostname.startsWith("admin.")

const PAGE_TITLES: { prefix: string; title: string }[] = [
  { prefix: "/profiles",        title: "Device Profiles" },
  { prefix: "/devices",         title: "Devices" },
  { prefix: "/gateways",        title: "Gateways" },
  { prefix: "/sites",           title: "Sites" },
  { prefix: "/gateway-drivers", title: "Gateway Drivers" },
  { prefix: "/admin/overview",  title: "Overview" },
  { prefix: "/admin/brokers",   title: "Brokers" },
  { prefix: "/admin/tenants",   title: "Tenants" },
  { prefix: "/admin/ops",       title: "Ops Console" },
  { prefix: "/users",           title: "Users" },
  { prefix: "/alerts",          title: "Alerts" },
  { prefix: "/data-log",        title: "Data Log" },
  { prefix: "/settings",        title: "Settings" },
  { prefix: "/",                title: "Dashboard" },
]

const clientNavItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sites", label: "Sites", icon: MapPin },
  { to: "/gateways", label: "Gateways", icon: Radio },
  { to: "/devices", label: "Devices", icon: Cpu },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/data-log", label: "Data Log", icon: LineChart },
]

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const adminOverview = useAuthStore((s) => s.adminOverview)
  const setAuth = useAuthStore((s) => s.setAuth)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const clear = useAuthStore((s) => s.clear)

  useEffect(() => {
    const match = PAGE_TITLES.find((p) => location.pathname.startsWith(p.prefix))
    document.title = match ? `${match.title} | EcoFarm` : "EcoFarm"
  }, [location.pathname])

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.email?.[0]?.toUpperCase() ?? "?"

  const backToAdminMutation = useMutation({
    mutationFn: () => authApi.switchTenant("platform"),
    onSuccess: (res) => {
      setAuth(res.accessToken, res.refreshToken, res.user, true)
      navigate("/admin/overview", { replace: true })
    },
    onError: () => toast.error("Failed to return to admin"),
  })

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {
      // ignore
    } finally {
      clear()
      toast.success("Logged out")
      navigate("/login", { replace: true })
    }
  }

  // ── Sidebar nav ──
  const sidebarNav = (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {/* Back to Admin — only in admin portal when inside a client context */}
        {isAdminPortal && !adminOverview && (
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => backToAdminMutation.mutate()}
              disabled={backToAdminMutation.isPending}
            >
              <ArrowLeft />
              <span>Back to Admin</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}

        {/* Overview — only in admin portal overview mode */}
        {isAdminPortal && adminOverview ? (
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={location.pathname === "/admin/overview"}
              render={<Link to="/admin/overview" />}
            >
              <BarChart3 />
              <span>Overview</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : !adminOverview && (
          // Full client nav — shown in client portal OR admin portal inside a client
          clientNavItems.map((item) => (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton
                isActive={location.pathname === item.to}
                render={<Link to={item.to} />}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))
        )}
      </SidebarMenu>
    </SidebarGroup>
  )

  const adminSection = (user?.role === "SUPER_ADMIN" || user?.role === "TENANT_ADMIN") && (
    <SidebarGroup>
      <SidebarGroupLabel>Admin</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={location.pathname === "/users"}
            render={<Link to="/users" />}
          >
            <Users />
            <span>Users</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {user?.role === "SUPER_ADMIN" && (
          <>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={location.pathname.startsWith("/profiles")}
                render={<Link to="/profiles" />}
              >
                <Package />
                <span>Device Profiles</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={location.pathname === "/gateway-drivers"}
                render={<Link to="/gateway-drivers" />}
              >
                <Radio />
                <span>Gateway Drivers</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={location.pathname === "/admin/brokers"}
                render={<Link to="/admin/brokers" />}
              >
                <Cloud />
                <span>Brokers</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={location.pathname === "/admin/tenants"}
                render={<Link to="/admin/tenants" />}
              >
                <Building2 />
                <span>Tenants</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={location.pathname === "/admin/ops"}
                render={<Link to="/admin/ops" />}
              >
                <Terminal />
                <span>Ops Console</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<Link to={isAdminPortal ? (adminOverview ? "/admin/overview" : "#") : "/"} />}
              >
                <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Sprout className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">EcoFarm</span>
                  <span className="text-xs text-muted-foreground">SCADA Platform</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {sidebarNav}
          {/* Admin section: always shown on admin portal, shown for admins on client portal */}
          {(isAdminPortal || user?.role === "SUPER_ADMIN" || user?.role === "TENANT_ADMIN") && adminSection}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton size="lg">
                      <Avatar className="size-8">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-1 flex-col gap-0.5 leading-none">
                        <span className="text-sm font-medium">
                          {user?.firstName ?? user?.email}
                        </span>
                        <span className="text-xs text-muted-foreground">{user?.role}</span>
                      </div>
                      <ChevronDown className="ml-auto" />
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <DropdownMenuItem render={<Link to="/settings" />}>
                    <Settings />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">{user?.tenantName}</span>
            <span className="text-xs text-muted-foreground">{user?.tenantSlug}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
