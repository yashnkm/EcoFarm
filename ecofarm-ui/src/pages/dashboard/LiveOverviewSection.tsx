import { useState, useMemo } from "react"
import { useQuery, useQueries } from "@tanstack/react-query"
import { LayoutGrid } from "lucide-react"

import { sitesApi } from "@/api/sites"
import { devicesApi } from "@/api/devices"
import { dataPointsApi, commandTemplatesApi } from "@/api/deviceProfiles"
import { useLiveReadingsAll } from "@/hooks/useLiveReadingsAll"
import { DeviceLiveCard } from "./DeviceLiveCard"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"

export function LiveOverviewSection() {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all")
  const readings = useLiveReadingsAll()

  const sitesQuery = useQuery({ queryKey: ["sites"], queryFn: sitesApi.list })
  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: () => devicesApi.list(),
  })

  // Devices for the selected site that have at least one zone-assigned data point
  const filteredDevices = useMemo(() => {
    const all = devicesQuery.data ?? []
    const bySite =
      selectedSiteId === "all"
        ? all
        : all.filter((d) => d.siteId === selectedSiteId)
    return bySite.filter((d) =>
      Object.values(d.dataPointGroups ?? {}).some((v) => !!v)
    )
  }, [devicesQuery.data, selectedSiteId])

  // Unique profile IDs across visible devices
  const profileIds = useMemo(
    () => [...new Set(filteredDevices.map((d) => d.profileId))],
    [filteredDevices]
  )

  const dataPointQueries = useQueries({
    queries: profileIds.map((pid) => ({
      queryKey: ["data-points", pid],
      queryFn: () => dataPointsApi.list(pid),
      staleTime: 60_000,
    })),
  })

  const commandQueries = useQueries({
    queries: profileIds.map((pid) => ({
      queryKey: ["commands-tpl", pid],
      queryFn: () => commandTemplatesApi.list(pid),
      staleTime: 60_000,
    })),
  })

  const dataPointsByProfile = useMemo(() => {
    const map = new Map<string, ReturnType<typeof dataPointsApi.list> extends Promise<infer T> ? T : never>()
    profileIds.forEach((pid, i) => {
      const data = dataPointQueries[i]?.data
      if (data) map.set(pid, data)
    })
    return map
  }, [profileIds, dataPointQueries])

  const commandsByProfile = useMemo(() => {
    const map = new Map<string, ReturnType<typeof commandTemplatesApi.list> extends Promise<infer T> ? T : never>()
    profileIds.forEach((pid, i) => {
      const data = commandQueries[i]?.data
      if (data) map.set(pid, data)
    })
    return map
  }, [profileIds, commandQueries])

  const isLoading = devicesQuery.isLoading || sitesQuery.isLoading

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Live Overview</h2>
          <p className="text-sm text-muted-foreground">Real-time readings from all devices</p>
        </div>
        <Select value={selectedSiteId} onValueChange={(v) => setSelectedSiteId(v ?? "all")}>
          <SelectTrigger className="w-48">
            <span className="flex flex-1 truncate text-left text-sm">
              {selectedSiteId === "all"
                ? "All Sites"
                : (sitesQuery.data?.find((s) => s.id === selectedSiteId)?.name ?? "Select site")}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {sitesQuery.data?.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredDevices.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayoutGrid />
            </EmptyMedia>
            <EmptyTitle>No devices to display</EmptyTitle>
          </EmptyHeader>
          <EmptyDescription>
            {selectedSiteId === "all"
              ? "No devices have zone-assigned data points yet. Assign data points to zones from a device's detail page."
              : "No devices with zone-assigned data points found for this site."}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDevices.map((device) => (
            <DeviceLiveCard
              key={device.id}
              device={device}
              dataPoints={dataPointsByProfile.get(device.profileId) ?? []}
              commands={commandsByProfile.get(device.profileId) ?? []}
              readings={readings}
            />
          ))}
        </div>
      )}
    </div>
  )
}
