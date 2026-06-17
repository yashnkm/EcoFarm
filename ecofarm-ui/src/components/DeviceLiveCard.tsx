import { useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { ExternalLink, Play } from "lucide-react"
import { toast } from "sonner"

import { devicesApi } from "@/api/devices"
import type { CommandTemplate, DataPoint, Device, Role } from "@/types/api"
import type { LiveReading } from "@/hooks/useLiveReadings"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Spinner } from "@/components/ui/spinner"

interface Props {
  device: Device
  dataPoints: DataPoint[]
  commandTemplates: CommandTemplate[]
  liveReadings: Map<string, LiveReading>
  userRole: Role | undefined
}

export function DeviceLiveCard({ device, dataPoints, commandTemplates, liveReadings, userRole }: Props) {
  const queryClient = useQueryClient()
  const [confirmCommand, setConfirmCommand] = useState<CommandTemplate | null>(null)

  const groups = device.dataPointGroups ?? {}
  // Only show data points that are both displayed and have a zone assigned
  const displayed = dataPoints.filter((dp) => dp.displayed && !!groups[dp.key])
  const groupMap = new Map<string, typeof displayed>()
  for (const dp of displayed) {
    const zone = groups[dp.key]
    if (!groupMap.has(zone)) groupMap.set(zone, [])
    groupMap.get(zone)!.push(dp)
  }
  const canIssueCommand = userRole === "SUPER_ADMIN" || userRole === "TENANT_ADMIN" || userRole === "OPERATOR"

  const issueMutation = useMutation({
    mutationFn: (commandTemplateId: string) => devicesApi.issueCommand(device.id, commandTemplateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command-history", device.id] })
      toast.success(`Command sent to ${device.name}`)
      setConfirmCommand(null)
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "Failed to issue command")
    },
  })

  const handleCommandClick = (cmd: CommandTemplate) => {
    if (cmd.confirmationRequired) {
      setConfirmCommand(cmd)
    } else {
      issueMutation.mutate(cmd.id)
    }
  }

  const statusVariant =
    device.status === "ONLINE" ? "default" :
    device.status === "ERROR" ? "destructive" : "secondary"

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
          <div className="min-w-0 flex flex-col gap-0.5">
            <CardTitle className="truncate text-base">{device.name}</CardTitle>
            <span className="truncate text-xs text-muted-foreground">{device.profileName}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={statusVariant} className="text-xs">{device.status}</Badge>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              render={<Link to={`/devices/${device.id}`} />}
              title="Open device detail"
            >
              <ExternalLink className="size-3.5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-3">
          {displayed.length > 0 ? (
            <div className="flex flex-col gap-2 text-sm">
              {[...groupMap.entries()].map(([zone, dps]) => (
                <div key={zone}>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{zone}</p>
                  <div className="divide-y rounded-md border">
                    {dps.map((dp) => {
                      const r = liveReadings.get(`${device.id}:${dp.key}`)
                      return (
                        <div key={dp.id} className="flex items-center justify-between gap-2 px-3 py-2">
                          <span className="truncate text-muted-foreground">{dp.label}</span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="tabular-nums font-semibold">
                              {r?.value != null
                                ? r.value.toFixed(2)
                                : <span className="font-normal text-muted-foreground">—</span>}
                            </span>
                            {(dp.unit ?? r?.unit) && (
                              <span className="text-xs text-muted-foreground">{dp.unit ?? r?.unit}</span>
                            )}
                            {r && r.quality !== "GOOD" && (
                              <Badge variant="secondary" className="px-1 py-0 text-xs">{r.quality}</Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No zone-assigned data points.</p>
          )}

          {device.lastReadingAt && (
            <p className="text-xs text-muted-foreground">
              Last reading {formatDistanceToNow(new Date(device.lastReadingAt), { addSuffix: true })}
            </p>
          )}

          {canIssueCommand && commandTemplates.length > 0 && (
            <div className="mt-auto flex flex-wrap gap-1.5 border-t pt-3">
              {commandTemplates.map((cmd) => (
                <Button
                  key={cmd.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleCommandClick(cmd)}
                  disabled={issueMutation.isPending}
                  title={cmd.description ?? cmd.name}
                >
                  <Play data-icon="inline-start" className="size-3" />
                  {cmd.name}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmCommand} onOpenChange={(o) => !o && setConfirmCommand(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue command: {confirmCommand?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmCommand?.description ??
                `This will write ${confirmCommand?.value} to register ${confirmCommand?.registerNumber} (FC ${confirmCommand?.functionCode}).`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmCommand && issueMutation.mutate(confirmCommand.id)}
              disabled={issueMutation.isPending}
            >
              {issueMutation.isPending && <Spinner data-icon="inline-start" />}
              Send command
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
