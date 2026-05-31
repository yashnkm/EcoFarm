import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow, format } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Wifi,
  WifiOff,
  ShieldCheck,
  Radio,
  ServerCrash,
  ScrollText,
} from "lucide-react"

import { adminLogsApi } from "@/api/adminLogs"
import { healthApi } from "@/api/health"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { SystemEventEntry, CommLogEntry, AuditLogEntry } from "@/api/adminLogs"

const PAGE_SIZE = 50

export function OpsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Ops Console</h1>
        <p className="text-sm text-muted-foreground">
          System health, communication logs, and audit trail
        </p>
      </div>

      <Tabs defaultValue="health">
        <TabsList>
          <TabsTrigger value="health">
            <Wifi className="mr-1.5 size-3.5" />
            Health
          </TabsTrigger>
          <TabsTrigger value="events">
            <ServerCrash className="mr-1.5 size-3.5" />
            System Events
          </TabsTrigger>
          <TabsTrigger value="comms">
            <Radio className="mr-1.5 size-3.5" />
            Comms Logs
          </TabsTrigger>
          <TabsTrigger value="audit">
            <ShieldCheck className="mr-1.5 size-3.5" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="mt-4">
          <HealthTab />
        </TabsContent>
        <TabsContent value="events" className="mt-4">
          <LogTab<SystemEventEntry>
            queryKey="ops-events"
            fetcher={adminLogsApi.events}
            emptyText="No system events recorded yet."
            columns={["Time", "Tenant", "Severity", "Event Type", "Message", "Gateway", "Device"]}
            renderRow={(e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {format(new Date(e.createdAt), "MMM d, HH:mm:ss")}
                </TableCell>
                <TableCell className="text-xs">{e.tenantName ?? "—"}</TableCell>
                <TableCell><SeverityBadge severity={e.severity} /></TableCell>
                <TableCell className="font-mono text-xs">{e.eventType}</TableCell>
                <TableCell className="max-w-xs truncate text-xs">{e.message}</TableCell>
                <TableCell className="font-mono text-xs">{e.gatewaySerial ?? "—"}</TableCell>
                <TableCell className="text-xs">{e.deviceName ?? "—"}</TableCell>
              </TableRow>
            )}
          />
        </TabsContent>
        <TabsContent value="comms" className="mt-4">
          <LogTab<CommLogEntry>
            queryKey="ops-comms"
            fetcher={adminLogsApi.comms}
            emptyText="No communication logs recorded yet."
            columns={["Time", "Tenant", "Gateway", "Device", "Dir", "FC", "Reg", "Value", "Status", "Error"]}
            renderRow={(e) => (
              <TableRow key={e.id} className={e.status === "ERROR" ? "bg-destructive/5" : undefined}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {format(new Date(e.createdAt), "MMM d, HH:mm:ss")}
                </TableCell>
                <TableCell className="text-xs">{e.tenantName ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{e.gatewaySerial ?? "—"}</TableCell>
                <TableCell className="text-xs">{e.deviceName ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={e.direction === "REQUEST" ? "outline" : "secondary"} className="text-xs">
                    {e.direction === "REQUEST" ? "REQ" : "RESP"}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{e.modbusFc ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{e.register ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{e.value ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={e.status === "OK" ? "default" : "destructive"} className="text-xs">
                    {e.status}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-xs text-destructive">
                  {e.errorMessage ?? ""}
                </TableCell>
              </TableRow>
            )}
          />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <LogTab<AuditLogEntry>
            queryKey="ops-audit"
            fetcher={adminLogsApi.audit}
            emptyText="No audit entries recorded yet."
            columns={["Time", "Tenant", "User", "Action", "Resource", "IP"]}
            renderRow={(e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {format(new Date(e.createdAt), "MMM d, HH:mm:ss")}
                </TableCell>
                <TableCell className="text-xs">{e.tenantName ?? "—"}</TableCell>
                <TableCell className="text-xs">{e.userEmail ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs font-medium">{e.action}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {e.resourceType ? `${e.resourceType}${e.resourceId ? ` · ${e.resourceId.slice(0, 8)}…` : ""}` : "—"}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{e.ipAddress ?? "—"}</TableCell>
              </TableRow>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Health tab ────────────────────────────────────────────────────────────────

function HealthTab() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["mqtt-health"],
    queryFn: healthApi.mqtt,
    refetchInterval: 15_000,
  })

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-sm font-medium">MQTT Brokers</CardTitle>
            <CardDescription className="mt-1 text-xs">
              Live connection status — auto-refreshes every 15 s
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw data-icon="inline-start" className={isFetching ? "animate-spin" : ""} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !data?.length ? (
            <p className="text-sm text-muted-foreground">No brokers configured.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.map((broker) => (
                <div
                  key={broker.brokerId}
                  className="flex items-start justify-between rounded-lg border px-4 py-3"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{broker.brokerName}</span>
                    <span className="font-mono text-xs text-muted-foreground">{broker.brokerUrl}</span>
                    <span className="text-xs text-muted-foreground">
                      {broker.connected && broker.lastConnectedAt
                        ? `Connected ${formatDistanceToNow(new Date(broker.lastConnectedAt), { addSuffix: true })}`
                        : broker.lastError
                          ? `Error: ${broker.lastError}`
                          : "Waiting for connection…"}
                    </span>
                    {broker.lastFailureAt && (
                      <span className="text-xs text-destructive">
                        Last failure {formatDistanceToNow(new Date(broker.lastFailureAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={broker.connected ? "default" : "destructive"}>
                      {broker.connected ? "Connected" : "Disconnected"}
                    </Badge>
                    {broker.connected
                      ? <Wifi className="size-4 text-muted-foreground" />
                      : <WifiOff className="size-4 text-muted-foreground" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ScrollText className="size-4" />
            Scheduled Jobs
          </CardTitle>
          <CardDescription className="text-xs">Background tasks running on the backend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 text-sm">
            {[
              { name: "Poll Scheduler", interval: "every 5 s", desc: "Sends Modbus read requests to all active devices via MQTT" },
              { name: "Command Dispatcher", interval: "every 2 s", desc: "Picks up PENDING commands and dispatches them over MQTT" },
              { name: "Status Monitor", interval: "every 15 s", desc: "Marks gateways/devices OFFLINE when stale (>30 s / >45 s)" },
            ].map((job) => (
              <div key={job.name} className="flex items-start justify-between rounded-lg border px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{job.name}</span>
                  <span className="text-xs text-muted-foreground">{job.desc}</span>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">{job.interval}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Generic paginated log tab ─────────────────────────────────────────────────

interface LogTabProps<T> {
  queryKey: string
  fetcher: (page: number, size: number) => Promise<import("@/api/adminLogs").PageResponse<T>>
  emptyText: string
  columns: string[]
  renderRow: (item: T) => React.ReactNode
}

function LogTab<T>({ queryKey, fetcher, emptyText, columns, renderRow }: LogTabProps<T>) {
  const [page, setPage] = useState(0)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [queryKey, page],
    queryFn: () => fetcher(page, PAGE_SIZE),
    refetchInterval: 30_000,
  })

  const totalPages = data?.totalPages ?? 1

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-sm font-medium">
            {data ? `${data.totalElements.toLocaleString()} entries` : "Loading…"}
          </CardTitle>
          <CardDescription className="text-xs">Auto-refreshes every 30 s</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw data-icon="inline-start" className={isFetching ? "animate-spin" : ""} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !data?.content.length ? (
          <p className="p-6 text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col} className="whitespace-nowrap text-xs">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.content.map((item) => renderRow(item))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: SystemEventEntry["severity"] }) {
  const variant =
    severity === "CRITICAL" ? "destructive" :
    severity === "ERROR"    ? "destructive" :
    severity === "WARNING"  ? "secondary"   : "outline"

  return <Badge variant={variant} className="text-xs">{severity}</Badge>
}
