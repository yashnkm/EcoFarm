import { WEEKDAY_LABELS, type HeatmapCell } from "./chartHelpers"

interface DataLogHeatmapProps {
  grid: HeatmapCell[][]
  unit: string | null
}

/** Day-of-week × hour-of-day heatmap — "what does a typical Tuesday
 * afternoon look like" rather than a plain timeline. Recharts has no
 * heatmap primitive, so this is a small hand-rolled grid using the app's
 * existing design tokens (no new charting/visualization library) —
 * color intensity is just the existing --primary token at varying
 * opacity, so it already matches both light and dark themes for free. */
export function DataLogHeatmap({ grid, unit }: DataLogHeatmapProps) {
  const allAvgs = grid.flat().map((c) => c.avg).filter((v): v is number => v != null)
  const min = allAvgs.length ? Math.min(...allAvgs) : 0
  const max = allAvgs.length ? Math.max(...allAvgs) : 1
  const range = max - min || 1

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-[3rem_repeat(24,1fr)] gap-0.5">
        <div />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="text-center text-[10px] text-muted-foreground">
            {h}
          </div>
        ))}
        {grid.map((row, weekday) => (
          <div key={weekday} className="contents">
            <div className="flex items-center text-xs text-muted-foreground">{WEEKDAY_LABELS[weekday]}</div>
            {row.map((cell) => {
              const intensity = cell.avg == null ? 0 : 0.08 + 0.82 * ((cell.avg - min) / range)
              return (
                <div
                  key={cell.hour}
                  className="aspect-square rounded-sm"
                  style={{ backgroundColor: cell.avg == null ? "var(--muted)" : `color-mix(in oklch, var(--primary) ${intensity * 100}%, var(--card))` }}
                  title={
                    cell.avg == null
                      ? `${WEEKDAY_LABELS[weekday]} ${cell.hour}:00 — no data`
                      : `${WEEKDAY_LABELS[weekday]} ${cell.hour}:00 — avg ${cell.avg.toFixed(2)}${unit ? ` ${unit}` : ""} (${cell.count} reading${cell.count === 1 ? "" : "s"})`
                  }
                />
              )
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Hour of day (IST) — hover a cell for the exact average</p>
    </div>
  )
}
