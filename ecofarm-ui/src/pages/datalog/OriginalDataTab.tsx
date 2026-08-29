import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react"
import { toast } from "sonner"

import { samplingGroupsApi } from "@/api/samplingGroups"
import { sitesApi } from "@/api/sites"
import { readingsApi } from "@/api/readings"
import { channelColor } from "./channelColors"
import {
  formatIst,
  mergeReadings,
  getPresetRange,
  type NormalizedPoint,
  type TimePreset,
} from "./chartHelpers"
import { DataLogChart } from "./DataLogChart"
import { StatsSummary } from "./StatsSummary"
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
import type { Reading, ReadingBucket, ReadingGranularity } from "@/types/api"

type View = "list" | "chart"
type Granularity = ReadingGranularity | "RAW"
const PAGE_SIZE = 25

const TIME_PRESETS: { value: TimePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom Range" },
]

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "RAW", label: "Raw" },
  { value: "HOUR", label: "Hourly Average" },
  { value: "DAY", label: "Daily Average" },
  { value: "WEEK", label: "Weekly Average" },
]
const GRANULARITY_LABELS: Record<Granularity, string> = Object.fromEntries(
  GRANULARITY_OPTIONS.map((o) => [o.value, o.label])
) as Record<Granularity, string>

// The backend caps raw-reading queries at 90 days (a deliberate limit —
// fetching years of point-by-point data isn't useful or fast); aggregate
// queries have no such cap, just a bucket-count sanity limit instead. Rather
// than let "All Time" (or any Custom Range past 90 days) hit that cap and
// surface as a bare "Range too large" error, pick a coarser resolution
// automatically whenever the current pick is Raw and won't fit — narrower
// ranges are left alone so they still default to Raw.
function autoResolveGranularity(fromIso: string, toIso: string, current: Granularity): Granularity {
  const hours = (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 3_600_000
  if (current !== "RAW" || hours <= 24 * 90) return current
  if (hours <= 5000) return "HOUR"
  if (hours / 24 <= 5000) return "DAY"
  return "WEEK"
}

function channelKey(deviceId: string, dataPointKey: string) {
  return `${deviceId}:${dataPointKey}`
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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
  const [preset, setPreset] = useState<TimePreset>("today")
  const [from, setFrom] = useState(() => toLocalInputValue(new Date(Date.now() - 24 * 3600 * 1000)))
  const [to, setTo] = useState(() => toLocalInputValue(new Date()))
  const [granularity, setGranularity] = useState<Granularity>("RAW")
  const [view, setView] = useState<View>("chart")
  const [page, setPage] = useState(0)

  const [readingsData, setReadingsData] = useState<Record<string, NormalizedPoint[]> | null>(null)
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

  // Runs the actual fetch for whatever from/to/granularity is currently
  // set — shared by the manual Search button and the time-range presets
  // (Today/7 Days/30 Days/All Time trigger this immediately on click;
  // Custom Range still requires Search, same as the existing date inputs
  // always have, since there's nothing sensible to fetch until the admin
  // picks their own dates).
  const runSearch = async (fromIso: string, toIso: string, res: Granularity) => {
    if (!selectedChannels.length) {
      setSearchError("Select at least one channel")
      return
    }
    setSearching(true)
    setSearchError(null)
    setPage(0)
    try {
      const data: Record<string, NormalizedPoint[]> = {}
      if (res === "RAW") {
        const results = await Promise.all(
          selectedChannels.map((c) => readingsApi.range({ deviceId: c.deviceId, dataPoint: c.dataPointKey, from: fromIso, to: toIso }))
        )
        selectedChannels.forEach((c, i) => {
          data[channelKey(c.deviceId, c.dataPointKey)] = (results[i] as Reading[]).map((r) => ({ time: r.time, value: r.value }))
        })
      } else {
        const results = await Promise.all(
          selectedChannels.map((c) =>
            readingsApi.aggregate({ deviceId: c.deviceId, dataPoint: c.dataPointKey, from: fromIso, to: toIso, granularity: res })
          )
        )
        selectedChannels.forEach((c, i) => {
          data[channelKey(c.deviceId, c.dataPointKey)] = (results[i] as ReadingBucket[]).map((b) => ({
            time: b.bucketStart,
            value: b.avgValue,
            min: b.minValue ?? undefined,
            max: b.maxValue ?? undefined,
          }))
        })
      }
      setReadingsData(data)
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSearchError((err as any)?.response?.data?.message ?? "Failed to load readings")
    } finally {
      setSearching(false)
    }
  }

  const runWithAutoGranularity = (fromIso: string, toIso: string) => {
    const resolved = autoResolveGranularity(fromIso, toIso, granularity)
    if (resolved !== granularity) {
      setGranularity(resolved)
      toast.info(`Raw data is limited to 90-day ranges — showing ${GRANULARITY_LABELS[resolved]} instead.`)
    }
    runSearch(fromIso, toIso, resolved)
  }

  const handleSearch = () => runWithAutoGranularity(new Date(from).toISOString(), new Date(to).toISOString())

  const handlePreset = (p: TimePreset) => {
    setPreset(p)
    if (p === "custom") return // just reveals the existing date inputs — Search still applies them
    const { from: presetFrom, to: presetTo } = getPresetRange(p)
    setFrom(toLocalInputValue(presetFrom))
    setTo(toLocalInputValue(presetTo))
    runWithAutoGranularity(presetFrom.toISOString(), presetTo.toISOString())
  }

  const handleGranularityChange = (g: Granularity) => {
    setGranularity(g)
    if (readingsData) runSearch(new Date(from).toISOString(), new Date(to).toISOString(), g)
  }

  // Land on today's data automatically instead of the "pick channels and a
  // time range" prompt — the group and its channels are already
  // auto-selected above, and "Today" is already the default preset, so
  // there's nothing left for the admin to actually pick on a normal visit.
  // Fires once, as soon as a group's channels are available; the ref guard
  // stops it from re-firing on every re-render once selectedChannels
  // (a freshly-filtered array each render) changes identity.
  const autoSearchedRef = useRef(false)
  useEffect(() => {
    if (autoSearchedRef.current || !selectedChannels.length) return
    autoSearchedRef.current = true
    handlePreset("today")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannels.length])

  const selectedKeysList = selectedChannels.map((c) => channelKey(c.deviceId, c.dataPointKey))
  const mergedRows = useMemo(
    () => (readingsData ? mergeReadings(selectedKeysList, readingsData) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [readingsData]
  )
  const listRows = [...mergedRows].sort((a, b) => b.time.localeCompare(a.time))

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
          <FieldLabel>Resolution</FieldLabel>
          <Select value={granularity} onValueChange={(v) => v && handleGranularityChange(v as Granularity)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {GRANULARITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

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

      {/* Time range presets — its own row so the control bar above doesn't
          get overcrowded on narrower screens. */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border p-1">
          {TIME_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePreset(p.value)}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                preset === p.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <>
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
          </>
        )}
      </div>

      {searchError && <p className="text-sm text-destructive">{searchError}</p>}
      {searching && <p className="text-sm text-muted-foreground">Loading readings…</p>}

      {!readingsData ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Pick channels and a time range, then Search.
        </p>
      ) : !mergedRows.length ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No readings in this range for the selected channels.
        </p>
      ) : view === "chart" ? (
        <div className="flex flex-col gap-3">
          <StatsSummary
            channels={selectedChannels}
            channelKeyOf={(c) => channelKey(c.deviceId, c.dataPointKey)}
            getValues={(key) => mergedRows.map((r) => r.values[key])}
          />

          <DataLogChart
            rows={mergedRows}
            channels={selectedChannels}
            channelKeyOf={(c) => channelKey(c.deviceId, c.dataPointKey)}
            granularity={granularity}
          />
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
