// Pure helper functions for the Data Log chart — time-range presets, gap
// detection, per-series stats, and heatmap bucketing. Kept separate from
// OriginalDataTab.tsx so the actual math is easy to read/test in isolation
// from the (already fairly large) chart UI.

// Forced to Asia/Kolkata rather than the viewer's own device timezone: the
// farm's actual local time is what matters here, regardless of who's
// looking at the screen. Accepts either a real ISO instant or a
// merge-bucket time truncated to the second with its "Z" stripped (the
// caller re-appends it) — same convention used throughout Data Log.
export function formatIst(isoTime: string, opts: Intl.DateTimeFormatOptions) {
  const withZone = isoTime.endsWith("Z") ? isoTime : `${isoTime}Z`
  return new Date(withZone).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...opts })
}

export type TimePreset = "today" | "7d" | "30d" | "all" | "custom"

/** Start/end for a named preset, in the viewer's local time — "Today" means
 * the calendar day so far wherever the browser is, matching what a
 * datetime-local input would show; the backend/IST-formatting elsewhere
 * only matters for how timestamps are *displayed*, not which wall-clock
 * "today" means when picking a range. "All Time" has no natural start, so
 * it uses a far-past date and lets the backend's own caps decide what's
 * actually returned. */
export function getPresetRange(preset: Exclude<TimePreset, "custom">): { from: Date; to: Date } {
  const now = new Date()
  const to = now
  switch (preset) {
    case "today": {
      const from = new Date(now)
      from.setHours(0, 0, 0, 0)
      return { from, to }
    }
    case "7d":
      return { from: new Date(now.getTime() - 7 * 24 * 3600 * 1000), to }
    case "30d":
      return { from: new Date(now.getTime() - 30 * 24 * 3600 * 1000), to }
    case "all":
      return { from: new Date("2020-01-01T00:00:00"), to }
  }
}

// ── Shared data model between raw and aggregated fetch modes ──────────────
//
// Raw readings and aggregate buckets get normalized into this one shape
// before merging, so the rest of the chart (gap detection, stats, zoom,
// tooltips) never needs to know which mode produced a given point.

export interface NormalizedPoint {
  time: string // ISO instant
  value: number | null
  min?: number
  max?: number // present only in aggregated (Hourly/Daily/Weekly) mode
}

export interface MergedRow {
  time: string // ISO, truncated to the second (bucket key)
  timeMs: number
  values: Record<string, number | null>
  ranges: Record<string, { min: number; max: number } | undefined>
}

/** Channels from the same poll group are read together, so their
 * timestamps line up at whole-second resolution in practice — truncating
 * to the second is a pragmatic alignment key, not a guarantee of exact
 * simultaneity. In aggregated mode, bucketStart values already align
 * exactly since they come from the same date_trunc() on the backend. */
export function mergeReadings(
  keys: string[],
  data: Record<string, NormalizedPoint[]>
): MergedRow[] {
  const rows = new Map<string, MergedRow>()
  for (const key of keys) {
    for (const p of data[key] ?? []) {
      const bucket = p.time.slice(0, 19)
      let row = rows.get(bucket)
      if (!row) {
        row = { time: bucket, timeMs: new Date(`${bucket}Z`).getTime(), values: {}, ranges: {} }
        rows.set(bucket, row)
      }
      row.values[key] = p.value
      if (p.min != null && p.max != null) row.ranges[key] = { min: p.min, max: p.max }
    }
  }
  return [...rows.values()].sort((a, b) => a.timeMs - b.timeMs)
}

export interface GapRange {
  startMs: number
  endMs: number
}

/** Flags stretches of the timeline with no data at all — e.g. the gateway
 * was offline — as distinct from the normal spacing between samples. A gap
 * is a delta between two consecutive (merged) points that's well beyond
 * the typical spacing: more than 3x the median delta, and at least 5
 * minutes absolute (so fast-sampled data's normal jitter never gets
 * flagged just because one series briefly loaded a hair slower). */
export function detectGaps(sortedTimesMs: number[]): GapRange[] {
  if (sortedTimesMs.length < 3) return []

  const deltas: number[] = []
  for (let i = 1; i < sortedTimesMs.length; i++) {
    deltas.push(sortedTimesMs[i] - sortedTimesMs[i - 1])
  }
  const sorted = [...deltas].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const threshold = Math.max(median * 3, 5 * 60 * 1000)

  const gaps: GapRange[] = []
  for (let i = 1; i < sortedTimesMs.length; i++) {
    const delta = sortedTimesMs[i] - sortedTimesMs[i - 1]
    if (delta > threshold) {
      gaps.push({ startMs: sortedTimesMs[i - 1], endMs: sortedTimesMs[i] })
    }
  }
  return gaps
}

export interface SeriesStats {
  min: number
  max: number
  avg: number
  count: number
}

/** Min/max/avg for one series across whatever rows are currently visible
 * (i.e. after zoom, if any) — ignores missing/null values rather than
 * treating them as zero. */
export function computeStats(values: (number | null | undefined)[]): SeriesStats | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v))
  if (!nums.length) return null
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const avg = nums.reduce((sum, v) => sum + v, 0) / nums.length
  return { min, max, avg, count: nums.length }
}

const WEEKDAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Weekday (IST) + hour (IST) for one timestamp — used to bucket readings
 * into the day/hour heatmap grid. Forced to Asia/Kolkata for the same
 * reason the rest of Data Log is: the farm's own local time is what
 * defines "morning" or "Monday", not the viewer's device timezone. */
function getIstWeekdayHour(dateIso: string): { weekday: number; hour: number } {
  const date = new Date(dateIso)
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Sun"
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0"
  return { weekday: WEEKDAY_ORDER.indexOf(weekdayStr), hour: Number(hourStr) }
}

export interface HeatmapCell {
  weekday: number // 0=Sun .. 6=Sat
  hour: number // 0..23
  avg: number | null
  count: number
}

/** Buckets (time, value) pairs into a 7×24 (weekday × hour) grid of
 * averages, in IST — "what does a typical Tuesday afternoon look like"
 * rather than a plain timeline. Only meaningful for one series at a time,
 * which the chart-type UI enforces before calling this. */
export function buildHeatmap(points: { time: string; value: number | null }[]): HeatmapCell[][] {
  const sums: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  const counts: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))

  for (const p of points) {
    if (p.value == null) continue
    const { weekday, hour } = getIstWeekdayHour(p.time)
    sums[weekday][hour] += p.value
    counts[weekday][hour] += 1
  }

  return sums.map((row, weekday) =>
    row.map((sum, hour) => ({
      weekday,
      hour,
      count: counts[weekday][hour],
      avg: counts[weekday][hour] > 0 ? sum / counts[weekday][hour] : null,
    }))
  )
}

export const WEEKDAY_LABELS = WEEKDAY_ORDER
