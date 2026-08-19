import { useState, useMemo, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { LayoutGrid } from "lucide-react"

import { sitesApi } from "@/api/sites"
import { devicesApi } from "@/api/devices"
import { alertsApi } from "@/api/alerts"
import { useLiveAlerts } from "@/hooks/useLiveAlerts"
import { DeviceTile, type DeviceAlertSummary } from "./DeviceTile"
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
  const queryClient = useQueryClient()

  const activeAlertsQuery = useQuery({
    queryKey: ["alerts", "active"],
    queryFn: () => alertsApi.list({ status: "ACTIVE", size: 200 }),
    refetchInterval: 15_000,
  })

  // Refresh alert-driven tile colors as soon as a new alert fires, instead
  // of waiting for the next poll.
  useLiveAlerts(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["alerts", "active"] })
    }, [queryClient])
  )

  const alertsByDevice = useMemo(() => {
    const map = new Map<string, DeviceAlertSummary>()
    for (const alert of activeAlertsQuery.data?.content ?? []) {
      const existing = map.get(alert.deviceId)
      if (existing) existing.count += 1
      else map.set(alert.deviceId, { count: 1 })
    }
    return map
  }, [activeAlertsQuery.data])

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDevices.map((device) => (
            <DeviceTile
              key={device.id}
              device={device}
              alert={alertsByDevice.get(device.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
