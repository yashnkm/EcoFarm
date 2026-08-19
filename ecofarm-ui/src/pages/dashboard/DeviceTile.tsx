import { Link } from "react-router-dom"
import { AlertTriangle } from "lucide-react"

import type { Device } from "@/types/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { statusAccentClass, statusBadgeProps } from "./deviceStatus"

export interface DeviceAlertSummary {
  count: number
}

interface Props {
  device: Device
  alert?: DeviceAlertSummary
}

export function DeviceTile({ device, alert }: Props) {
  const sectionCount = new Set(
    Object.values(device.dataPointGroups ?? {}).filter(Boolean)
  ).size

  const statusBadge = statusBadgeProps(device.status)

  return (
    <Link to={`/live/${device.id}`} className="block">
      <Card
        className={cn(
          "h-full border-l-4 transition-shadow hover:shadow-md",
          statusAccentClass(device.status)
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <CardTitle className="truncate text-base">{device.name}</CardTitle>
              <span className="truncate text-xs text-muted-foreground">{device.profileName}</span>
            </div>
            <Badge variant={statusBadge.variant} className={statusBadge.className}>
              {device.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-0">
          <span className="text-xs text-muted-foreground">
            {sectionCount > 0 ? `${sectionCount} section${sectionCount === 1 ? "" : "s"}` : "No sections"}
          </span>
          {alert && alert.count > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="size-3" />
              {alert.count}
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
