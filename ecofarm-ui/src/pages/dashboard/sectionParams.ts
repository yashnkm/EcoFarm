import type { DataPoint, CommandTemplate } from "@/types/api"

// ── Grouping data points into the section-card layout ──────────────
//
// Pure presentation grouping — reads existing label/key text the same way
// deviceStatus.ts and the old sectionEquipment.ts did. Nothing here changes
// what data exists or how it's fetched; it only decides which visual group
// an already-existing data point belongs in. Anything that doesn't match a
// known pattern falls through to "OTHER" and still renders (as a plain row),
// so nothing already on the page can silently disappear.

export type ParamGroup =
  | "TEMP_READING"
  | "HUMIDITY_READING"
  | "TEMP_SETPOINT"
  | "FOGGING_READING"
  | "FOGGING_SETPOINT"
  | "FAN_READING"
  | "OTHER"

const TEMP_SETPOINT_NAMES = new Set(["set1", "set2", "hysteresis"])
const FOGGING_SETPOINT_NAMES = new Set(["fogging time", "cycle time"])

export function classifyParam(dp: DataPoint): ParamGroup {
  const label = dp.label.trim().toLowerCase()
  if (/^fan-/.test(label)) return "FAN_READING"
  if (/^fogging-/.test(label)) return "FOGGING_READING"
  if (/^temperature-/.test(label)) return "TEMP_READING"
  if (/^humidity-/.test(label)) return "HUMIDITY_READING"
  if (label.endsWith(" status")) {
    const base = label.slice(0, -" status".length).trim()
    if (TEMP_SETPOINT_NAMES.has(base)) return "TEMP_SETPOINT"
    if (FOGGING_SETPOINT_NAMES.has(base)) return "FOGGING_SETPOINT"
  }
  return "OTHER"
}

export type CommandGroup = "TEMPERATURE" | "FOGGING" | "SECTION" | "OTHER"

export function classifyCommand(cmd: CommandTemplate): CommandGroup {
  if (cmd.offValue != null) return "SECTION"
  const name = cmd.name.trim().toLowerCase()
  if (TEMP_SETPOINT_NAMES.has(name)) return "TEMPERATURE"
  if (FOGGING_SETPOINT_NAMES.has(name)) return "FOGGING"
  return "OTHER"
}

/** Matches a "<Name> Status" readback data point back to the editable
 * "<Name>" command that writes it — e.g. "Set1 Status" → command "Set1". */
export function findMatchingCommand(dp: DataPoint, commands: CommandTemplate[]): CommandTemplate | undefined {
  const base = dp.label.trim().toLowerCase().replace(/ status$/, "")
  return commands.find((c) => c.name.trim().toLowerCase() === base)
}

const FRIENDLY_PARAM_LABELS: Record<string, string> = {
  set1: "Setpoint 1",
  set2: "Setpoint 2",
}

/** "Set1 Status" -> "Setpoint 1", "Hysteresis Status" -> "Hysteresis", etc. */
export function friendlyParamLabel(dp: DataPoint): string {
  const base = dp.label.trim().replace(/ status$/i, "")
  return FRIENDLY_PARAM_LABELS[base.toLowerCase()] ?? base
}

/** Same friendly mapping applied directly to a command's own name — for
 * commands assigned to a zone with no backing status data point to read
 * the label from. */
export function friendlyCommandName(name: string): string {
  return FRIENDLY_PARAM_LABELS[name.trim().toLowerCase()] ?? name
}

/** Drops the zone suffix for single-per-section readings — "Temperature-3" -> "Temperature". */
export function stripZoneSuffix(label: string): string {
  return label.replace(/-\d+[A-Za-z]?$/, "")
}

/** "Fan-3B" -> "Fan 3B" — keeps the distinguishing suffix for multi-per-section readings. */
export function humanizeLabel(label: string): string {
  return label.replace(/-/g, " ")
}
