import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Activity, History, ChevronLeft, ChevronRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

import { devicesApi } from "@/api/devices"
import { commandTemplatesApi, dataPointsApi } from "@/api/deviceProfiles"
import { sitesApi } from "@/api/sites"
import { useAuthStore } from "@/store/authStore"
import { useLiveReadings } from "@/hooks/useLiveReadings"
import { meetsMinRole } from "@/lib/roles"
import { cn, naturalCompare } from "@/lib/utils"
import { useSortFilter } from "@/lib/tableSortFilter"
import { CommandButton } from "@/components/CommandButton"
import { SortableHead } from "@/components/SortableHead"
import { TableFilterInput } from "@/components/TableFilterInput"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
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
import type { CommandStatus, CommandTemplate, DataPoint, Zone } from "@/types/api"

export function DeviceDetailPage() {
  const { id = "" } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [historyPage, setHistoryPage] = useState(0)
  const HISTORY_PAGE_SIZE = 15

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
    mutationFn: ({ commandTemplateId, value }: { commandTemplateId: string; value?: number }) =>
      devicesApi.issueCommand(id, commandTemplateId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command-history", id] })
      toast.success("Command sent — awaiting acknowledgement")
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "Failed to issue command")
    },
  })

  const groupsMutation = useMutation({
    mutationFn: (groups: Record<string, string>) => devicesApi.updateDataPointGroups(id, groups),
    onSuccess: (updated) => {
      queryClient.setQueryData(["device", id], updated)
      queryClient.invalidateQueries({ queryKey: ["devices"] })
    },
    onError: () => toast.error("Failed to update zone assignment"),
  })

  const commandGroupsMutation = useMutation({
    mutationFn: (groups: Record<string, string>) => devicesApi.updateCommandGroups(id, groups),
    onSuccess: (updated) => {
      queryClient.setQueryData(["device", id], updated)
      queryClient.invalidateQueries({ queryKey: ["devices"] })
    },
    onError: () => toast.error("Failed to update zone assignment"),
  })

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

  const handleCommandZoneChange = (commandId: string, zoneName: string) => {
    if (!device) return
    const current = { ...(device.commandGroups ?? {}) }
    if (zoneName) {
      current[commandId] = zoneName
    } else {
      delete current[commandId]
    }
    commandGroupsMutation.mutate(current)
  }

  const visibleCommands = user?.role
    ? (commands ?? []).filter((cmd) => meetsMinRole(user.role, cmd.minRole))
    : []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/devices" />}>
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
            Live readings pushed via WebSocket · set up a Sampling Group in Data Log to save history
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
              zones={zones}
              dataPointGroups={device?.dataPointGroups ?? {}}
              canAssignZone={canAssignZone}
              onZoneChange={handleZoneChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Commands */}
      {visibleCommands.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Commands</CardTitle>
            <CardDescription>Write operations available for this device profile — assign each to a zone so it shows up in the right section on the live view.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <CommandTable
              commands={visibleCommands}
              liveReadings={liveReadings}
              issuePending={issueMutation.isPending}
              onIssue={(commandTemplateId, value) => issueMutation.mutate({ commandTemplateId, value })}
              zones={zones}
              commandGroups={device?.commandGroups ?? {}}
              canAssignZone={canAssignZone}
              onZoneChange={handleCommandZoneChange}
            />
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
    </div>
  )
}

interface DataPointTableProps {
  dataPoints: DataPoint[]
  liveReadings: Map<string, { value: number | null; unit: string | null; quality: string; time: string }>
  zones: Zone[]
  dataPointGroups: Record<string, string>
  canAssignZone: boolean
  onZoneChange: (dpKey: string, zoneName: string) => void
}

