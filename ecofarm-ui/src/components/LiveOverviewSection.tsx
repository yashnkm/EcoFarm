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
  const [siteFilter, setSiteFilter] = useState<string>("")

  // Devices with at least one data point assigned to a zone
  const zonedDevices = devices.filter((d) =>
    Object.values(d.dataPointGroups ?? {}).some((v) => !!v)
  )

  // Optionally narrow by site
  const visibleDevices = siteFilter
    ? zonedDevices.filter((d) => d.siteId === siteFilter)
    : zonedDevices

  const profileIds = [...new Set(visibleDevices.map((d) => d.profileId))]

  const dpQueries = useQueries({
    queries: profileIds.map((pid) => ({
      queryKey: ["data-points", pid],
      queryFn: () => dataPointsApi.list(pid),
      staleTime: 60_000,
    })),
  })
  const cmdQueries = useQueries({
    queries: profileIds.map((pid) => ({
      queryKey: ["commands", pid],
      queryFn: () => commandTemplatesApi.list(pid),
      staleTime: 60_000,
    })),
  })

  const dataPointsByProfile = new Map(profileIds.map((pid, i) => [pid, dpQueries[i]?.data ?? []]))
  const commandsByProfile = new Map(profileIds.map((pid, i) => [pid, cmdQueries[i]?.data ?? []]))
  const profilesLoading = dpQueries.some((q) => q.isLoading) || cmdQueries.some((q) => q.isLoading)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Live Overview</h2>
        </div>

        {sites.length > 0 && (
          <Select value={siteFilter} onValueChange={(v) => setSiteFilter(v ?? "")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All sites">
                {(value: string | null) =>
                  value ? sites.find((s) => s.id === value)?.name ?? value : "All sites"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="">All sites</SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </div>

      {devicesLoading || profilesLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : visibleDevices.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {siteFilter
            ? "No zone-assigned devices at this site."
            : "No devices with zone-assigned data points. Open a device and assign zones to its data points."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleDevices.map((device) => (
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
