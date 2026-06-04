import { useState } from "react"
import { useQuery, useQueries } from "@tanstack/react-query"
import { Radio } from "lucide-react"

import { dataPointsApi, commandTemplatesApi } from "@/api/deviceProfiles"
import { sitesApi } from "@/api/sites"
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
    ? devices.filter((d) => d.siteId === effectiveSiteId)
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

  const { data: zones = [] } = useQuery({
    queryKey: ["zones", effectiveSiteId],
    queryFn: () => sitesApi.listZones(effectiveSiteId!),
    enabled: !!effectiveSiteId,
    staleTime: 60_000,
  })

  const devicesByZone = new Map<string | null, Device[]>()
  for (const d of siteDevices) {
    const key = d.zoneId ?? null
    if (!devicesByZone.has(key)) devicesByZone.set(key, [])
    devicesByZone.get(key)!.push(d)
  }
  const unassignedDevices = devicesByZone.get(null) ?? []

  const renderDeviceGrid = (devs: Device[]) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {devs.map((device) => (
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
  )

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
            <SelectValue placeholder="Select a site…" />
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
      ) : zones.length > 0 ? (
        <div className="flex flex-col gap-6">
          {zones.map((zone) => {
            const zoneDevices = devicesByZone.get(zone.id) ?? []
            if (zoneDevices.length === 0) return null
            return (
              <div key={zone.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">{zone.name}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {renderDeviceGrid(zoneDevices)}
              </div>
            )
          })}
          {unassignedDevices.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Unassigned</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              {renderDeviceGrid(unassignedDevices)}
            </div>
          )}
        </div>
      ) : (
        renderDeviceGrid(siteDevices)
      )}
    </div>
  )
}
