import { useState } from "react"
import { Zap, SquarePen } from "lucide-react"

import type { CommandTemplate } from "@/types/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Props {
  command: CommandTemplate
  onIssue: (commandTemplateId: string, value?: number) => void
  disabled?: boolean
  /**
   * Current value of the command's linked status data point (toggle commands
   * only) — undefined/null means no reading has ever come in, so the state
   * is unknown rather than assumed off.
   */
  statusValue?: number | null
  /**
   * "chip" (default): the standalone pill button used in the admin commands
   * table. "row": an inline label+value row for embedding a command inline
   * next to the reading it controls (e.g. inside a section card). "switch":
   * a full-width toggle-switch control (section on/off, pinned to the
   * bottom of a section card) — all three share the same click behavior
   * and dialogs underneath, just a different trigger element.
   */
  variant?: "chip" | "row" | "switch"
  rowLabel?: string
  rowValue?: string
  rowUnit?: string | null
}

/**
 * One command button, handling every way a command can be issued:
 * - toggle (offValue set): a single button reflecting live status —
 *   green "<name> ON" / red "<name> OFF" / grey "<name> — Unknown". Clicking
 *   always sends the opposite of the current confirmed state; the direction
 *   is resolved server-side, never guessed here.
 * - promptForValue: asks for a value (setpoints) — entering one and sending
 *   is itself the confirmation, so confirmationRequired is not applied on
 *   top of it.
 * - confirmationRequired (no prompt, no toggle): plain "are you sure" dialog.
 * - neither: issues immediately.
 */
export function CommandButton({
  command,
  onIssue,
  disabled,
  statusValue,
  variant = "chip",
  rowLabel,
  rowValue,
  rowUnit,
}: Props) {
  const [valueOpen, setValueOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [value, setValue] = useState("")

  const isToggle = command.offValue != null
  const isOn = isToggle && statusValue != null && statusValue > 0
  const isUnknown = isToggle && (statusValue == null)

  const handleClick = () => {
    if (command.promptForValue) {
      setValue("")
      setValueOpen(true)
    } else if (command.confirmationRequired) {
      setConfirmOpen(true)
    } else {
      onIssue(command.id)
    }
  }

  const sendValue = () => {
    if (value === "" || Number.isNaN(Number(value))) return
    onIssue(command.id, Number(value))
    setValueOpen(false)
  }

  if (isToggle) {
    const label = isUnknown ? `${command.name} — Unknown` : `${command.name} ${isOn ? "ON" : "OFF"}`
    const nextAction = isOn ? "OFF" : "ON"

    return (
      <>
        {variant === "switch" ? (
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors disabled:pointer-events-none disabled:opacity-50",
              isOn && "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15",
              !isUnknown && !isOn && "border-destructive/30 bg-destructive/10 hover:bg-destructive/15",
              isUnknown && "border-border bg-muted/40 hover:bg-muted/60"
            )}
          >
            <span
              className={cn(
                "text-sm font-semibold",
                isOn ? "text-emerald-400" : !isUnknown ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {command.name}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {isUnknown ? "Unknown" : isOn ? "ON" : "OFF"}
              </span>
            </span>
            <span
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300",
                isOn ? "bg-emerald-500" : !isUnknown ? "bg-destructive/50" : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "inline-block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform duration-300 motion-reduce:transition-none",
                  isOn && "translate-x-5.5"
                )}
              />
            </span>
          </button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleClick}
            disabled={disabled}
            className={cn(
              isOn && "border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-400",
              !isUnknown && !isOn && "border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/25 hover:text-destructive"
            )}
          >
            <Zap className="mr-1.5 size-3" />
            {label}
          </Button>
        )}

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Turn {command.name} {nextAction}?</AlertDialogTitle>
              <AlertDialogDescription>
                {isUnknown
                  ? `Current state is unknown — this will send ${nextAction}.`
                  : `Currently ${isOn ? "ON" : "OFF"}. This will send ${nextAction}.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onIssue(command.id)
                  setConfirmOpen(false)
                }}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  return (
    <>
      {variant === "row" ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className="group flex w-full items-center justify-between gap-2 rounded-md border border-sky-500/15 bg-sky-500/5 px-2 py-1.5 text-left transition-colors hover:border-sky-500/40 hover:bg-sky-500/10 disabled:pointer-events-none disabled:opacity-50"
        >
          <span className="truncate text-sm text-muted-foreground">{rowLabel ?? command.name}</span>
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-sm font-medium tabular-nums text-sky-400">
            {rowValue ?? "—"}
            {rowUnit && rowValue && rowValue !== "—" ? (
              <span className="font-sans font-normal text-sky-400/70">{rowUnit}</span>
            ) : null}
            <SquarePen className="size-3 text-sky-400/60 transition-opacity group-hover:text-sky-400" />
          </span>
        </button>
      ) : (
        <Button size="sm" variant="outline" onClick={handleClick} disabled={disabled}>
          <Zap className="mr-1.5 size-3" />
          {command.name}
        </Button>
      )}

      <Dialog open={valueOpen} onOpenChange={setValueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{command.name}</DialogTitle>
            {command.description && <DialogDescription>{command.description}</DialogDescription>}
          </DialogHeader>
          <div className="py-2">
            <Field>
              <FieldLabel htmlFor={`cmdval-${command.id}`}>Value</FieldLabel>
              <Input
                id={`cmdval-${command.id}`}
                type="number"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendValue()}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValueOpen(false)}>Cancel</Button>
            <Button onClick={sendValue} disabled={value === "" || Number.isNaN(Number(value))}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Command</AlertDialogTitle>
            <AlertDialogDescription>
              Send <strong>{command.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onIssue(command.id)
                setConfirmOpen(false)
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
