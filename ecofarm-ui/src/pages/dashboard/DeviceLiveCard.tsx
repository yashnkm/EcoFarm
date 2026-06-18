import { useState } from "react"
import { Link } from "react-router-dom"
import { ExternalLink, Zap } from "lucide-react"
import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useAuthStore } from "@/store/authStore"
import { devicesApi } from "@/api/devices"
import type { Device, DataPoint, CommandTemplate, Role, Reading } from "@/types/api"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const ROLE_ORDER: Role[] = ["VIEWER", "OPERATOR", "TENANT_ADMIN", "SUPER_ADMIN"]

function meetsMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(minRole)
}

interface Props {
  device: Device
  dataPoints: DataPoint[]
  commands: CommandTemplate[]
  readings: Map<string, Reading>
}

export function DeviceLiveCard({ device, dataPoints, commands, readings }: Props) {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [confirmCmd, setConfirmCmd] = useState<CommandTemplate | null>(null)

  const visibleCommands = user?.role
    ? commands.filter((cmd) => meetsMinRole(user.role, cmd.minRole))
    : []

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
    mutationFn: (cmdId: string) => devicesApi.issueCommand(device.id, cmdId),
    onSuccess: () => {
      toast.success("Command issued successfully")
      queryClient.invalidateQueries({ queryKey: ["commands", device.id] })
    },
    onError: () => toast.error("Failed to issue command"),
  })

  const handleCommand = (cmd: CommandTemplate) => {
    if (cmd.confirmationRequired) {
      setConfirmCmd(cmd)
    } else {
      cmdMutation.mutate(cmd.id)
    }
  }

  const statusVariant =
    device.status === "ONLINE"
      ? "default"
      : device.status === "OFFLINE"
        ? "destructive"
        : "secondary"

  return (
    <>
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
              <Badge variant={statusVariant}>{device.status}</Badge>
              <Link
                to={`/devices/${device.id}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-4" />
              </Link>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4">
          {byZone.size === 0 ? (
            <p className="text-xs text-muted-foreground">
              No zone-assigned data points configured.
            </p>
          ) : (
            Array.from(byZone.entries()).map(([zoneName, dps]) => (
              <div key={zoneName} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {zoneName}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="flex flex-col gap-1.5">
                  {dps.map((dp) => (
                    <DataPointRow
                      key={dp.key}
                      dp={dp}
                      reading={readings.get(`${device.id}:${dp.key}`)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}

          {visibleCommands.length > 0 && (
            <div className="flex flex-col gap-2 border-t pt-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Commands
              </span>
              <div className="flex flex-wrap gap-2">
                {visibleCommands.map((cmd) => (
                  <Button
                    key={cmd.id}
                    size="sm"
                    variant="outline"
                    onClick={() => handleCommand(cmd)}
                    disabled={cmdMutation.isPending}
                  >
                    <Zap className="mr-1.5 size-3" />
                    {cmd.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmCmd} onOpenChange={(open) => !open && setConfirmCmd(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Command</AlertDialogTitle>
            <AlertDialogDescription>
              Send <strong>{confirmCmd?.name}</strong> to <strong>{device.name}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmCmd) cmdMutation.mutate(confirmCmd.id)
                setConfirmCmd(null)
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function formatValue(dp: DataPoint, reading: Reading): string {
  if (reading.value === null) return "—"
  const isBoolean =
    dp.dataType === "BOOLEAN" ||
    dp.displayWidget === "TOGGLE" ||
    dp.displayWidget === "BOOLEAN"
  if (isBoolean) {
    return reading.value ? (dp.trueLabel ?? "ON") : (dp.falseLabel ?? "OFF")
  }
  const n = reading.value
  return n % 1 === 0 ? n.toString() : n.toFixed(2)
}

function DataPointRow({
  dp,
  reading,
}: {
  dp: DataPoint
  reading: Reading | undefined
}) {
  const qualityColor = !reading
    ? "text-muted-foreground"
    : reading.quality === "GOOD"
      ? "text-green-500"
      : reading.quality === "SUSPECT"
        ? "text-yellow-500"
        : "text-red-500"

  const displayValue = reading ? formatValue(dp, reading) : "—"
  const unit = reading?.unit ?? dp.unit

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="mr-2 truncate text-muted-foreground">{dp.label}</span>
      <span className={`shrink-0 font-mono font-medium ${qualityColor}`}>
        {displayValue}
        {unit && displayValue !== "—" ? ` ${unit}` : ""}
      </span>
    </div>
  )
}
