import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Activity, Play, History, ChevronLeft, ChevronRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

import { devicesApi } from "@/api/devices"
import { commandTemplatesApi, dataPointsApi } from "@/api/deviceProfiles"
import { sitesApi } from "@/api/sites"
import { useAuthStore } from "@/store/authStore"
import { useLiveReadings } from "@/hooks/useLiveReadings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import type { CommandTemplate, CommandStatus, DataPoint, Zone } from "@/types/api"

export function DeviceDetailPage() {
  const { id = "" } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [confirmCommand, setConfirmCommand] = useState<CommandTemplate | null>(null)
  const [historyPage, setHistoryPage] = useState(0)
  const HISTORY_PAGE_SIZE = 15

  const canRecord = user?.role === "SUPER_ADMIN" || user?.role === "TENANT_ADMIN"
  const canAssignZone = user?.role === "SUPER_ADMIN" || user?.role === "TENANT_ADMIN"

  const { data: device } = useQuery({
    queryKey: ["device", id],
    queryFn: () => devicesApi.get(id),
    enabled: !!id,
  })

  const { data: dataPoints } = useQuery({
    queryKey: ["data-points", device?.profileId],
    queryFn: () => dataPointsApi.list(device!.profileId),
    enabled: !!device?.profileId,
  })

  const { data: commands } = useQuery({
    queryKey: ["commands", device?.profileId],
    queryFn: () => commandTemplatesApi.list(device!.profileId),
    enabled: !!device?.profileId,
  })

  const { data: history } = useQuery({
    queryKey: ["command-history", id],
    queryFn: () => devicesApi.listCommands(id),
    enabled: !!id,
    refetchInterval: 3000,
  })

  const { data: zones = [] } = useQuery({
    queryKey: ["zones-all"],
    queryFn: () => sitesApi.listAllZones(),
    staleTime: 60_000,
  })

  const liveReadings = useLiveReadings(id)

  const issueMutation = useMutation({
    mutationFn: (commandTemplateId: string) => devicesApi.issueCommand(id, commandTemplateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command-history", id] })
      toast.success("Command sent — awaiting acknowledgement")
      setConfirmCommand(null)
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "Failed to issue command")
    },
  })

  const recordMutation = useMutation({
    mutationFn: (dataPoints: string[]) => devicesApi.updateRecordedDataPoints(id, dataPoints),
    onSuccess: (updated) => {
      queryClient.setQueryData(["device", id], updated)
    },
    onError: () => toast.error("Failed to update recording settings"),
  })

  const groupsMutation = useMutation({
    mutationFn: (groups: Record<string, string>) => devicesApi.updateDataPointGroups(id, groups),
    onSuccess: (updated) => {
      queryClient.setQueryData(["device", id], updated)
    },
    onError: () => toast.error("Failed to update zone assignment"),
  })

  const handleRecordToggle = (key: string, checked: boolean) => {
    if (!device) return
    const current = new Set(device.recordedDataPoints ?? [])
    if (checked) current.add(key)
    else current.delete(key)
    recordMutation.mutate([...current])
  }

  const handleZoneChange = (dpKey: string, zoneName: string) => {
    if (!device) return
    const current = { ...(device.dataPointGroups ?? {}) }
    if (zoneName) {
      current[dpKey] = zoneName
    } else {
      delete current[dpKey]
    }
    groupsMutation.mutate(current)
  }

  const handleClick = (cmd: CommandTemplate) => {
    if (cmd.confirmationRequired) {
      setConfirmCommand(cmd)
    } else {
      issueMutation.mutate(cmd.id)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link to="/devices" />}>
          <ArrowLeft data-icon="inline-start" />
          Back to devices
        </Button>

        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{device?.name ?? "Loading…"}</h1>
            <p className="text-sm text-muted-foreground">
              {device?.profileName} &middot; Slave ID {device?.slaveId}
            </p>
          </div>
          {device && (
            <Badge variant={
              device.status === "ONLINE" ? "default" :
              device.status === "ERROR" ? "destructive" : "secondary"
            }>{device.status}</Badge>
          )}
        </div>
      </div>

      {/* Live readings */}
      <Card>
        <CardHeader>
          <CardTitle>Data points</CardTitle>
          <CardDescription>
            Live readings pushed via WebSocket · record to save history
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!dataPoints ? (
            <div className="divide-y">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : !dataPoints.length ? (
            <div className="px-6 pb-6">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Activity /></EmptyMedia>
                  <EmptyTitle>No data points configured</EmptyTitle>
                  <EmptyDescription>
                    Add data points to this device's profile to start seeing readings.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <DataPointTable
              dataPoints={dataPoints}
              liveReadings={liveReadings}
              recordedKeys={new Set(device?.recordedDataPoints ?? [])}
              canRecord={canRecord}
              onRecordToggle={handleRecordToggle}
              zones={zones}
              dataPointGroups={device?.dataPointGroups ?? {}}
              canAssignZone={canAssignZone}
              onZoneChange={handleZoneChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Commands */}
      {commands && commands.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Commands</CardTitle>
            <CardDescription>Write operations available for this device profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {commands.map((cmd) => (
                <Button
                  key={cmd.id}
                  variant="outline"
                  onClick={() => handleClick(cmd)}
                  disabled={issueMutation.isPending}
                >
                  <Play data-icon="inline-start" />
                  {cmd.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Command history */}
      {history && history.length > 0 && (() => {
        const totalPages = Math.ceil(history.length / HISTORY_PAGE_SIZE)
        const page = Math.min(historyPage, totalPages - 1)
        const pageItems = history.slice(page * HISTORY_PAGE_SIZE, (page + 1) * HISTORY_PAGE_SIZE)
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="size-4" />
                    Command history
                  </CardTitle>
                  <CardDescription>Commands sent to this device · {history.length} total</CardDescription>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {page + 1} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page === totalPages - 1}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issued</TableHead>
                      <TableHead>Register</TableHead>
                      <TableHead>FC</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{c.registerNumber}</TableCell>
                        <TableCell>{c.functionCode}</TableCell>
                        <TableCell>{c.value}</TableCell>
                        <TableCell><CommandStatusBadge status={c.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.result ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmCommand} onOpenChange={(o) => !o && setConfirmCommand(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue command: {confirmCommand?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmCommand?.description ?? `This will write ${confirmCommand?.value} to register ${confirmCommand?.registerNumber} (FC ${confirmCommand?.functionCode}).`}
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
    </div>
  )
}

interface DataPointTableProps {
  dataPoints: DataPoint[]
  liveReadings: Map<string, { value: number | null; unit: string | null; quality: string; time: string }>
  recordedKeys: Set<string>
  canRecord: boolean
  onRecordToggle: (key: string, checked: boolean) => void
  zones: Zone[]
  dataPointGroups: Record<string, string>
  canAssignZone: boolean
  onZoneChange: (dpKey: string, zoneName: string) => void
}

function DataPointTable({
  dataPoints, liveReadings, recordedKeys, canRecord, onRecordToggle,
  zones, dataPointGroups, canAssignZone, onZoneChange,
}: DataPointTableProps) {
  return (
    <div className="rounded-b-lg border-t">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Label</TableHead>
            <TableHead>Key</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Quality</TableHead>
            <TableHead>Last seen</TableHead>
            <TableHead>Zone</TableHead>
            <TableHead className="pr-6 text-center" title={canRecord ? "Record to database" : "Only admins can enable recording"}>
              Record
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataPoints.map((dp) => {
            const r = liveReadings.get(dp.key)
            return (
              <TableRow key={dp.id}>
                <TableCell className="pl-6 font-medium">{dp.label}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{dp.key}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {r?.value != null ? r.value.toFixed(2) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {dp.unit ?? r?.unit ?? "—"}
                </TableCell>
                <TableCell>
                  {r ? (
                    r.quality !== "GOOD" ? (
                      <Badge variant="secondary" className="text-xs">{r.quality}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Good</span>
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r ? formatDistanceToNow(new Date(r.time), { addSuffix: true }) : "No data"}
                </TableCell>
                <TableCell>
                  {zones.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No zones</span>
                  ) : (
                    <Select
                      value={dataPointGroups[dp.key] ?? ""}
                      onValueChange={(v) => onZoneChange(dp.key, v ?? "")}
                      disabled={!canAssignZone}
                    >
                      <SelectTrigger size="sm" className="w-32">
                        <SelectValue placeholder="No zone">
                          {(value: string | null) => value ? zones.find((z) => z.name === value)?.name ?? value : "No zone"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No zone</SelectItem>
                        {zones.map((z) => (
                          <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className="pr-6 text-center">
                  <input
                    type="checkbox"
                    checked={recordedKeys.has(dp.key)}
                    disabled={!canRecord}
                    onChange={(e) => onRecordToggle(dp.key, e.target.checked)}
                    className={`h-4 w-4 rounded border-input ${canRecord ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                    title={canRecord ? "Toggle database recording" : "Requires admin role"}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function CommandStatusBadge({ status }: { status: CommandStatus }) {
  const variant =
    status === "ACKNOWLEDGED" ? "default" :
    status === "FAILED" ? "destructive" :
    status === "SENT" ? "secondary" : "outline"
  return <Badge variant={variant} className="text-xs">{status}</Badge>
}
