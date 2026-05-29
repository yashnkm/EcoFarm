import { useQuery, useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Monitor, Wifi, WifiOff, Building2, LogIn } from "lucide-react"

import { apiClient } from "@/lib/apiClient"
import { authApi } from "@/api/auth"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { AdminOverview } from "@/types/api"

function fetchOverview() {
  return apiClient.get<AdminOverview>("/admin/overview").then((r) => r.data)
}

export function AdminOverviewPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: fetchOverview,
    refetchInterval: 30_000,
  })

  const switchMutation = useMutation({
    mutationFn: (slug: string) => authApi.switchTenant(slug),
    onSuccess: (res) => {
      setAuth(res.accessToken, res.refreshToken, res.user, false)
      toast.success(`Switched to ${res.user.tenantName}`)
      navigate("/", { replace: true })
    },
    onError: () => toast.error("Failed to switch tenant"),
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">All clients at a glance · auto-refreshes every 30s</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard icon={<Building2 className="size-4" />} label="Tenants"  value={data?.tenants.length ?? 0} loading={isLoading} />
        <SummaryCard icon={<Monitor className="size-4" />}   label="Devices"  value={data?.totalDevices ?? 0}  loading={isLoading} />
        <SummaryCard icon={<Wifi className="size-4" />}      label="Online"   value={data?.totalOnline ?? 0}   loading={isLoading} color="text-green-600" />
        <SummaryCard icon={<WifiOff className="size-4" />}   label="Offline"  value={data?.totalOffline ?? 0}  loading={isLoading} color="text-red-500" />
      </div>

      {/* Per-tenant table */}
      <Card>
        <CardHeader>
          <CardTitle>Clients</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-6">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Organisation</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium text-right">Devices</th>
                  <th className="px-4 py-3 font-medium text-right">Online</th>
                  <th className="px-4 py-3 font-medium text-right">Offline</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data?.tenants.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-xs">{t.slug}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.deviceCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-600">{t.onlineCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-500">{t.offlineCount}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={switchMutation.isPending}
                        onClick={() => switchMutation.mutate(t.slug)}
                      >
                        <LogIn className="size-3.5" />
                        Enter
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  icon, label, value, loading, color = "",
}: {
  icon: React.ReactNode
  label: string
  value: number
  loading: boolean
  color?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
        )}
      </CardContent>
    </Card>
  )
}