function DataPointTable({
  dataPoints, liveReadings,
  zones, dataPointGroups, canAssignZone, onZoneChange,
}: DataPointTableProps) {
  const { filter, setFilter, sort, toggleSort, result: filteredPoints } = useSortFilter(
    dataPoints,
    (dp, q) => dp.label.toLowerCase().includes(q) || dp.key.toLowerCase().includes(q),
    {
      label: (a, b) => naturalCompare(a.label, b.label),
      key: (a, b) => naturalCompare(a.key, b.key),
      value: (a, b) => (liveReadings.get(a.key)?.value ?? -Infinity) - (liveReadings.get(b.key)?.value ?? -Infinity),
      unit: (a, b) => naturalCompare(a.unit ?? liveReadings.get(a.key)?.unit ?? "", b.unit ?? liveReadings.get(b.key)?.unit ?? ""),
      status: (a, b) =>
        Number(liveReadings.get(a.key)?.quality === "GOOD") - Number(liveReadings.get(b.key)?.quality === "GOOD"),
      zone: (a, b) => naturalCompare(dataPointGroups[a.key] ?? "", dataPointGroups[b.key] ?? ""),
    }
  )

  return (
    <div className="rounded-b-lg border-t">
      <div className="p-3">
        <TableFilterInput value={filter} onChange={setFilter} placeholder="Filter by label or key…" />
      </div>
      {!filteredPoints.length ? (
        <p className="px-6 pb-6 text-sm text-muted-foreground">No data points match "{filter}".</p>
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="Label" sortKey="label" sort={sort} onSort={toggleSort} className="pl-6" />
            <SortableHead label="Key" sortKey="key" sort={sort} onSort={toggleSort} />
            <SortableHead label="Value" sortKey="value" sort={sort} onSort={toggleSort} className="text-right" />
            <SortableHead label="Unit" sortKey="unit" sort={sort} onSort={toggleSort} />
            <SortableHead label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
            <SortableHead label="Zone" sortKey="zone" sort={sort} onSort={toggleSort} className="pr-6" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPoints.map((dp) => {
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
                  {(() => {
                    const online = !!r && r.quality === "GOOD"
                    const detail = r
                      ? `Quality: ${r.quality} · Last seen ${formatDistanceToNow(new Date(r.time), { addSuffix: true })}`
                      : "No data received yet"
                    return (
                      <span className="inline-flex items-center gap-1.5" title={detail}>
                        <span className={cn("size-2 rounded-full", online ? "bg-emerald-400" : "bg-destructive")} />
                        <span className="text-xs text-muted-foreground">{online ? "Online" : "Offline"}</span>
                      </span>
                    )
                  })()}
                </TableCell>
                <TableCell className="pr-6">
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
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      )}
    </div>
  )
}

interface CommandTableProps {
  commands: CommandTemplate[]
  liveReadings: Map<string, { value: number | null; unit: string | null; quality: string; time: string }>
  issuePending: boolean
  onIssue: (commandTemplateId: string, value?: number) => void
  zones: Zone[]
  commandGroups: Record<string, string>
  canAssignZone: boolean
  onZoneChange: (commandId: string, zoneName: string) => void
}

function CommandTable({
  commands, liveReadings, issuePending, onIssue,
  zones, commandGroups, canAssignZone, onZoneChange,
}: CommandTableProps) {
  const { filter, setFilter, sort, toggleSort, result: filteredCommands } = useSortFilter(
    commands,
    (cmd, q) => cmd.name.toLowerCase().includes(q) || (cmd.description ?? "").toLowerCase().includes(q),
    {
      name: (a, b) => naturalCompare(a.name, b.name),
      description: (a, b) => naturalCompare(a.description ?? "", b.description ?? ""),
      registerNumber: (a, b) => a.registerNumber - b.registerNumber,
      zone: (a, b) => naturalCompare(commandGroups[a.id] ?? "", commandGroups[b.id] ?? ""),
    }
  )

  return (
    <div className="rounded-b-lg border-t">
      <div className="p-3">
        <TableFilterInput value={filter} onChange={setFilter} placeholder="Filter by name or description…" />
      </div>
      {!filteredCommands.length ? (
        <p className="px-6 pb-6 text-sm text-muted-foreground">No commands match "{filter}".</p>
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="Label" sortKey="name" sort={sort} onSort={toggleSort} className="pl-6" />
            <SortableHead label="Description" sortKey="description" sort={sort} onSort={toggleSort} />
            <SortableHead label="Register" sortKey="registerNumber" sort={sort} onSort={toggleSort} />
            <TableHead>Value</TableHead>
            <SortableHead label="Zone" sortKey="zone" sort={sort} onSort={toggleSort} />
            <TableHead className="pr-6">Command</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCommands.map((cmd) => (
            <TableRow key={cmd.id}>
              <TableCell className="pl-6 font-medium">{cmd.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{cmd.description ?? "—"}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{cmd.registerNumber}</TableCell>
              <TableCell className="font-mono text-xs">
                {cmd.promptForValue ? (
                  <Badge variant="outline" className="text-xs">entered on send</Badge>
                ) : cmd.offValue != null ? (
                  `${cmd.value} / ${cmd.offValue}`
                ) : (
                  cmd.value
                )}
              </TableCell>
              <TableCell>
                {zones.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No zones</span>
                ) : (
                  <Select
                    value={commandGroups[cmd.id] ?? ""}
                    onValueChange={(v) => onZoneChange(cmd.id, v ?? "")}
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
              <TableCell className="pr-6">
                <CommandButton
                  command={cmd}
                  disabled={issuePending}
                  onIssue={onIssue}
                  statusValue={cmd.statusDataPointKey ? liveReadings.get(cmd.statusDataPointKey)?.value : undefined}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
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
