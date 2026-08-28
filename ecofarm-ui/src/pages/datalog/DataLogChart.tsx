import { useMemo, useState } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from "recharts"
import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { channelColor } from "./channelColors"
import { detectGaps, formatIst, type MergedRow } from "./chartHelpers"
import type { SamplingChannel } from "@/types/api"
import type { ReadingGranularity } from "@/types/api"

type ChartGranularity = ReadingGranularity | "RAW"
export type ChartType = "line" | "bar"

interface DataLogChartProps {
  rows: MergedRow[] // full range, already sorted ascending by time
  channels: SamplingChannel[]
  channelKeyOf: (c: SamplingChannel) => string
  chartType: ChartType
  granularity: ChartGranularity
}

const TICK_FORMATS: Record<ChartGranularity, Intl.DateTimeFormatOptions> = {
  RAW: { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" },
  HOUR: { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" },
  DAY: { day: "2-digit", month: "short" },
  WEEK: { day: "2-digit", month: "short" },
}
const LABEL_FORMATS: Record<ChartGranularity, Intl.DateTimeFormatOptions> = {
  RAW: { dateStyle: "medium", timeStyle: "medium" },
  HOUR: { dateStyle: "medium", timeStyle: "short" },
  DAY: { dateStyle: "medium" },
  WEEK: { dateStyle: "medium" },
}

/** Line/bar rendering for the Data Log chart — drag-to-zoom with a Reset
 * button, shaded gaps for real stretches of missing data, and a tooltip
 * that shows every active series' exact value (plus its min–max range,
 * when the current granularity is an aggregate rather than raw readings). */
export function DataLogChart({ rows, channels, channelKeyOf, chartType, granularity }: DataLogChartProps) {
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)

  const visibleRows = useMemo(() => {
    if (!zoomDomain) return rows
    const [lo, hi] = zoomDomain
    return rows.filter((r) => r.timeMs >= lo && r.timeMs <= hi)
  }, [rows, zoomDomain])

  // Flatten each channel's value onto the row directly (chartKey -> number)
  // so Recharts can use plain string dataKeys — simpler and more standard
  // than a per-row lookup function, and lets the tooltip below read a
  // series' min/max range straight off the same row via `ranges`.
  const chartData = useMemo(
    () =>
      visibleRows.map((row) => {
        const flat: Record<string, unknown> = { ...row }
        for (const c of channels) flat[channelKeyOf(c)] = row.values[channelKeyOf(c)] ?? null
        return flat
      }),
    [visibleRows, channels, channelKeyOf]
  )

  const gaps = useMemo(() => {
    const all = detectGaps(rows.map((r) => r.timeMs))
    if (!visibleRows.length) return []
    const [lo, hi] = [visibleRows[0].timeMs, visibleRows[visibleRows.length - 1].timeMs]
    return all.filter((g) => g.endMs >= lo && g.startMs <= hi)
  }, [rows, visibleRows])

  const tickFormat = TICK_FORMATS[granularity]
  const labelFormat = LABEL_FORMATS[granularity]

  const handleMouseDown = (e: { activeLabel?: number | string }) => {
    if (e?.activeLabel == null) return
    setDragStart(Number(e.activeLabel))
    setDragEnd(Number(e.activeLabel))
  }
  const handleMouseMove = (e: { activeLabel?: number | string }) => {
    if (dragStart == null || e?.activeLabel == null) return
    setDragEnd(Number(e.activeLabel))
  }
  const handleMouseUp = () => {
    if (dragStart != null && dragEnd != null && dragStart !== dragEnd) {
      setZoomDomain(dragStart < dragEnd ? [dragStart, dragEnd] : [dragEnd, dragStart])
    }
    setDragStart(null)
    setDragEnd(null)
  }

  const ChartComponent = chartType === "bar" ? BarChart : LineChart

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Drag to zoom in · shaded bands mark stretches with no data
        </p>
        <Button variant="outline" size="sm" onClick={() => setZoomDomain(null)} disabled={!zoomDomain}>
          <RotateCcw data-icon="inline-start" />
          Reset zoom
        </Button>
      </div>

      <div className="h-[420px] rounded-lg border p-4">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent
            data={chartData}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="timeMs"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              tickFormatter={(ms: number) => formatIst(new Date(ms).toISOString(), tickFormat)}
              className="text-xs fill-muted-foreground"
              minTickGap={40}
            />
            <YAxis className="text-xs fill-muted-foreground" />
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltipContent
                  active={active}
                  // Recharts' own payload-entry type is a broad union (dataKey
                  // can be a string, number, or accessor function) that doesn't
                  // structurally match this component's narrower, known-shape
                  // props — an explicit cast here is the standard escape hatch
                  // for a custom Recharts tooltip rather than fighting its types.
                  payload={payload as unknown as TooltipEntry[] | undefined}
                  label={label}
                  channels={channels}
                  channelKeyOf={channelKeyOf}
                  labelFormat={labelFormat}
                />
              )}
            />
            <Legend />

            {gaps.map((g) => (
              <ReferenceArea
                key={`${g.startMs}-${g.endMs}`}
                x1={g.startMs}
                x2={g.endMs}
                strokeOpacity={0}
                fill="var(--muted-foreground)"
                fillOpacity={0.12}
              />
            ))}

            {dragStart != null && dragEnd != null && (
              <ReferenceArea x1={dragStart} x2={dragEnd} strokeOpacity={0.4} fillOpacity={0.15} />
            )}

            {channels.map((c, i) => {
              const key = channelKeyOf(c)
              return chartType === "bar" ? (
                <Bar key={key} dataKey={key} name={`${c.deviceName} · ${c.label}`} fill={channelColor(i)} isAnimationActive={false} />
              ) : (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={`${c.deviceName} · ${c.label}`}
                  stroke={channelColor(i)}
                  dot={false}
                  isAnimationActive={false}
                />
              )
            })}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

interface TooltipEntry {
  dataKey: string
  value: number
  color: string
  name: string
  payload: MergedRow
}

// Recharts' own type for a custom Tooltip `content` render-prop is a loose,
// deeply-generic union that doesn't line up with a plain typed component
// (readonly payload array, extra fields we don't use, etc.) — narrowing to
// just what's actually needed here, with a runtime length/null check
// before use, is the standard pragmatic approach for a custom Recharts
// tooltip rather than fighting its exported types.
function ChartTooltipContent({
  active,
  payload,
  label,
  channels,
  channelKeyOf,
  labelFormat,
}: {
  active?: boolean
  payload?: readonly TooltipEntry[]
  label?: number | string
  channels: SamplingChannel[]
  channelKeyOf: (c: SamplingChannel) => string
  labelFormat: Intl.DateTimeFormatOptions
}) {
  if (!active || !payload?.length || label == null) return null
  const row = payload[0].payload

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">{formatIst(new Date(Number(label)).toISOString(), labelFormat)}</p>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => {
          const channel = channels.find((c) => channelKeyOf(c) === entry.dataKey)
          const range = row.ranges[entry.dataKey]
          if (entry.value == null) return null
          return (
            <div key={entry.dataKey} className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium tabular-nums text-popover-foreground">
                {entry.value.toFixed(2)}{channel?.unit ? ` ${channel.unit}` : ""}
              </span>
              {range && (
                <span className="text-muted-foreground">
                  (range {range.min.toFixed(2)}–{range.max.toFixed(2)})
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
