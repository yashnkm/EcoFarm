import type { DataPoint, Reading, CommandTemplate } from "@/types/api"
import type { ControlCommand } from "@/api/devices"

// ── Equipment classification ──────────────────────────────────────
//
// There's no structural "kind" field on a data point yet — this matches
// on label/key text, following the naming convention already used across
// real profiles (Temperature-3, Humidity-3, ...). Anything that doesn't
// match falls back to a plain row below the diagram, so nothing silently
// disappears just because it wasn't named the way this heuristic expects.

export type EquipmentKind = "FAN" | "MIST" | "TEMPERATURE" | "HUMIDITY" | "OTHER"

export function classifyDataPoint(dp: DataPoint): EquipmentKind {
  const text = `${dp.label} ${dp.key}`.toLowerCase()
  if (/fan/.test(text)) return "FAN"
  if (/mist|fog/.test(text)) return "MIST"
  if (/temp/.test(text)) return "TEMPERATURE"
  if (/humid/.test(text)) return "HUMIDITY"
  return "OTHER"
}

export function isActive(dp: DataPoint, reading: Reading | undefined): boolean {
  if (!reading || reading.value === null) return false
  if (dp.dataType === "BOOLEAN") return !!reading.value
  return reading.value > 0
}

export type RangeStatus = "good" | "bad" | "neutral"

export function rangeStatus(dp: DataPoint, reading: Reading | undefined): RangeStatus {
  if (!reading || reading.value === null) return "neutral"
  if (dp.minValue == null && dp.maxValue == null) return "neutral"
  if (dp.minValue != null && reading.value < dp.minValue) return "bad"
  if (dp.maxValue != null && reading.value > dp.maxValue) return "bad"
  return "good"
}

export function formatReadingNumber(v: number): string {
  return v % 1 === 0 ? v.toString() : v.toFixed(1)
}

// ── Command-derived fan fallback ────────────────────────────────────
//
// Some real profiles control a section's fan via a plain "Start Section-N" /
// "Stop Section-N" write command with no separate readable status point —
// there's nothing for classifyDataPoint to find. When that's the case, fall
// back to the most recent matching command's value as a best-known state
// (last commanded, not confirmed by the device) rather than showing nothing.

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_-]+/g, "")
}

/** Register numbers of any command template whose name references this zone. */
export function sectionCommandRegisters(zoneName: string, commands: CommandTemplate[]): Set<number> {
  const zoneKey = normalize(zoneName)
  const registers = new Set<number>()
  for (const cmd of commands) {
    if (normalize(cmd.name).includes(zoneKey)) registers.add(cmd.registerNumber)
  }
  return registers
}

/** Value of the most recently issued command targeting one of these registers. */
export function latestCommandValue(registers: Set<number>, history: ControlCommand[]): number | undefined {
  let latest: ControlCommand | undefined
  for (const c of history) {
    if (!registers.has(c.registerNumber)) continue
    if (!latest || new Date(c.createdAt).getTime() > new Date(latest.createdAt).getTime()) latest = c
  }
  return latest?.value
}
