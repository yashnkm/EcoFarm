import type { DataPoint, Reading } from "@/types/api"

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
