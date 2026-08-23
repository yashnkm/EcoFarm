import { useQuery, useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { apiClient } from "@/lib/apiClient"
import { authApi } from "@/api/auth"
import { useAuthStore } from "@/store/authStore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OriginalDataTab } from "./OriginalDataTab"
import { SamplingGroupsTab } from "./SamplingGroupsTab"
import type { AdminOverview } from "@/types/api"

export function DataLogPage() {
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  const isSuperAdmin = user?.role === "SUPER_ADMIN"

  // Only fetched for a SUPER_ADMIN who has already switched into a tenant —
  // lets them pick a different tenant to view without going back through
  // Admin Overview each time.
  const { data: overview } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => apiClient.get<AdminOverview>("/admin/overview").then((r) => r.data),
    enabled: isSuperAdmin,
  })

  const switchMutation = useMutation({
    mutationFn: (slug: string) => authApi.switchTenant(slug),
    onSuccess: (res) => {
      setAuth(res.accessToken, res.refreshToken, res.user, false)
      toast.success(`Viewing ${res.user.tenantName}`)
      navigate("/data-log", { replace: true })
    },
    onError: () => toast.error("Failed to switch tenant"),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Data Log</h1>
          <p className="text-sm text-muted-foreground">
            Historical readings — pick a Sampling Group and time range to view as a chart or a list.
          </p>
        </div>

        {isSuperAdmin && overview && overview.tenants.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Viewing</span>
            <Select
              value={user?.tenantId}
              onValueChange={(slug) => {
                const tenant = overview.tenants.find((t) => t.id === slug)
                if (tenant) switchMutation.mutate(tenant.slug)
              }}
            >
              <SelectTrigger size="sm" className="w-48">
                <SelectValue>{() => user?.tenantName ?? "Select tenant"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {overview.tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Tabs defaultValue="original-data">
        <TabsList>
          <TabsTrigger value="original-data">Original Data</TabsTrigger>
          <TabsTrigger value="data-sampling">Data Sampling</TabsTrigger>
        </TabsList>
        <TabsContent value="original-data"><OriginalDataTab /></TabsContent>
        <TabsContent value="data-sampling"><SamplingGroupsTab /></TabsContent>
      </Tabs>
    </div>
  )
}
