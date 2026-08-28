import { computeStats } from "./chartHelpers"
import { channelColor } from "./channelColors"
import type { SamplingChannel } from "@/types/api"

interface StatsSummaryProps {
  channels: SamplingChannel[]
  channelKeyOf: (c: SamplingChannel) => string
  getValues: (key: string) => (number | null | undefined)[]
}

/** Compact "Min · Max · Avg" line per active series, for whatever's
 * currently visible on the chart (i.e. reflects zoom, if any) — kept
 * small and unobtrusive rather than a big stats panel. */
export function StatsSummary({ channels, channelKeyOf, getValues }: StatsSummaryProps) {
  if (!channels.length) return null

  const rows = channels
    .map((c, i) => {
      const key = channelKeyOf(c)
      const stats = computeStats(getValues(key))
      return stats ? { key, color: channelColor(i), label: `${c.deviceName} · ${c.label}`, unit: c.unit, stats } : null
    })
    .filter((r): r is NonNullable<typeof r> => !!r)

  if (!rows.length) return null

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1.5 rounded-lg border bg-muted/30 px-4 py-2.5 text-xs">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
          <span className="font-medium text-foreground">{r.label}</span>
          <span className="text-muted-foreground">
            Min: {r.stats.min.toFixed(2)} · Max: {r.stats.max.toFixed(2)} · Avg: {r.stats.avg.toFixed(2)}
            {r.unit ? ` ${r.unit}` : ""}
          </span>
        </div>
      ))}
    </div>
  )
}
