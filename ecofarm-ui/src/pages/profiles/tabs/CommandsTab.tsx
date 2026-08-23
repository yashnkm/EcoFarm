import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus } from "lucide-react"

import { commandTemplatesApi, dataPointsApi, type CommandTemplateBody } from "@/api/deviceProfiles"
import { classifyCommand } from "@/pages/dashboard/sectionParams"
import { ROLES, CATEGORIES, CATEGORY_LABELS } from "./commandConstants"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { DeleteConfirm } from "@/components/DeleteConfirm"
import { EditButton } from "@/components/EditButton"
import { CloneButton } from "@/components/CloneButton"
import type { CommandTemplate } from "@/types/api"

// Same labels, extended with the SECTION group classifyCommand() can also
// return (toggle commands) — used to describe a command's live-dashboard
// grouping in the admin table, matching classifyCommand's own fallback
// logic exactly (so a legacy command classified via its name still shows
// correctly here, not just ones with an explicit category set).
const GROUP_LABELS: Record<"TEMPERATURE" | "FOGGING" | "SECTION" | "OTHER", string> = {
  ...CATEGORY_LABELS,
  SECTION: "Section control",
}
const NO_STATUS_POINT = "__none__"
type CreateMode = "toggle" | "value"

const sharedFields = {
  name: z.string().min(1),
  key: z.string().min(1),
  description: z.string().optional(),
  registerNumber: z.coerce.number().int().min(0),
  functionCode: z.coerce.number().int().min(1).max(127),
  confirmationRequired: z.boolean().optional(),
  minRole: z.enum(ROLES),
}

// Toggle — one command, one register, two values. Which one actually gets
// sent is resolved server-side from statusDataPointKey's latest reading, so
// the UI can show a single button that flips state instead of two commands.
const toggleSchema = z.object({
  ...sharedFields,
  onValue: z.coerce.number().int(),
  offValue: z.coerce.number().int(),
  statusDataPointKey: z.string().optional(),
})
type ToggleValues = z.infer<typeof toggleSchema>

// Value-entry — a single command where the operator supplies the value at
// send-time (setpoints), instead of a value fixed at creation. Category
// decides which group it renders in on the live dashboard — asked directly
// here instead of guessed from the name. statusDataPointKey (same field
// toggles use) links it to the readback point that confirms the setpoint
// actually took — without it, the dashboard falls back to guessing the
// link from name text, same fragility the category field just replaced.
// scaleFactor/offset/unit mirror a data point's own conversion, but in
// reverse: the operator types a real engineering value (e.g. 30 seconds),
// and the server converts it to the raw register write — the same
// "raw = (entered - offset) / scale" math DataPoint decoding already does
// the other direction.
const valueSchema = z.object({
  ...sharedFields,
  category: z.enum(CATEGORIES),
  statusDataPointKey: z.string().optional(),
  scaleFactor: z.coerce.number().refine((v) => v !== 0, "Scale factor cannot be zero"),
  offset: z.coerce.number(),
  unit: z.string().optional(),
})
type ValueValues = z.infer<typeof valueSchema>

// Editing covers all three kinds through one superset schema — only the
// fields relevant to the command being edited are shown. key is optional
// here (unlike creating) so commands from before this field existed can
// still be edited without being forced to backfill one.
const editSchema = z.object({
  ...sharedFields,
  key: z.string().optional(),
  value: z.coerce.number().int(),
  offValue: z.coerce.number().int().optional(),
  statusDataPointKey: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
  scaleFactor: z.coerce.number().refine((v) => v !== 0, "Scale factor cannot be zero").optional(),
  offset: z.coerce.number().optional(),
  unit: z.string().optional(),
})
type EditValues = z.infer<typeof editSchema>

