import type { CommandTemplate, DataPoint, Device, Reading } from "@/types/api"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CommandButton } from "@/components/CommandButton"
import { isDeviceOnline, statusBadgeProps } from "./deviceStatus"
import {
  classifyCommand,
  classifyParam,
  findMatchingCommand,
  friendlyCommandName,
  friendlyParamLabel,
  humanizeLabel,
  stripZoneSuffix,
} from "./sectionParams"

interface Props {
  zoneName: string
  dataPoints: DataPoint[]
  commands: CommandTemplate[]
  commandGroups: Record<string, string>
  readings: Map<string, Reading>
  deviceId: string
  deviceStatus: Device["status"]
  modeDataPoint?: DataPoint
  modeReading?: Reading
  issuePending: boolean
  onIssueCommand: (commandTemplateId: string, value?: number) => void
}

function formatReadingValue(v: number): string {
  return v % 1 === 0 ? v.toString() : v.toFixed(2)
}

export function SectionCard({
  zoneName,
  dataPoints,
  commands,
  commandGroups,
  readings,
  deviceId,
  deviceStatus,
  modeDataPoint,
  modeReading,
  issuePending,
  onIssueCommand,
}: Props) {
  // A cached value from before the device went offline is not the same
  // thing as a live confirmed one — showing it with full confidence would
  // silently lie about whether the section is actually in that state right
  // now. Once the device is offline, every reading-derived display in this
  // card (climate numbers, setpoints, status badges, the section switch)
  // falls back to "—" / Unknown instead, via this single choke point.
  const online = isDeviceOnline(deviceStatus)
  const getReading = (dp: DataPoint) => (online ? readings.get(`${deviceId}:${dp.key}`) : undefined)

  const temp = dataPoints.find((dp) => classifyParam(dp) === "TEMP_READING")
  const humidity = dataPoints.find((dp) => classifyParam(dp) === "HUMIDITY_READING")
  const foggingReadings = dataPoints.filter((dp) => classifyParam(dp) === "FOGGING_READING")
  const fans = dataPoints.filter((dp) => classifyParam(dp) === "FAN_READING")

  // Commands explicitly assigned to this zone (via the same per-device
  // assignment mechanism as dataPointGroups) — every command lives inside
  // its section's card, never in a separate page-level list, mirroring how
  // zone-less data points simply don't render on the live page either.
  const assignedCommands = commands.filter((cmd) => commandGroups[cmd.id] === zoneName)

  // A data point counts as a temp/fogging setpoint readback either via the
  // legacy name-based guess (classifyParam, for commands from before the
  // explicit link existed) or because some command assigned to this zone
  // explicitly links to it via statusDataPointKey — the explicit link is
  // what lets a genuinely new setpoint name show up here at all, instead of
  // being limited to the handful of hardcoded legacy names.
  const isLinkedSetpoint = (dp: DataPoint, group: "TEMPERATURE" | "FOGGING") =>
    assignedCommands.some((c) => c.statusDataPointKey === dp.key && classifyCommand(c) === group)

  const tempSetpoints = dataPoints.filter(
    (dp) => classifyParam(dp) === "TEMP_SETPOINT" || isLinkedSetpoint(dp, "TEMPERATURE")
  )
  const foggingSetpoints = dataPoints.filter(
    (dp) => classifyParam(dp) === "FOGGING_SETPOINT" || isLinkedSetpoint(dp, "FOGGING")
  )
  const claimedSetpointKeys = new Set([...tempSetpoints, ...foggingSetpoints].map((dp) => dp.key))
  const other = dataPoints.filter(
    (dp) => classifyParam(dp) === "OTHER" && !claimedSetpointKeys.has(dp.key)
  )

  // Section on/off (toggle) commands get their own prominent slot right
  // under the header — they control everything else in the section.
  const sectionCommands = assignedCommands.filter((cmd) => classifyCommand(cmd) === "SECTION")

  // Setpoint-style commands that aren't already shown above through a
  // matched status data point — e.g. a setpoint that doesn't have a
  // readback point yet still needs somewhere to appear once assigned.
  const matchedCommandIds = new Set(
    [...tempSetpoints, ...foggingSetpoints]
      .map((dp) => findMatchingCommand(dp, commands)?.id)
      .filter((id): id is string => !!id)
  )
  const unmatchedAssignedCommands = assignedCommands.filter(
    (cmd) => classifyCommand(cmd) !== "SECTION" && !matchedCommandIds.has(cmd.id)
  )
  const extraTempCommands = unmatchedAssignedCommands.filter((c) => classifyCommand(c) === "TEMPERATURE")
  const extraFoggingCommands = unmatchedAssignedCommands.filter((c) => classifyCommand(c) === "FOGGING")
  const extraOtherCommands = unmatchedAssignedCommands.filter(
    (c) => classifyCommand(c) !== "TEMPERATURE" && classifyCommand(c) !== "FOGGING"
  )

  const statusBadge = statusBadgeProps(deviceStatus)
  const modeIsAuto = online && modeDataPoint && modeReading?.value != null ? !!modeReading.value : undefined

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold tracking-wide">{zoneName}</CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            {modeDataPoint && (
              <Badge
                variant="outline"
                className={cn(
                  modeIsAuto === undefined && "text-muted-foreground",
                  modeIsAuto && "border-sky-500/30 bg-sky-500/15 text-sky-400"
                )}
              >
                {modeIsAuto === undefined
                  ? "MODE —"
                  : modeIsAuto
                    ? (modeDataPoint.trueLabel ?? "AUTO")
                    : (modeDataPoint.falseLabel ?? "MANUAL")}
              </Badge>
            )}
            <Badge variant={statusBadge.variant} className={statusBadge.className}>
              {deviceStatus}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        {(temp || humidity) && (
          <ParamGroup title="Current Climate">
            {temp && (
              <ClimateRow label={stripZoneSuffix(temp.label)} reading={getReading(temp)} unit={temp.unit} />
            )}
            {humidity && (
              <ClimateRow label={stripZoneSuffix(humidity.label)} reading={getReading(humidity)} unit={humidity.unit} />
            )}
          </ParamGroup>
        )}

        {(tempSetpoints.length > 0 || extraTempCommands.length > 0) && (
          <ParamGroup title="Temperature Control">
            {tempSetpoints.map((dp) => (
              <EditableParamRow
                key={dp.key}
                dp={dp}
                reading={getReading(dp)}
                command={findMatchingCommand(dp, commands)}
                disabled={issuePending}
                onIssue={onIssueCommand}
              />
            ))}
            {extraTempCommands.map((cmd) => (
              <CommandOnlyRow key={cmd.id} command={cmd} disabled={issuePending} onIssue={onIssueCommand} />
            ))}
          </ParamGroup>
        )}

        {(foggingReadings.length > 0 || foggingSetpoints.length > 0 || extraFoggingCommands.length > 0) && (
          <ParamGroup title="Fogging">
            {foggingReadings.map((dp) => (
              <StatusRow key={dp.key} label={humanizeLabel(dp.label)} reading={getReading(dp)} dp={dp} />
            ))}
            {foggingSetpoints.map((dp) => (
              <EditableParamRow
                key={dp.key}
                dp={dp}
                reading={getReading(dp)}
                command={findMatchingCommand(dp, commands)}
                disabled={issuePending}
                onIssue={onIssueCommand}
              />
            ))}
            {extraFoggingCommands.map((cmd) => (
              <CommandOnlyRow key={cmd.id} command={cmd} disabled={issuePending} onIssue={onIssueCommand} />
            ))}
          </ParamGroup>
        )}

        {fans.length > 0 && (
          <ParamGroup title="Ventilation">
            {fans.map((dp) => (
              <StatusRow key={dp.key} label={humanizeLabel(dp.label)} reading={getReading(dp)} dp={dp} />
            ))}
          </ParamGroup>
        )}

        {extraOtherCommands.length > 0 && (
          <ParamGroup title="Other Settings">
            {extraOtherCommands.map((cmd) => (
              <CommandOnlyRow key={cmd.id} command={cmd} disabled={issuePending} onIssue={onIssueCommand} />
            ))}
          </ParamGroup>
        )}

        {other.length > 0 && (
          <ParamGroup title="Other">
            {other.map((dp) => {
              // A boolean-configured point (e.g. a "Fan Status" readback
              // that doesn't happen to match the "Fan-N" label pattern the
              // Ventilation group looks for) still deserves an ON/OFF badge,
              // not a raw 0/1 dump — go by what it's actually configured as,
              // not a guess from its label text.
              if (dp.dataType === "BOOLEAN" || dp.displayWidget === "BOOLEAN_TOGGLE" || dp.displayWidget === "BOOLEAN_DISPLAY") {
                return <StatusRow key={dp.key} label={humanizeLabel(dp.label)} reading={getReading(dp)} dp={dp} />
              }
              const reading = getReading(dp)
              const value = reading?.value != null ? formatReadingValue(reading.value) : "—"
              const unit = reading?.unit ?? dp.unit
              return (
                <div key={dp.key} className="flex items-center justify-between text-sm">
                  <span className="mr-2 truncate text-muted-foreground">{dp.label}</span>
                  <span className="shrink-0 font-mono font-medium tabular-nums">
                    {value}
                    {unit && value !== "—" ? ` ${unit}` : ""}
                  </span>
                </div>
              )
            })}
          </ParamGroup>
        )}

        {sectionCommands.length > 0 && (
          <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
            {sectionCommands.map((cmd, i) => {
              // Pairs fill one row split in half; a trailing odd command
              // takes the full remaining width of its own row.
              const spansFullWidth = i === sectionCommands.length - 1 && sectionCommands.length % 2 === 1
              return (
                <div key={cmd.id} className={cn(spansFullWidth && "col-span-2")}>
                  <CommandButton
                    command={cmd}
                    variant="switch"
                    onIssue={onIssueCommand}
                    disabled={issuePending}
                    statusValue={
                      online && cmd.statusDataPointKey
                        ? readings.get(`${deviceId}:${cmd.statusDataPointKey}`)?.value
                        : undefined
                    }
                  />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Internal building blocks ────────────────────────────────────────

function ParamGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-3">
      <span className="text-[0.68rem] font-semibold tracking-wider text-muted-foreground uppercase">{title}</span>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

/** Live reading, prominent — this is what the operator scans first. */
function ClimateRow({ label, reading, unit }: { label: string; reading: Reading | undefined; unit: string | null }) {
  const value = reading?.value != null ? formatReadingValue(reading.value) : "—"
  const readUnit = reading?.unit ?? unit

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
        {value}
        {readUnit && value !== "—" && <span className="ml-1 text-sm font-normal text-muted-foreground">{readUnit}</span>}
      </span>
    </div>
  )
}

/** Boolean live status (fan/fogging) — green when confirmed on, muted otherwise. */
function StatusRow({ label, reading, dp }: { label: string; reading: Reading | undefined; dp: DataPoint }) {
  const hasReading = reading?.value != null
  const isOn = hasReading && !!reading!.value

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("flex items-center gap-1.5 font-mono font-medium", isOn ? "text-emerald-400" : "text-muted-foreground")}>
        <span className={cn("size-1.5 rounded-full", isOn ? "bg-emerald-400" : "bg-muted-foreground/40")} />
        {hasReading ? (isOn ? (dp.trueLabel ?? "ON") : (dp.falseLabel ?? "OFF")) : "—"}
      </span>
    </div>
  )
}

/** A configuration value shown inline with its current reading — clickable
 * via the existing CommandButton dialog when a matching command exists,
 * plain read-only text otherwise (never invents a control). */
function EditableParamRow({
  dp,
  reading,
  command,
  disabled,
  onIssue,
}: {
  dp: DataPoint
  reading: Reading | undefined
  command: CommandTemplate | undefined
  disabled: boolean
  onIssue: (id: string, value?: number) => void
}) {
  const value = reading?.value != null ? formatReadingValue(reading.value) : "—"
  const unit = reading?.unit ?? dp.unit
  const label = friendlyParamLabel(dp)

  if (!command) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium tabular-nums">
          {value}
          {unit && value !== "—" ? ` ${unit}` : ""}
        </span>
      </div>
    )
  }

  return (
    <CommandButton
      command={command}
      onIssue={onIssue}
      disabled={disabled}
      variant="row"
      rowLabel={label}
      rowValue={value}
      rowUnit={unit}
    />
  )
}

/** A command assigned to this zone with no matching readback data point —
 * still clickable via the same dialog, just with no live value to show. */
function CommandOnlyRow({
  command,
  disabled,
  onIssue,
}: {
  command: CommandTemplate
  disabled: boolean
  onIssue: (id: string, value?: number) => void
}) {
  return (
    <CommandButton
      command={command}
      onIssue={onIssue}
      disabled={disabled}
      variant="row"
      rowLabel={friendlyCommandName(command.name)}
      rowValue="—"
    />
  )
}
