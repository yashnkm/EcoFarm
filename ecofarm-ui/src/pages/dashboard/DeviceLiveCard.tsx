import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useAuthStore } from "@/store/authStore"
import { devicesApi } from "@/api/devices"
import type { Device, DataPoint, CommandTemplate, Reading } from "@/types/api"
import { meetsMinRole } from "@/lib/roles"
import { statusBadgeProps } from "./deviceStatus"
import { SectionCard } from "./SectionCard"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Props {
  device: Device
  dataPoints: DataPoint[]
  commands: CommandTemplate[]
  readings: Map<string, Reading>
}

export function DeviceLiveCard({ device, dataPoints, commands, readings }: Props) {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  // Every command a user is allowed to see, regardless of section — each
  // SectionCard below picks out the ones assigned to its own zone. A command
  // with no zone assigned simply doesn't render anywhere on this page, the
  // same rule already used for data points.
  const visibleCommands = user?.role
    ? commands.filter((cmd) => meetsMinRole(user.role, cmd.minRole))
    : []

  // Device-wide mode indicator (Auto/Manual) — not zone-assigned, so it's
  // resolved once here and shown in every section card's header.
  const modeDataPoint = dataPoints.find((dp) => dp.label.trim().toLowerCase() === "mode")
  const modeReading = modeDataPoint ? readings.get(`${device.id}:${modeDataPoint.key}`) : undefined

  // Only show data points that are displayed=true and have a zone assigned
  const zonedDataPoints = dataPoints.filter(
    (dp) => dp.displayed && !!device.dataPointGroups[dp.key]
  )

  // Group by zone name preserving insertion order
  const byZone = new Map<string, DataPoint[]>()
  for (const dp of zonedDataPoints) {
    const zone = device.dataPointGroups[dp.key]
    if (!byZone.has(zone)) byZone.set(zone, [])
    byZone.get(zone)!.push(dp)
  }

  const cmdMutation = useMutation({
    mutationFn: ({ cmdId, value }: { cmdId: string; value?: number }) =>
      devicesApi.issueCommand(device.id, cmdId, value),
    onSuccess: () => {
      toast.success("Command issued successfully")
      queryClient.invalidateQueries({ queryKey: ["commands", device.id] })
    },
    onError: () => toast.error("Failed to issue command"),
  })

  const statusBadge = statusBadgeProps(device.status)

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <CardTitle className="truncate text-base">{device.name}</CardTitle>
            <span className="truncate text-xs text-muted-foreground">
              {device.profileName}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={statusBadge.variant} className={statusBadge.className}>
              {device.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5">
        {byZone.size === 0 ? (
          <p className="text-xs text-muted-foreground">
            No zone-assigned data points configured.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from(byZone.entries()).map(([zoneName, dps]) => (
              <SectionCard
                key={zoneName}
                zoneName={zoneName}
                dataPoints={dps}
                commands={visibleCommands}
                commandGroups={device.commandGroups ?? {}}
                readings={readings}
                deviceId={device.id}
                deviceStatus={device.status}
                modeDataPoint={modeDataPoint}
                modeReading={modeReading}
                issuePending={cmdMutation.isPending}
                onIssueCommand={(cmdId, value) => cmdMutation.mutate({ cmdId, value })}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