export function CommandsTab({ profileId }: { profileId: string }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CommandTemplate | null>(null)
  const [createMode, setCreateMode] = useState<CreateMode>("toggle")
  const queryClient = useQueryClient()

  const { data: commands, isLoading } = useQuery({
    queryKey: ["commands", profileId],
    queryFn: () => commandTemplatesApi.list(profileId),
  })
  const { data: dataPoints = [] } = useQuery({
    queryKey: ["data-points", profileId],
    queryFn: () => dataPointsApi.list(profileId),
  })

  const toggleForm = useForm<ToggleValues>({
    resolver: zodResolver(toggleSchema) as Resolver<ToggleValues>,
    defaultValues: { minRole: "OPERATOR", functionCode: 6, confirmationRequired: false, onValue: 1, offValue: 0 },
  })
  const toggleRole = toggleForm.watch("minRole")
  const toggleStatusKey = toggleForm.watch("statusDataPointKey")

  const valueForm = useForm<ValueValues>({
    resolver: zodResolver(valueSchema) as Resolver<ValueValues>,
    defaultValues: { minRole: "OPERATOR", functionCode: 6, confirmationRequired: false, category: "OTHER", scaleFactor: 1, offset: 0 },
  })
  const valueRole = valueForm.watch("minRole")
  const valueCategory = valueForm.watch("category")
  const valueStatusKey = valueForm.watch("statusDataPointKey")

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema) as Resolver<EditValues>,
    defaultValues: { minRole: "OPERATOR", functionCode: 6, confirmationRequired: true },
  })
  const editRole = editForm.watch("minRole")
  const editStatusKey = editForm.watch("statusDataPointKey")
  const editCategory = editForm.watch("category")

  const invalidateAndClose = (message: string) => {
    queryClient.invalidateQueries({ queryKey: ["commands", profileId] })
    toast.success(message)
    closeDialog()
  }
  const onCreateError = (err: { response?: { data?: { message?: string } } }) =>
    toast.error(err.response?.data?.message ?? "Failed to create command")

  const createToggleMutation = useMutation({
    mutationFn: (values: ToggleValues) => {
      const { onValue, offValue, statusDataPointKey, ...rest } = values
      return commandTemplatesApi.create(profileId, {
        ...rest,
        value: onValue,
        offValue,
        statusDataPointKey: statusDataPointKey === NO_STATUS_POINT ? undefined : statusDataPointKey,
      })
    },
    onSuccess: () => invalidateAndClose("Toggle command created"),
    onError: onCreateError,
  })

  const createValueMutation = useMutation({
    mutationFn: (values: ValueValues) => {
      const { statusDataPointKey, ...rest } = values
      return commandTemplatesApi.create(profileId, {
        ...rest,
        value: 0,
        promptForValue: true,
        statusDataPointKey: statusDataPointKey === NO_STATUS_POINT ? undefined : statusDataPointKey,
      })
    },
    onSuccess: () => invalidateAndClose("Command created"),
    onError: onCreateError,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: CommandTemplateBody }) =>
      commandTemplatesApi.update(profileId, id, body),
    onSuccess: () => invalidateAndClose("Command updated"),
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => commandTemplatesApi.delete(profileId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commands", profileId] })
      toast.success("Command deleted")
    },
  })

  const openCreate = () => {
    setEditing(null)
    setCreateMode("toggle")
    toggleForm.reset({
      name: "",
      key: "",
      description: "",
      registerNumber: 0,
      functionCode: 6,
      onValue: 1,
      offValue: 0,
      statusDataPointKey: NO_STATUS_POINT,
      confirmationRequired: false,
      minRole: "OPERATOR",
    })
    valueForm.reset({
      name: "",
      key: "",
      description: "",
      registerNumber: 0,
      functionCode: 6,
      confirmationRequired: false,
      minRole: "OPERATOR",
      category: "OTHER",
      statusDataPointKey: NO_STATUS_POINT,
      scaleFactor: 1,
      offset: 0,
      unit: "",
    })
    setOpen(true)
  }
  const openEdit = (c: CommandTemplate) => {
    setEditing(c)
    editForm.reset({
      name: c.name,
      key: c.key ?? "",
      description: c.description ?? "",
      registerNumber: c.registerNumber,
      functionCode: c.functionCode,
      value: c.value,
      offValue: c.offValue ?? undefined,
      statusDataPointKey: c.statusDataPointKey ?? NO_STATUS_POINT,
      confirmationRequired: c.confirmationRequired,
      minRole: c.minRole as EditValues["minRole"],
      category: c.category ?? "OTHER",
      scaleFactor: Number(c.scaleFactor),
      offset: Number(c.offset),
      unit: c.unit ?? "",
    })
    setOpen(true)
  }
  // Same dialog as "Add command", pre-filled from an existing one and
  // switched to the matching mode — everything carried over except name,
  // which has to be unique, so it starts blank instead of colliding on save.
  const openClone = (c: CommandTemplate) => {
    setEditing(null)
    const isToggle = c.offValue != null
    setCreateMode(isToggle ? "toggle" : "value")
    if (isToggle) {
      toggleForm.reset({
        name: "",
        key: "",
        description: c.description ?? "",
        registerNumber: c.registerNumber,
        functionCode: c.functionCode,
        onValue: c.value,
        offValue: c.offValue!,
        statusDataPointKey: c.statusDataPointKey ?? NO_STATUS_POINT,
        confirmationRequired: c.confirmationRequired,
        minRole: c.minRole as ToggleValues["minRole"],
      })
    } else {
      valueForm.reset({
        name: "",
        key: "",
        description: c.description ?? "",
        registerNumber: c.registerNumber,
        functionCode: c.functionCode,
        confirmationRequired: c.confirmationRequired,
        minRole: c.minRole as ValueValues["minRole"],
        category: c.category ?? "OTHER",
        statusDataPointKey: c.statusDataPointKey ?? NO_STATUS_POINT,
        scaleFactor: Number(c.scaleFactor),
        offset: Number(c.offset),
        unit: c.unit ?? "",
      })
    }
    setOpen(true)
  }
  const closeDialog = () => {
    setOpen(false)
    setEditing(null)
    toggleForm.reset()
    valueForm.reset()
    editForm.reset()
  }

  const onSubmitEdit = (d: EditValues) => {
    if (!editing) return
    const isToggle = editing.offValue != null
    updateMutation.mutateAsync({
      id: editing.id,
      body: {
        ...d,
        offValue: isToggle ? d.offValue : undefined,
        statusDataPointKey: d.statusDataPointKey !== NO_STATUS_POINT ? d.statusDataPointKey : undefined,
        category: isToggle ? undefined : d.category,
        scaleFactor: isToggle ? undefined : d.scaleFactor,
        offset: isToggle ? undefined : d.offset,
        unit: isToggle ? undefined : d.unit,
      },
    })
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}><Plus data-icon="inline-start" />Add command</Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent>
          {editing ? (
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)}>
              <DialogHeader>
                <DialogTitle>Edit &quot;{editing.name}&quot;</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field data-invalid={editForm.formState.errors.name ? true : undefined}>
                    <FieldLabel htmlFor="ename">Name</FieldLabel>
                    <Input id="ename" placeholder="Section-3" {...editForm.register("name")} />
                    {editForm.formState.errors.name && <FieldError>{editForm.formState.errors.name.message}</FieldError>}
                  </Field>
                  <Field data-invalid={editForm.formState.errors.key ? true : undefined}>
                    <FieldLabel htmlFor="ekey">Key</FieldLabel>
                    <Input id="ekey" placeholder="section_3" {...editForm.register("key")} />
                    {!editing?.key && (
                      <FieldDescription>Created before keys existed — set one now, or leave blank to keep it unset.</FieldDescription>
                    )}
                    {editForm.formState.errors.key && <FieldError>{editForm.formState.errors.key.message}</FieldError>}
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="edesc">Description</FieldLabel>
                  <Input id="edesc" placeholder="Activates the section relay" {...editForm.register("description")} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field data-invalid={editForm.formState.errors.registerNumber ? true : undefined}>
                    <FieldLabel htmlFor="ereg">Register</FieldLabel>
                    <Input id="ereg" type="number" {...editForm.register("registerNumber")} />
                  </Field>
                  <Field data-invalid={editForm.formState.errors.functionCode ? true : undefined}>
                    <FieldLabel htmlFor="efc">Function code</FieldLabel>
                    <Input id="efc" type="number" {...editForm.register("functionCode")} />
                  </Field>
                </div>

                {editing.offValue != null ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Field data-invalid={editForm.formState.errors.value ? true : undefined}>
                        <FieldLabel htmlFor="eonval">On value</FieldLabel>
                        <Input id="eonval" type="number" {...editForm.register("value")} />
                      </Field>
                      <Field data-invalid={editForm.formState.errors.offValue ? true : undefined}>
                        <FieldLabel htmlFor="eoffval">Off value</FieldLabel>
                        <Input id="eoffval" type="number" {...editForm.register("offValue")} />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel>Status data point</FieldLabel>
                      <Select
                        value={editStatusKey ?? NO_STATUS_POINT}
                        onValueChange={(v) => editForm.setValue("statusDataPointKey", v ?? NO_STATUS_POINT)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value={NO_STATUS_POINT}>None — always shows Unknown</SelectItem>
                            {dataPoints.map((dp) => (
                              <SelectItem key={dp.key} value={dp.key}>{dp.label} ({dp.key})</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Which reading tells the button whether this is currently on.
                      </FieldDescription>
                    </Field>
                  </>
                ) : (
                  <>
                    <Field data-invalid={editForm.formState.errors.value ? true : undefined}>
                      <FieldLabel htmlFor="eval">Value</FieldLabel>
                      <Input id="eval" type="number" {...editForm.register("value")} disabled={editing.promptForValue} />
                      {editing.promptForValue && (
                        <FieldDescription>
                          This command asks the operator for a value each time it&apos;s sent — the value above is unused.
                        </FieldDescription>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel>Category</FieldLabel>
                      <Select
                        value={editCategory ?? "OTHER"}
                        onValueChange={(v) => editForm.setValue("category", v as EditValues["category"])}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Which group this shows in on the live dashboard once assigned to a section.
                      </FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel>Status data point</FieldLabel>
                      <Select
                        value={editStatusKey ?? NO_STATUS_POINT}
                        onValueChange={(v) => editForm.setValue("statusDataPointKey", v ?? NO_STATUS_POINT)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value={NO_STATUS_POINT}>None</SelectItem>
                            {dataPoints.map((dp) => (
                              <SelectItem key={dp.key} value={dp.key}>{dp.label} ({dp.key})</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Which reading confirms this setpoint's real current value — shown inline and kept in sync
                        with the PLC, instead of relying on the command name to guess a match.
                      </FieldDescription>
                    </Field>

                    <div className="grid grid-cols-3 gap-4">
                      <Field data-invalid={editForm.formState.errors.scaleFactor ? true : undefined}>
                        <FieldLabel htmlFor="escale">Scale</FieldLabel>
                        <Input id="escale" type="number" step="any" {...editForm.register("scaleFactor")} />
                        {editForm.formState.errors.scaleFactor && (
                          <FieldError>{editForm.formState.errors.scaleFactor.message}</FieldError>
                        )}
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="eoffset">Offset</FieldLabel>
                        <Input id="eoffset" type="number" step="any" {...editForm.register("offset")} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="eunit">Unit</FieldLabel>
                        <Input id="eunit" placeholder="Seconds" {...editForm.register("unit")} />
                      </Field>
                    </div>
                    <FieldDescription>
                      The value an operator types is real-world (e.g. 30 seconds) — sent to the PLC as
                      (value − offset) ÷ scale.
                    </FieldDescription>
                  </>
                )}

                <Field>
                  <FieldLabel>Minimum role</FieldLabel>
                  <Select value={editRole} onValueChange={(v) => editForm.setValue("minRole", v as EditValues["minRole"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...editForm.register("confirmationRequired")} className="size-4" />
                  Require confirmation before sending
                </label>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={editForm.formState.isSubmitting}>Save</Button>
              </DialogFooter>
            </form>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Add command</DialogTitle>
              </DialogHeader>

              <div className="flex gap-1 rounded-lg border p-1">
                <button
                  type="button"
                  onClick={() => setCreateMode("toggle")}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    createMode === "toggle" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Toggle button
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode("value")}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    createMode === "value" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Value entry (setpoint)
                </button>
              </div>

              {createMode === "toggle" ? (
                <form onSubmit={toggleForm.handleSubmit((d) => createToggleMutation.mutateAsync(d))}>
                  <div className="flex flex-col gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field data-invalid={toggleForm.formState.errors.name ? true : undefined}>
                        <FieldLabel htmlFor="cname">Name</FieldLabel>
                        <Input id="cname" placeholder="Section-3" {...toggleForm.register("name")} />
                        {toggleForm.formState.errors.name && <FieldError>{toggleForm.formState.errors.name.message}</FieldError>}
                      </Field>
                      <Field data-invalid={toggleForm.formState.errors.key ? true : undefined}>
                        <FieldLabel htmlFor="ckey">Key</FieldLabel>
                        <Input id="ckey" placeholder="section_3" {...toggleForm.register("key")} />
                        {toggleForm.formState.errors.key && <FieldError>{toggleForm.formState.errors.key.message}</FieldError>}
                      </Field>
                    </div>
                    <FieldDescription className="-mt-2">
                      Creates one command, shown as a single button — green &quot;{toggleForm.watch("name") || "Section-3"} ON&quot; or red &quot;{toggleForm.watch("name") || "Section-3"} OFF&quot; depending on live status.
                    </FieldDescription>

                    <Field>
                      <FieldLabel htmlFor="cdesc">Description</FieldLabel>
                      <Input id="cdesc" placeholder="Activates the section relay" {...toggleForm.register("description")} />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <Field data-invalid={toggleForm.formState.errors.registerNumber ? true : undefined}>
                        <FieldLabel htmlFor="creg">Register</FieldLabel>
                        <Input id="creg" type="number" {...toggleForm.register("registerNumber")} />
                      </Field>
                      <Field data-invalid={toggleForm.formState.errors.functionCode ? true : undefined}>
                        <FieldLabel htmlFor="cfc">Function code</FieldLabel>
                        <Input id="cfc" type="number" {...toggleForm.register("functionCode")} />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Field data-invalid={toggleForm.formState.errors.onValue ? true : undefined}>
                        <FieldLabel htmlFor="onval">On value</FieldLabel>
                        <Input id="onval" type="number" {...toggleForm.register("onValue")} />
                      </Field>
                      <Field data-invalid={toggleForm.formState.errors.offValue ? true : undefined}>
                        <FieldLabel htmlFor="offval">Off value</FieldLabel>
                        <Input id="offval" type="number" {...toggleForm.register("offValue")} />
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel>Status data point</FieldLabel>
                      <Select
                        value={toggleStatusKey ?? NO_STATUS_POINT}
                        onValueChange={(v) => toggleForm.setValue("statusDataPointKey", v ?? NO_STATUS_POINT)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value={NO_STATUS_POINT}>None — always shows Unknown</SelectItem>
                            {dataPoints.map((dp) => (
                              <SelectItem key={dp.key} value={dp.key}>{dp.label} ({dp.key})</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Which reading tells the button whether this is currently on — e.g. Fan-3 status.
                      </FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel>Minimum role</FieldLabel>
                      <Select value={toggleRole} onValueChange={(v) => toggleForm.setValue("minRole", v as ToggleValues["minRole"])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>

                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" {...toggleForm.register("confirmationRequired")} className="size-4" />
                      Require confirmation before sending
                    </label>
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={toggleForm.formState.isSubmitting}>Create</Button>
                  </DialogFooter>
                </form>
              ) : (
                <form onSubmit={valueForm.handleSubmit((d) => createValueMutation.mutateAsync(d))}>
                  <div className="flex flex-col gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field data-invalid={valueForm.formState.errors.name ? true : undefined}>
                        <FieldLabel htmlFor="vname">Name</FieldLabel>
                        <Input id="vname" placeholder="Set1" {...valueForm.register("name")} />
                        {valueForm.formState.errors.name && <FieldError>{valueForm.formState.errors.name.message}</FieldError>}
                      </Field>
                      <Field data-invalid={valueForm.formState.errors.key ? true : undefined}>
                        <FieldLabel htmlFor="vkey">Key</FieldLabel>
                        <Input id="vkey" placeholder="set1" {...valueForm.register("key")} />
                        {valueForm.formState.errors.key && <FieldError>{valueForm.formState.errors.key.message}</FieldError>}
                      </Field>
                    </div>
                    <FieldDescription className="-mt-2">
                      Creates one command. Sending it asks for a value each time — nothing fixed at creation.
                    </FieldDescription>

                    <Field>
                      <FieldLabel htmlFor="vdesc">Description</FieldLabel>
                      <Input id="vdesc" placeholder="Temperature setpoint 1" {...valueForm.register("description")} />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <Field data-invalid={valueForm.formState.errors.registerNumber ? true : undefined}>
                        <FieldLabel htmlFor="vreg">Register</FieldLabel>
                        <Input id="vreg" type="number" {...valueForm.register("registerNumber")} />
                      </Field>
                      <Field data-invalid={valueForm.formState.errors.functionCode ? true : undefined}>
                        <FieldLabel htmlFor="vfc">Function code</FieldLabel>
                        <Input id="vfc" type="number" {...valueForm.register("functionCode")} />
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel>Category</FieldLabel>
                      <Select
                        value={valueCategory}
                        onValueChange={(v) => valueForm.setValue("category", v as ValueValues["category"])}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Which group this shows in on the live dashboard once assigned to a section.
                      </FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel>Status data point</FieldLabel>
                      <Select
                        value={valueStatusKey ?? NO_STATUS_POINT}
                        onValueChange={(v) => valueForm.setValue("statusDataPointKey", v ?? NO_STATUS_POINT)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value={NO_STATUS_POINT}>None</SelectItem>
                            {dataPoints.map((dp) => (
                              <SelectItem key={dp.key} value={dp.key}>{dp.label} ({dp.key})</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Which reading confirms this setpoint's real current value — shown inline and kept in sync
                        with the PLC, instead of relying on the command name to guess a match.
                      </FieldDescription>
                    </Field>

                    <div className="grid grid-cols-3 gap-4">
                      <Field data-invalid={valueForm.formState.errors.scaleFactor ? true : undefined}>
                        <FieldLabel htmlFor="vscale">Scale</FieldLabel>
                        <Input id="vscale" type="number" step="any" {...valueForm.register("scaleFactor")} />
                        {valueForm.formState.errors.scaleFactor && (
                          <FieldError>{valueForm.formState.errors.scaleFactor.message}</FieldError>
                        )}
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="voffset">Offset</FieldLabel>
                        <Input id="voffset" type="number" step="any" {...valueForm.register("offset")} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="vunit">Unit</FieldLabel>
                        <Input id="vunit" placeholder="Seconds" {...valueForm.register("unit")} />
                      </Field>
                    </div>
                    <FieldDescription>
                      The value an operator types is real-world (e.g. 30 seconds) — sent to the PLC as
                      (value − offset) ÷ scale. Leave scale as 1 and offset as 0 if the register already
                      stores the raw value directly.
                    </FieldDescription>

                    <Field>
                      <FieldLabel>Minimum role</FieldLabel>
                      <Select value={valueRole} onValueChange={(v) => valueForm.setValue("minRole", v as ValueValues["minRole"])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>

                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" {...valueForm.register("confirmationRequired")} className="size-4" />
                      Require confirmation before sending
                    </label>
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={valueForm.formState.isSubmitting}>Create</Button>
                  </DialogFooter>
                </form>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !commands?.length ? (
        <p className="text-sm text-muted-foreground">No commands. Add one to expose a named action on devices.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Register</TableHead>
                <TableHead>FC</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status point</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Min role</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commands.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{c.key ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.description ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{c.registerNumber}</TableCell>
                  <TableCell>{c.functionCode}</TableCell>
                  <TableCell>
                    {c.promptForValue ? (
                      <Badge variant="outline" className="text-xs">entered on send</Badge>
                    ) : c.offValue != null ? (
                      <span className="font-mono text-xs">{c.value} / {c.offValue}</span>
                    ) : (
                      c.value
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {c.statusDataPointKey ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {GROUP_LABELS[classifyCommand(c)]}
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{c.minRole}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <CloneButton onClick={() => openClone(c)} />
                      <EditButton onClick={() => openEdit(c)} />
                      <DeleteConfirm onConfirm={() => deleteMutation.mutate(c.id)} title={`Delete "${c.name}"?`} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
