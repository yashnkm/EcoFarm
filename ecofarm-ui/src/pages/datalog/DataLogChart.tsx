import { useEffect, useRef, useState } from "react"
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type MouseEventParams,
} from "lightweight-charts"
import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { channelColor } from "./channelColors"
import { detectGaps, formatIst, type MergedRow } from "./chartHelpers"
import type { SamplingChannel, ReadingGranularity } from "@/types/api"

type ChartGranularity = ReadingGranularity | "RAW"
export type ChartType = "line" | "bar"

interface DataLogChartProps {
  rows: MergedRow[] // full range, already sorted ascending by time
  channels: SamplingChannel[]
  channelKeyOf: (c: SamplingChannel) => string
  chartType: ChartType
  granularity: ChartGranularity
}

const LABEL_FORMATS: Record<ChartGranularity, Intl.DateTimeFormatOptions> = {
  RAW: { dateStyle: "medium", timeStyle: "medium" },
  HOUR: { dateStyle: "medium", timeStyle: "short" },
  DAY: { dateStyle: "medium" },
  WEEK: { dateStyle: "medium" },
}

/** Resolves any CSS color — including this app's oklch() theme tokens —
 * to a plain rgb()/rgba() string. The browser's own computed-style
 * resolution already understands oklch(); lightweight-charts' internal
 * color parser (used for its canvas rendering) does not, so this is the
 * bridge between the two. Re-run whenever the theme toggles, since a
 * canvas chart's colors are baked in at applyOptions time rather than
 * continuously read from CSS the way the previous SVG-based chart's were. */
function resolveCssColor(cssValue: string): string {
  const probe = document.createElement("span")
  probe.style.color = cssValue
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  document.body.removeChild(probe)
  return resolved
}

interface HoverValue {
  key: string
  label: string
  unit: string | null
  value: number
  color: string
}

interface HoverInfo {
  x: number
  y: number
  time: string
  values: HoverValue[]
}

/** Line/histogram rendering for the Data Log chart, via lightweight-charts
 * (the library TradingView built and uses themselves) instead of Recharts —
 * this is the one chart in the app that uses it; nothing else changed.
 * Mouse-wheel/pinch zoom and click-drag pan are the library's own defaults,
 * not custom code — that's the whole reason for the switch: Recharts has no
 * native equivalent, only a hand-rolled drag-to-select-then-redraw
 * workaround, which is what this component used to do. */
export function DataLogChart({ rows, channels, channelKeyOf, chartType, granularity }: DataLogChartProps) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  // Deeply-generic per-series-type API is more trouble to type-thread through
  // here than it's worth — same pragmatic cast-at-the-boundary approach the
  // old Recharts tooltip in this file already used for its own charting
  // library's types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map())
  const [hover, setHover] = useState<HoverInfo | null>(null)

  const labelFormat = LABEL_FORMATS[granularity]

  // Create the chart once per mount.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: resolveCssColor("var(--muted-foreground)"),
      },
      grid: {
        vertLines: { color: resolveCssColor("var(--border)") },
        horzLines: { color: resolveCssColor("var(--border)") },
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: resolveCssColor("var(--border)") },
      rightPriceScale: { borderColor: resolveCssColor("var(--border)") },
    })
    chartRef.current = chart

    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!param.point || param.time == null) {
        setHover(null)
        return
      }
      const values: HoverValue[] = []
      channels.forEach((c, i) => {
        const key = channelKeyOf(c)
        const series = seriesRef.current.get(key)
        if (!series) return
        const point = param.seriesData.get(series) as { value?: number } | undefined
        if (point?.value == null) return
        values.push({ key, label: `${c.deviceName} · ${c.label}`, unit: c.unit, value: point.value, color: channelColor(i) })
      })
      if (!values.length) {
        setHover(null)
        return
      }
      setHover({
        x: param.point.x,
        y: param.point.y,
        time: new Date((param.time as number) * 1000).toISOString(),
        values,
      })
    }
    chart.subscribeCrosshairMove(handleCrosshairMove)

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove)
      chart.remove()
      chartRef.current = null
      seriesRef.current.clear()
    }
    // Recreated only on mount/unmount — channels/chartType/rows are all
    // handled by the effects below via the already-created chart instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-theme on light/dark toggle.
  useEffect(() => {
    chartRef.current?.applyOptions({
      layout: { textColor: resolveCssColor("var(--muted-foreground)") },
      grid: {
        vertLines: { color: resolveCssColor("var(--border)") },
        horzLines: { color: resolveCssColor("var(--border)") },
      },
      timeScale: { borderColor: resolveCssColor("var(--border)") },
      rightPriceScale: { borderColor: resolveCssColor("var(--border)") },
    })
  }, [theme])

  const channelKeysSignature = channels.map(channelKeyOf).join(",")

  // Rebuild series (not just their data) when the active channel set or
  // chart type changes — a series' type can't be changed after creation.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    for (const series of seriesRef.current.values()) chart.removeSeries(series)
    seriesRef.current.clear()

    channels.forEach((c, i) => {
      const key = channelKeyOf(c)
      const color = channelColor(i)
      const series = chartType === "bar"
        ? chart.addSeries(HistogramSeries, { color })
        : chart.addSeries(LineSeries, { color, lineWidth: 2, priceLineVisible: false, lastValueVisible: false })
      seriesRef.current.set(key, series)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType, channelKeysSignature])

  // Push data. A real gap (see chartHelpers#detectGaps) gets an explicit
  // whitespace point (a time with no value) at each boundary — the
  // library's own documented mechanism for a visible break in the line,
  // rather than a shaded ReferenceArea like the previous Recharts version
  // used (that primitive doesn't have a direct equivalent here, and a
  // broken line reads just as clearly as "no data" without needing one).
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !rows.length) return

    const gapBoundaries = new Set<number>()
    for (const g of detectGaps(rows.map((r) => r.timeMs))) {
      gapBoundaries.add(g.startMs)
      gapBoundaries.add(g.endMs)
    }

    for (const c of channels) {
      const key = channelKeyOf(c)
      const series = seriesRef.current.get(key)
      if (!series) continue

      const data = rows
        .filter((r) => r.values[key] != null || gapBoundaries.has(r.timeMs))
        .map((r) => {
          const time = Math.floor(r.timeMs / 1000) as UTCTimestamp
          const value = r.values[key]
          return value == null ? { time } : { time, value }
        })
      series.setData(data)
    }

    chart.timeScale().fitContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, channelKeysSignature])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Scroll or pinch to zoom · drag to pan · breaks in the line mark stretches with no data
        </p>
        <Button variant="outline" size="sm" onClick={() => chartRef.current?.timeScale().fitContent()}>
          <RotateCcw data-icon="inline-start" />
          Fit to range
        </Button>
      </div>

      <div className="relative h-[420px] rounded-lg border p-2">
        <div ref={containerRef} className="size-full" />
        {hover && (
          <div
            className="pointer-events-none absolute z-10 max-w-56 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md"
            style={{
              left: Math.min(hover.x + 12, (containerRef.current?.clientWidth ?? 280) - 224),
              top: Math.max(hover.y - 12, 0),
            }}
          >
            <p className="mb-1.5 font-medium text-popover-foreground">{formatIst(hover.time, labelFormat)}</p>
            <div className="flex flex-col gap-1">
              {hover.values.map((v) => (
                <div key={v.key} className="flex items-center gap-1.5">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: v.color }} />
                  <span className="text-muted-foreground">{v.label}:</span>
                  <span className="font-medium tabular-nums text-popover-foreground">
                    {v.value.toFixed(2)}{v.unit ? ` ${v.unit}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
