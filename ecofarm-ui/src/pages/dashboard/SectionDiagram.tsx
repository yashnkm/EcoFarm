import type { CSSProperties } from "react"
import type { DataPoint, Reading } from "@/types/api"
import { cn } from "@/lib/utils"
import { classifyDataPoint, isActive, rangeStatus, formatReadingNumber } from "./sectionEquipment"

// ── Fixed layout slots (viewBox 0 0 300 170) ──────────────────────

const FAN_SLOTS = [
  { housingY: 48, hubY: 63, wisps: ["M40,57 Q45,51 50,57 T60,57 Q63,60 61,63", "M36,68 Q41,62 46,68 T56,68 T66,68 Q69,71 67,74"] },
  { housingY: 92, hubY: 107, wisps: ["M38,101 Q43,95 48,101 T58,101 Q61,104 59,107", "M42,112 Q46,107 50,112 T58,112 Q60,114 58,116"] },
]
const MIST_X = [90, 150, 210]
const HUB_X = 271

interface Props {
  zoneName: string
  dataPoints: DataPoint[]
  readings: Map<string, Reading>
  deviceId: string
  /**
   * Last-commanded fan state, used only when this zone has no readable FAN
   * data point of its own — e.g. profiles that only expose a "Start/Stop
   * Section-N" write command with no status readback. Undefined means no
   * command has ever been issued (nothing to show).
   */
  fallbackFanOn?: boolean
}

export function SectionDiagram({ zoneName, dataPoints, readings, deviceId, fallbackFanOn }: Props) {
  const getReading = (dp: DataPoint) => readings.get(`${deviceId}:${dp.key}`)

  const fans = dataPoints.filter((dp) => classifyDataPoint(dp) === "FAN").slice(0, 2)
  const mists = dataPoints.filter((dp) => classifyDataPoint(dp) === "MIST").slice(0, 3)
  const climate = dataPoints.filter((dp) => {
    const k = classifyDataPoint(dp)
    return k === "TEMPERATURE" || k === "HUMIDITY"
  })

  // No readable fan point on this section, but we know the last command
  // issued for it — show a fan driven by that instead of nothing.
  const useFallbackFan = fans.length === 0 && fallbackFanOn !== undefined

  const hasDiagram = fans.length > 0 || mists.length > 0 || climate.length > 0 || useFallbackFan
  if (!hasDiagram) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-[300/170] w-full overflow-hidden rounded-md border bg-muted">
        <svg
          viewBox="0 0 300 170"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${zoneName} layout diagram`}
          className="block h-full w-full"
        >
          <rect x="6" y="6" width="288" height="158" rx="10" className="fill-muted stroke-border" />

          {mists.map((dp, i) => (
            <MistNozzle key={dp.key} x={MIST_X[i]} active={isActive(dp, getReading(dp))} />
          ))}

          {fans.map((dp, i) => (
            <FanUnit key={dp.key} slot={FAN_SLOTS[i]} active={isActive(dp, getReading(dp))} confirmed />
          ))}
          {useFallbackFan && (
            <FanUnit slot={FAN_SLOTS[0]} active={!!fallbackFanOn} confirmed={false} />
          )}
        </svg>
      </div>

      {climate.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {climate.map((dp) => {
            const reading = getReading(dp)
            const status = rangeStatus(dp, reading)
            const value = reading?.value != null ? formatReadingNumber(reading.value) : "—"
            const unit = reading?.unit ?? dp.unit

            return (
              <div key={dp.key} className="flex flex-1 items-center gap-2 rounded-md border bg-muted px-2.5 py-1.5">
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    status === "good" && "bg-emerald-400",
                    status === "bad" && "bg-destructive",
                    status === "neutral" && "bg-muted-foreground/40"
                  )}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[0.62rem] font-medium tracking-wide text-muted-foreground uppercase">
                    {dp.label}
                  </span>
                  <span className="font-mono text-sm font-medium tabular-nums">
                    {value}
                    {unit && value !== "—" ? <small className="ml-0.5 text-muted-foreground">{unit}</small> : null}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── SVG pieces ─────────────────────────────────────────────────────

function MistNozzle({ x, active }: { x: number; active: boolean }) {
  const droplets = [
    { dx: -4, delay: 0 },
    { dx: 4, delay: 0.5 },
  ]
  return (
    <>
      <path
        d={`M${x - 6},10 L${x + 6},10 L${x},20 Z`}
        className={active ? "fill-blue-400" : "fill-muted-foreground/40"}
      />
      {active &&
        droplets.map((d, i) => (
          <circle
            key={i}
            cx={x}
            cy={24}
            r={2.6}
            className="fill-blue-400 animate-[fall_1.6s_ease-in_infinite] motion-reduce:animate-none"
            style={{ "--dx": `${d.dx}px`, animationDelay: `${d.delay}s` } as CSSProperties}
          />
        ))}
    </>
  )
}

function FanUnit({
  slot,
  active,
  confirmed,
}: {
  slot: (typeof FAN_SLOTS)[number]
  active: boolean
  /** False when this reflects the last command sent, not a sensor reading. */
  confirmed: boolean
}) {
  const { housingY, hubY, wisps } = slot

  return (
    <>
      <path
        d={`M40,${hubY} H247`}
        className={active ? "stroke-sky-400/50" : "stroke-border"}
        strokeWidth={1.5}
        strokeDasharray="3 5"
        fill="none"
      />
      {active &&
        wisps.map((d, i) => (
          <g
            key={i}
            className="animate-[drift_2s_linear_infinite] motion-reduce:animate-none"
            style={{ animationDelay: `${i * 0.4}s`, animationDuration: `${1.9 + i * 0.3}s` }}
          >
            <path d={d} className="stroke-sky-400" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.9} />
          </g>
        ))}

      <rect
        x={258}
        y={housingY}
        width={26}
        height={30}
        rx={6}
        strokeDasharray={confirmed ? undefined : "3 2"}
        className={cn("fill-card stroke-border", !active && "opacity-55")}
      >
        {!confirmed && <title>Last commanded state — not confirmed by a sensor reading</title>}
      </rect>
      <g
        className={active ? "stroke-sky-400 animate-[spin_2.6s_linear_infinite] motion-reduce:animate-none" : "stroke-muted-foreground/50"}
        style={{ transformOrigin: `${HUB_X}px ${hubY}px` }}
      >
        <line x1={HUB_X} y1={hubY} x2={HUB_X} y2={hubY - 11} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={HUB_X} y1={hubY} x2={HUB_X + 10} y2={hubY + 6} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={HUB_X} y1={hubY} x2={HUB_X - 10} y2={hubY + 6} strokeWidth={2.5} strokeLinecap="round" />
      </g>
      <circle cx={HUB_X} cy={hubY} r={3} className={active ? "fill-sky-400" : "fill-muted-foreground/50"} />
    </>
  )
}
