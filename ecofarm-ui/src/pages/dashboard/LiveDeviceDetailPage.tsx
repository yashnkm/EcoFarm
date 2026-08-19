import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Settings2 } from "lucide-react"

import { devicesApi } from "@/api/devices"
import { dataPointsApi, commandTemplatesApi } from "@/api/deviceProfiles"
import { useAuthStore } from "@/store/authStore"
import { useLiveReadingsAll } from "@/hooks/useLiveReadingsAll"
import { DeviceLiveCard } from "./DeviceLiveCard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function LiveDeviceDetailPage() {
  const { deviceId = "" } = useParams<{ deviceId: string }>()
  const user = useAuthStore((s) => s.user)
  const readings = useLiveReadingsAll()

  const canConfigure = user?.role === "SUPER_ADMIN" || user?.role === "TENANT_ADMIN"

  const deviceQuery = useQuery({
    queryKey: ["device", deviceId],
    queryFn: () => devicesApi.get(deviceId),
    enabled: !!deviceId,
  })

  const dataPointsQuery = useQuery({
    queryKey: ["data-points", deviceQuery.data?.profileId],
    queryFn: () => dataPointsApi.list(deviceQuery.data!.profileId),
    enabled: !!deviceQuery.data?.profileId,
  })

  const commandsQuery = useQuery({
    queryKey: ["commands-tpl", deviceQuery.data?.profileId],
    queryFn: () => commandTemplatesApi.list(deviceQuery.data!.profileId),
    enabled: !!deviceQuery.data?.profileId,
  })

  // Drives the command-derived fan fallback in SectionDiagram for sections
  // whose fan has only a write command, no readable status point.
  const commandHistoryQuery = useQuery({
    queryKey: ["command-history", deviceId],
    queryFn: () => devicesApi.listCommands(deviceId),
    enabled: !!deviceId,
    refetchInterval: 5000,
  })

  const isLoading = deviceQuery.isLoading || dataPointsQuery.isLoading || commandsQuery.isLoading

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" render={<Link to="/" />}>
          <ArrowLeft data-icon="inline-start" />
          Back to dashboard
        </Button>
        {canConfigure && deviceQuery.data && (
          <Button variant="outline" size="sm" render={<Link to={`/devices/${deviceQuery.data.id}`} />}>
            <Settings2 data-icon="inline-start" />
            Technical details
          </Button>
        )}
      </div>

      <div className="mx-auto w-full max-w-2xl">
        {isLoading || !deviceQuery.data ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : (
          <DeviceLiveCard
            device={deviceQuery.data}
            dataPoints={dataPointsQuery.data ?? []}
            commands={commandsQuery.data ?? []}
            readings={readings}
            commandHistory={commandHistoryQuery.data ?? []}
          />
        )}
      </div>
    </div>
  )
}
