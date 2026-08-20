import type { CommandTemplate, DataPoint, Device, Reading } from "@/types/api"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CommandButton } from "@/components/CommandButton"
import { statusBadgeProps } from "./deviceStatus"
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
  const getReading = (dp: DataPoint) => readings.get(`${deviceId}:${dp.key}`)

  const temp = dataPoints.find((dp) => classifyParam(dp) === "TEMP_READING")
  const humidity = dataPoints.find((dp) => classifyParam(dp) === "HUMIDITY_READING")
  const tempSetpoints = dataPoints.filter((dp) => classifyParam(dp) === "TEMP_SETPOINT")
  const foggingReadings = dataPoints.filter((dp) => classifyParam(dp) === "FOGGING_READING")
  const foggingSetpoints = dataPoints.filter((dp) => classifyParam(dp) === "FOGGING_SETPOINT")
  const fans = dataPoints.filter((dp) => classifyParam(dp) === "FAN_READING")
  const other = dataPoints.filter((dp) => classifyParam(dp) === "OTHER")

  // Setpoint commands explicitly assigned to this zone (via the same
  // per-device assignment mechanism as dataPointGroups) that aren't already
  // shown above through a matched status data point — e.g. a setpoint that
  // doesn't have a readback point yet still needs somewhere to appear once
  // an admin has assigned it here.
  const matchedCommandIds = new Set(
    [...tempSetpoints, ...foggingSetpoints]
      .map((dp) => findMatchingCommand(dp, commands)?.id)
      .filter((id): id is string => !!id)
  )
  const unmatchedAssignedCommands = commands.filter(
    (cmd) => commandGroups[cmd.id] === zoneName && cmd.promptForValue && !matchedCommandIds.has(cmd.id)
  )
  const extraTempCommands = unmatchedAssignedCommands.filter((c) => classifyCommand(c) === "TEMPERATURE")
  const extraFoggingCommands = unmatchedAssignedCommands.filter((c) => classifyCommand(c) === "FOGGING")
  const extraOtherCommands = unmatchedAssignedCommands.filter(
    (c) => classifyCommand(c) !== "TEMPERATURE" && classifyCommand(c) !== "FOGGING"
  )

  const statusBadge = statusBadgeProps(deviceStatus)
  const modeIsAuto = modeDataPoint && modeReading?.value != null ? !!modeReading.value : undefined

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

      <CardContent className="flex flex-col gap-3">
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
