import { useState } from "react"
import { useQueries } from "@tanstack/react-query"
import { Radio } from "lucide-react"

import { dataPointsApi, commandTemplatesApi } from "@/api/deviceProfiles"
import { useAuthStore } from "@/store/authStore"
import type { Device, Site } from "@/types/api"
import type { LiveReading } from "@/hooks/useLiveReadings"
import { DeviceLiveCard } from "@/components/DeviceLiveCard"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Props {
  sites: Site[]
  devices: Device[]
  liveReadings: Map<string, LiveReading>
  devicesLoading: boolean
}

export function LiveOverviewSection({ sites, devices, liveReadings, devicesLoading }: Props) {
  const { user } = useAuthStore()
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)

  const effectiveSiteId = selectedSiteId ?? sites[0]?.id ?? null

  const siteDevices = effectiveSiteId
    ? devices.filter((d) => d.siteId === effectiveSiteId && d.zoneId)
    : []

  const profileIds = [...new Set(siteDevices.map((d) => d.profileId))]

  const dataPointQueries = useQueries({
    queries: profileIds.map((pid) => ({
      queryKey: ["data-points", pid],
      queryFn: () => dataPointsApi.list(pid),
      staleTime: 60_000,
    })),
  })

  const commandQueries = useQueries({
    queries: profileIds.map((pid) => ({
      queryKey: ["commands", pid],
      queryFn: () => commandTemplatesApi.list(pid),
      staleTime: 60_000,
    })),
  })

  const dataPointsByProfile = new Map(
    profileIds.map((pid, i) => [pid, dataPointQueries[i]?.data ?? []])
  )
  const commandsByProfile = new Map(
    profileIds.map((pid, i) => [pid, commandQueries[i]?.data ?? []])
  )

  const profilesLoading =
    dataPointQueries.some((q) => q.isLoading) || commandQueries.some((q) => q.isLoading)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Live Overview</h2>
        </div>
        <Select
          value={effectiveSiteId ?? ""}
          onValueChange={(v) => setSelectedSiteId(v || null)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select a site…">
              {(value: string | null) => sites.find((s) => s.id === value)?.name ?? value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {!effectiveSiteId ? (
        <p className="text-sm text-muted-foreground">
          No sites found. Add a site to get started.
        </p>
      ) : devicesLoading || profilesLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : siteDevices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No devices found at this site.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {siteDevices.map((device) => (
            <DeviceLiveCard
              key={device.id}
              device={device}
              dataPoints={dataPointsByProfile.get(device.profileId) ?? []}
              commandTemplates={commandsByProfile.get(device.profileId) ?? []}
              liveReadings={liveReadings}
              userRole={user?.role}
            />
          ))}
        </div>
      )}
    </div>
  )
}
