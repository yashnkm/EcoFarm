import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react"

import { samplingGroupsApi } from "@/api/samplingGroups"
import { sitesApi } from "@/api/sites"
import { readingsApi } from "@/api/readings"
import { channelColor } from "./channelColors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel } from "@/components/ui/field"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, naturalCompare } from "@/lib/utils"
import type { Reading, SamplingChannel } from "@/types/api"

type View = "list" | "chart"
const PAGE_SIZE = 25

function channelKey(deviceId: string, dataPointKey: string) {
  return `${deviceId}:${dataPointKey}`
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Bucket keys are UTC, truncated to the second by mergeReadings (which also
// strips the trailing "Z") — appending it back before parsing is what makes
// this an actual UTC instant instead of being silently misread as
// already-local. Forced to Asia/Kolkata rather than the viewer's own device
// timezone: the farm's actual local time is what matters here, not
// whichever timezone happens to be set on whoever's looking at the screen.
function formatIst(bucketTime: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${bucketTime}Z`).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...opts })
}

interface MergedRow {
  time: string // ISO, truncated to the second
  values: Record<string, number | null>
}

// Channels from the same poll group are read together, so their timestamps
// line up at whole-second resolution in practice — truncating to the second
// is a pragmatic alignment key, not a guarantee of exact simultaneity.
function mergeReadings(channels: SamplingChannel[], data: Record<string, Reading[]>): MergedRow[] {
  const rows = new Map<string, MergedRow>()
  for (const ch of channels) {
    const key = channelKey(ch.deviceId, ch.dataPointKey)
    for (const r of data[key] ?? []) {
      const bucket = r.time.slice(0, 19)
      let row = rows.get(bucket)
      if (!row) {
        row = { time: bucket, values: {} }
        rows.set(bucket, row)
      }
      row.values[key] = r.value
    }
  }
  return [...rows.values()]
}

function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\r\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function OriginalDataTab() {
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["sampling-groups"],
    queryFn: samplingGroupsApi.list,
  })
  const { data: sites } = useQuery({ queryKey: ["sites"], queryFn: sitesApi.list })

  const [groupId, setGroupId] = useState("")
  const [siteId, setSiteId] = useState("all")
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [channelsOpen, setChannelsOpen] = useState(false)
  const [from, setFrom] = useState(() => toLocalInputValue(new Date(Date.now() - 24 * 3600 * 1000)))
  const [to, setTo] = useState(() => toLocalInputValue(new Date()))
  const [view, setView] = useState<View>("chart")
  const [page, setPage] = useState(0)

  const [readingsData, setReadingsData] = useState<Record<string, Reading[]> | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const group = groups?.find((g) => g.id === groupId)
  const availableChannels = useMemo(
    () => (group
      ? group.channels
          .filter((c) => siteId === "all" || c.siteId === siteId)
          .sort((a, b) => naturalCompare(a.deviceName, b.deviceName) || naturalCompare(a.label, b.label))
      : []),
    [group, siteId]
  )

  // Picking a group (or narrowing by site) selects all of its channels by
  // default — matches the reference behaviour ("12 Selected" out of the box)
  // and avoids landing on an empty chart the admin then has to populate by hand.
  useEffect(() => {
    setSelectedKeys(new Set(availableChannels.map((c) => channelKey(c.deviceId, c.dataPointKey))))
  }, [availableChannels])

  useEffect(() => {
    if (!groupId && groups?.length) setGroupId(groups[0].id)
  }, [groups, groupId])

  const toggleChannel = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectedChannels = availableChannels.filter((c) => selectedKeys.has(channelKey(c.deviceId, c.dataPointKey)))

  const handleSearch = async () => {
    if (!selectedChannels.length) {
      setSearchError("Select at least one channel")
      return
    }
    setSearching(true)
    setSearchError(null)
    setPage(0)
    try {
      const fromIso = new Date(from).toISOString()
      const toIso = new Date(to).toISOString()
      const results = await Promise.all(
        selectedChannels.map((c) =>
          readingsApi.range({ deviceId: c.deviceId, dataPoint: c.dataPointKey, from: fromIso, to: toIso })
        )
      )
      const data: Record<string, Reading[]> = {}
      selectedChannels.forEach((c, i) => {
        data[channelKey(c.deviceId, c.dataPointKey)] = results[i]
      })
      setReadingsData(data)
    } catch {
      setSearchError("Failed to load readings")
    } finally {
      setSearching(false)
    }
  }

  const mergedRows = useMemo(
    () => (readingsData ? mergeReadings(selectedChannels, readingsData) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [readingsData]
  )
  const listRows = [...mergedRows].sort((a, b) => b.time.localeCompare(a.time))
  const chartRows = [...mergedRows].sort((a, b) => a.time.localeCompare(b.time))

  const totalPages = Math.max(1, Math.ceil(listRows.length / PAGE_SIZE))
  const pageItems = listRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleExport = () => {
    if (!mergedRows.length) return
    const header = ["Time", ...selectedChannels.map((c) => `${c.label} (${c.unit ?? ""})`.trim())]
    const rows = listRows.map((row) => [
      formatIst(row.time, { dateStyle: "medium", timeStyle: "medium" }),
      ...selectedChannels.map((c) => row.values[channelKey(c.deviceId, c.dataPointKey)] ?? ""),
    ])
    downloadCsv(`${group?.name ?? "data-log"}.csv`, header, rows)
  }

  if (groupsLoading) return <Skeleton className="h-64 w-full" />

  if (!groups?.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No Sampling Groups yet. Create one under the "Data Sampling" tab to start viewing readings here.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <Field className="w-48">
          <FieldLabel>Data Sampling</FieldLabel>
          <Select value={groupId} onValueChange={(v) => v && setGroupId(v)}>
            <SelectTrigger><SelectValue placeholder="Select group">
              {() => group?.name ?? "Select group"}
            </SelectValue></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field className="w-40">
          <FieldLabel>Site</FieldLabel>
          <Select value={siteId} onValueChange={(v) => v && setSiteId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="All sites">
                {(value: string | null) => value === "all" || !value ? "All sites" : sites?.find((s) => s.id === value)?.name ?? value}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All sites</SelectItem>
                {[...(sites ?? [])].sort((a, b) => naturalCompare(a.name, b.name)).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field className="w-56 shrink-0">
          <FieldLabel>Channel</FieldLabel>
          <details open={channelsOpen} onToggle={(e) => setChannelsOpen(e.currentTarget.open)} className="relative">
            <summary className="flex h-9 cursor-pointer list-none items-center justify-between rounded-md border bg-background px-3 text-sm shadow-xs">
              <span>{selectedKeys.size} Selected</span>
            </summary>
            <div className="themed-scrollbar absolute z-20 mt-1 max-h-64 w-64 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
              <div className="flex gap-1 border-b p-1">
                <button
                  type="button"
                  className="flex-1 rounded px-2 py-1 text-left text-xs hover:bg-accent"
                  onClick={() => setSelectedKeys(new Set(availableChannels.map((c) => channelKey(c.deviceId, c.dataPointKey))))}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="flex-1 rounded px-2 py-1 text-left text-xs hover:bg-accent"
                  onClick={() => setSelectedKeys(new Set())}
                >
                  Deselect All
                </button>
              </div>
              {availableChannels.map((c, i) => {
                const key = channelKey(c.deviceId, c.dataPointKey)
                return (
                  <label key={key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(key)}
                      onChange={() => toggleChannel(key)}
                      className="size-4 rounded border-input"
                    />
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: channelColor(i) }} />
                    <span className="truncate">{c.deviceName} · {c.label}</span>
                  </label>
                )
              })}
            </div>
          </details>
        </Field>

        <Field className="w-44">
          <FieldLabel>Start</FieldLabel>
          <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field className="w-44">
          <FieldLabel>End</FieldLabel>
          <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>

        <Button onClick={handleSearch} disabled={searching}>
          <Search data-icon="inline-start" />
          {searching ? "Loading…" : "Search"}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg border p-1">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView("chart")}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === "chart" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Chart
            </button>
          </div>
          <Button variant="outline" size="icon" onClick={handleExport} disabled={!mergedRows.length} title="Export CSV">
            <Download />
          </Button>
        </div>
      </div>

      {searchError && <p className="text-sm text-destructive">{searchError}</p>}

      {!readingsData ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Pick channels and a time range, then Search.
        </p>
      ) : !mergedRows.length ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No readings in this range for the selected channels.
        </p>
      ) : view === "chart" ? (
        <div className="h-[420px] rounded-lg border p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="time"
                tickFormatter={(t: string) => formatIst(t, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                className="text-xs fill-muted-foreground"
                minTickGap={40}
              />
              <YAxis className="text-xs fill-muted-foreground" />
              <Tooltip
                labelFormatter={(t) => formatIst(String(t), { dateStyle: "medium", timeStyle: "medium" })}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
              />
              <Legend />
              {selectedChannels.map((c, i) => (
                <Line
                  key={channelKey(c.deviceId, c.dataPointKey)}
                  type="monotone"
                  dataKey={(row: MergedRow) => row.values[channelKey(c.deviceId, c.dataPointKey)] ?? null}
                  name={`${c.deviceName} · ${c.label}`}
                  stroke={channelColor(i)}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  {selectedChannels.map((c, i) => (
                    <TableHead key={channelKey(c.deviceId, c.dataPointKey)}>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ backgroundColor: channelColor(i) }} />
                        {c.label}{c.unit ? ` (${c.unit})` : ""}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((row) => (
                  <TableRow key={row.time}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatIst(row.time, { dateStyle: "medium", timeStyle: "medium" })}
                    </TableCell>
                    {selectedChannels.map((c) => (
                      <TableCell key={channelKey(c.deviceId, c.dataPointKey)} className="tabular-nums">
                        {row.values[channelKey(c.deviceId, c.dataPointKey)] ?? "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
