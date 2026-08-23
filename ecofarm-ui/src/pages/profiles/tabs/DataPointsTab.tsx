import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus } from "lucide-react"

import { dataPointsApi, pollGroupsApi, commandTemplatesApi, type DataPointBody, type CommandTemplateBody } from "@/api/deviceProfiles"
import { ROLES, CATEGORIES, CATEGORY_LABELS } from "./commandConstants"
import { cn, naturalCompare } from "@/lib/utils"
import { useSortFilter } from "@/lib/tableSortFilter"
import { SortableHead } from "@/components/SortableHead"
import { TableFilterInput } from "@/components/TableFilterInput"
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
import { Separator } from "@/components/ui/separator"
import { DeleteConfirm } from "@/components/DeleteConfirm"
import { EditButton } from "@/components/EditButton"
import { CloneButton } from "@/components/CloneButton"
import type { DataPoint } from "@/types/api"

const DATA_TYPES = ["UINT16", "INT16", "UINT32", "INT32", "FLOAT32", "ASCII", "BOOLEAN"] as const
const WIDGETS = ["NUMBER", "GAUGE", "BOOLEAN_TOGGLE", "BOOLEAN_DISPLAY", "STATUS_BADGE"] as const
const BYTE_ORDERS = ["BIG_ENDIAN", "LITTLE_ENDIAN"] as const
const MODES = ["readOnly", "readWrite"] as const
type Mode = (typeof MODES)[number]

// One dialog covers both cases so creating a controllable point (read +
// write) doesn't mean visiting Data Points, then Commands, then hunting
// this same point back down in a "status data point" dropdown to link
// them. Read & Write mode collects the write/command fields inline and
// creates both records in one go, already linked via statusDataPointKey.
// Which write shape to ask for isn't a separate question — it follows the
// data type that's already been picked: BOOLEAN gets Toggle fields
// (on/off values), anything else gets Setpoint fields (scale/offset/unit
// + category), mirroring the two create modes Commands already has.
const schema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  registerNumber: z.coerce.number().int().min(0),
  dataType: z.enum(DATA_TYPES),
  wordCount: z.coerce.number().int().min(1).max(4),
  byteOrder: z.enum(BYTE_ORDERS),
  scaleFactor: z.coerce.number(),
  offset: z.coerce.number(),
  unit: z.string().optional(),
  displayWidget: z.enum(WIDGETS),
  pollGroupId: z.string().min(1, "Poll group is required"),
  falseLabel: z.string().max(100).optional(),
  trueLabel: z.string().max(100).optional(),

  mode: z.enum(MODES),
  writeRegisterNumber: z.coerce.number().int().min(0).optional(),
  commandFunctionCode: z.coerce.number().int().min(1).max(127).optional(),
  onValue: z.coerce.number().int().optional(),
  offValue: z.coerce.number().int().optional(),
  category: z.enum(CATEGORIES).optional(),
  writeScaleFactor: z.coerce.number().optional(),
  writeOffset: z.coerce.number().optional(),
  writeUnit: z.string().optional(),
  minRole: z.enum(ROLES).optional(),
  confirmationRequired: z.boolean().optional(),
}).superRefine((d, ctx) => {
  if (d.mode !== "readWrite") return
  if (d.writeRegisterNumber == null) ctx.addIssue({ path: ["writeRegisterNumber"], code: z.ZodIssueCode.custom, message: "Required" })
  if (d.commandFunctionCode == null) ctx.addIssue({ path: ["commandFunctionCode"], code: z.ZodIssueCode.custom, message: "Required" })
  if (d.dataType === "BOOLEAN") {
    if (d.onValue == null) ctx.addIssue({ path: ["onValue"], code: z.ZodIssueCode.custom, message: "Required" })
    if (d.offValue == null) ctx.addIssue({ path: ["offValue"], code: z.ZodIssueCode.custom, message: "Required" })
  } else {
    if (!d.category) ctx.addIssue({ path: ["category"], code: z.ZodIssueCode.custom, message: "Required" })
    if (d.writeScaleFactor == null || d.writeScaleFactor === 0) {
      ctx.addIssue({ path: ["writeScaleFactor"], code: z.ZodIssueCode.custom, message: "Cannot be zero" })
    }
  }
})
type FormValues = z.infer<typeof schema>

export function DataPointsTab({ profileId }: { profileId: string }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DataPoint | null>(null)
  const queryClient = useQueryClient()

  const { data: points, isLoading } = useQuery({
    queryKey: ["data-points", profileId],
    queryFn: () => dataPointsApi.list(profileId),
  })
  const { data: groups } = useQuery({
    queryKey: ["poll-groups", profileId],
    queryFn: () => pollGroupsApi.list(profileId),
  })
  // Same query key CommandsTab uses — react-query shares the cache, so this
  // doesn't cost an extra fetch, it just lets this tab show which points
  // already have a linked command.
  const { data: commands = [] } = useQuery({
    queryKey: ["commands", profileId],
    queryFn: () => commandTemplatesApi.list(profileId),
  })
  const linkedCommandFor = (key: string) => commands.find((c) => c.statusDataPointKey === key)

  const { filter, setFilter, sort, toggleSort, result: filteredPoints } = useSortFilter(
    points ?? [],
    (dp, q) => dp.label.toLowerCase().includes(q) || dp.key.toLowerCase().includes(q),
    {
      label: (a, b) => naturalCompare(a.label, b.label),
      key: (a, b) => naturalCompare(a.key, b.key),
      registerNumber: (a, b) => a.registerNumber - b.registerNumber,
      dataType: (a, b) => naturalCompare(a.dataType, b.dataType),
      unit: (a, b) => naturalCompare(a.unit ?? "", b.unit ?? ""),
      mode: (a, b) => Number(!!linkedCommandFor(a.key)) - Number(!!linkedCommandFor(b.key)),
    }
  )

  const WRITE_DEFAULTS = {
    mode: "readOnly" as Mode,
    writeRegisterNumber: 0, commandFunctionCode: 6,
    onValue: 1, offValue: 0, category: "OTHER" as const,
    writeScaleFactor: 1, writeOffset: 0, writeUnit: "",
    minRole: "OPERATOR" as const, confirmationRequired: false,
  }

  const { register, handleSubmit, reset, setValue, watch, getValues, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema) as Resolver<FormValues>,
      defaultValues: {
        dataType: "UINT16", wordCount: 1, byteOrder: "BIG_ENDIAN",
        scaleFactor: 1, offset: 0, displayWidget: "NUMBER",
        ...WRITE_DEFAULTS,
      },
    })
  const key = watch("key")
  const label = watch("label")
  const dataType = watch("dataType")
  const byteOrder = watch("byteOrder")
  const widget = watch("displayWidget")
  const pollGroupId = watch("pollGroupId")
  const mode = watch("mode")
  const category = watch("category")
  const minRole = watch("minRole")
  const isBoolean = dataType === "BOOLEAN"
  const isReadWrite = mode === "readWrite" && !editing

  // Flipping to Read & Write seeds the command fields from what's already
  // been typed on the read side (same register, same units is the common
  // case) — a one-time starting point, not a re-sync, so it never fights
  // edits made after switching. Name and key always mirror the data point
  // exactly (not just seeded) — enforced at submit time, not editable here.
  const switchMode = (next: Mode) => {
    setValue("mode", next)
    if (next === "readWrite") {
      const v = getValues()
      setValue("writeRegisterNumber", v.registerNumber)
      setValue("writeScaleFactor", v.scaleFactor)
      setValue("writeOffset", v.offset)
      setValue("writeUnit", v.unit)
    }
  }

  const createMutation = useMutation({
    mutationFn: (body: DataPointBody) => dataPointsApi.create(profileId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-points", profileId] })
      toast.success("Data point created")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  // Read & Write: create the data point, then the command that controls
  // it, linked via statusDataPointKey — the two API calls the admin used
  // to make by hand (Data Points, then Commands, then find-and-select the
  // point in a dropdown), done together from one submit.
  const createReadWriteMutation = useMutation({
    mutationFn: async ({ dpBody, values }: { dpBody: DataPointBody; values: FormValues }) => {
      let dp: DataPoint
      try {
        dp = await dataPointsApi.create(profileId, dpBody)
      } catch (err) {
        const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Failed to create the data point"
        throw new Error(message)
      }
      const isToggle = values.dataType === "BOOLEAN"
      const cmdBody: CommandTemplateBody = {
        name: dp.label,
        // Same key as the data point it controls — one identifier for both
        // halves of the pair, not just linked via statusDataPointKey.
        key: dp.key,
        registerNumber: values.writeRegisterNumber!,
        functionCode: values.commandFunctionCode!,
        value: isToggle ? values.onValue! : 0,
        promptForValue: !isToggle,
        offValue: isToggle ? values.offValue : undefined,
        statusDataPointKey: dp.key,
        category: isToggle ? undefined : values.category,
        scaleFactor: isToggle ? undefined : values.writeScaleFactor,
        offset: isToggle ? undefined : values.writeOffset,
        unit: isToggle ? undefined : values.writeUnit,
        minRole: values.minRole,
        confirmationRequired: values.confirmationRequired,
      }
      try {
        await commandTemplatesApi.create(profileId, cmdBody)
      } catch (err) {
        const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "unknown error"
        // The data point already exists at this point — say so, instead of
        // reading like the whole thing silently failed.
        throw new Error(
          `Data point "${dp.label}" was created, but its command failed (${message}). ` +
          `Add the command manually from the Commands tab and link it to "${dp.key}".`
        )
      }
      return dp
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-points", profileId] })
      queryClient.invalidateQueries({ queryKey: ["commands", profileId] })
      toast.success("Point created — data point and command linked")
      closeDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: DataPointBody }) =>
      dataPointsApi.update(profileId, id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-points", profileId] })
      toast.success("Data point updated")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dataPointsApi.delete(profileId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-points", profileId] })
      toast.success("Data point deleted")
    },
  })

  const openCreate = () => {
    setEditing(null)
    reset({
      key: "", label: "", registerNumber: 0,
      dataType: "UINT16", wordCount: 1, byteOrder: "BIG_ENDIAN",
      scaleFactor: 1, offset: 0, unit: "", displayWidget: "NUMBER",
      pollGroupId: "", falseLabel: "", trueLabel: "",
      ...WRITE_DEFAULTS,
    })
    setOpen(true)
  }
  const openEdit = (dp: DataPoint) => {
    setEditing(dp)
    reset({
      key: dp.key, label: dp.label,
      registerNumber: dp.registerNumber,
      dataType: dp.dataType as FormValues["dataType"],
      wordCount: dp.wordCount,
      byteOrder: dp.byteOrder as FormValues["byteOrder"],
      scaleFactor: Number(dp.scaleFactor),
      offset: Number(dp.offset),
      unit: dp.unit ?? "",
      displayWidget: dp.displayWidget as FormValues["displayWidget"],
      pollGroupId: dp.pollGroupId,
      falseLabel: dp.falseLabel ?? "",
      trueLabel: dp.trueLabel ?? "",
      ...WRITE_DEFAULTS,
    })
    setOpen(true)
  }
  // Same dialog as "Add", pre-filled from an existing point — everything
  // carried over except key/label, which have to be distinct, so those
  // start blank instead of silently duplicating (and colliding on save).
  // Cloning always starts in Read only — flip the toggle after if the
  // clone should get its own command too.
  const openClone = (dp: DataPoint) => {
    setEditing(null)
    reset({
      key: "", label: "",
      registerNumber: dp.registerNumber,
      dataType: dp.dataType as FormValues["dataType"],
      wordCount: dp.wordCount,
      byteOrder: dp.byteOrder as FormValues["byteOrder"],
      scaleFactor: Number(dp.scaleFactor),
      offset: Number(dp.offset),
      unit: dp.unit ?? "",
      displayWidget: dp.displayWidget as FormValues["displayWidget"],
      pollGroupId: dp.pollGroupId,
      falseLabel: dp.falseLabel ?? "",
      trueLabel: dp.trueLabel ?? "",
      ...WRITE_DEFAULTS,
    })
    setOpen(true)
  }
  const closeDialog = () => {
    setOpen(false)
    setEditing(null)
    reset()
  }

  const onSubmit = (d: FormValues) => {
    const dpBody: DataPointBody = {
      key: d.key, label: d.label, registerNumber: d.registerNumber,
      dataType: d.dataType, wordCount: d.wordCount, byteOrder: d.byteOrder,
      scaleFactor: d.scaleFactor, offset: d.offset, unit: d.unit,
      displayWidget: d.displayWidget, pollGroupId: d.pollGroupId,
      falseLabel: d.dataType === "BOOLEAN" ? (d.falseLabel || undefined) : undefined,
      trueLabel: d.dataType === "BOOLEAN" ? (d.trueLabel || undefined) : undefined,
    }
    if (editing) return updateMutation.mutateAsync({ id: editing.id, body: dpBody })
    if (d.mode === "readWrite") return createReadWriteMutation.mutateAsync({ dpBody, values: d })
    return createMutation.mutateAsync(dpBody)
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}><Plus data-icon="inline-start" />Add point</Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit "${editing.label}"` : "Add point"}</DialogTitle>
            </DialogHeader>

            {!editing && (
              <div className="flex gap-1 rounded-lg border p-1">
                <button
                  type="button"
                  onClick={() => switchMode("readOnly")}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    mode === "readOnly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Read only
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("readWrite")}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    mode === "readWrite" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Read &amp; Write
                </button>
              </div>
            )}

            <div className="flex flex-col gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={errors.label ? true : undefined}>
                  <FieldLabel htmlFor="label">Label</FieldLabel>
                  <Input id="label" placeholder="Voltage L1" {...register("label")} />
                  {errors.label && <FieldError>{errors.label.message}</FieldError>}
                </Field>
                <Field data-invalid={errors.key ? true : undefined}>
                  <FieldLabel htmlFor="key">Key</FieldLabel>
                  <Input id="key" placeholder="voltage_l1" {...register("key")} />
                  {errors.key && <FieldError>{errors.key.message}</FieldError>}
                </Field>
              </div>

              <Field data-invalid={errors.registerNumber ? true : undefined}>
                <FieldLabel htmlFor="reg">Register</FieldLabel>
                <Input id="reg" type="number" {...register("registerNumber")} />
              </Field>

              <Field data-invalid={errors.pollGroupId ? true : undefined}>
                <FieldLabel>Poll group</FieldLabel>
                <Select value={pollGroupId ?? ""} onValueChange={(v) => setValue("pollGroupId", v ?? "", { shouldValidate: true })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select poll group">
                      {(value: string | null) => groups?.find((g) => g.id === value)?.name ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {groups?.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errors.pollGroupId && <FieldError>{errors.pollGroupId.message}</FieldError>}
              </Field>

              <Field>
                <FieldLabel>Data type</FieldLabel>
                <Select value={dataType} onValueChange={(v) => setValue("dataType", v as FormValues["dataType"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {DATA_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              {!isBoolean && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="words">Words</FieldLabel>
                      <Input id="words" type="number" {...register("wordCount")} />
                    </Field>
                    <Field>
                      <FieldLabel>Byte order</FieldLabel>
                      <Select value={byteOrder} onValueChange={(v) => setValue("byteOrder", v as FormValues["byteOrder"])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {BYTE_ORDERS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <Field>
                      <FieldLabel htmlFor="scale">Scale</FieldLabel>
                      <Input id="scale" type="number" step="any" {...register("scaleFactor")} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="offset">Offset</FieldLabel>
                      <Input id="offset" type="number" step="any" {...register("offset")} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="unit">Unit</FieldLabel>
                      <Input id="unit" placeholder="V" {...register("unit")} />
                    </Field>
                  </div>
                </>
              )}

              <Field>
                <FieldLabel>Display widget</FieldLabel>
                <Select value={widget} onValueChange={(v) => setValue("displayWidget", v as FormValues["displayWidget"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {WIDGETS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              {isBoolean && (
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="falseLabel">Label when OFF (0)</FieldLabel>
                    <Input id="falseLabel" placeholder="e.g. OFF" {...register("falseLabel")} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="trueLabel">Label when ON (1)</FieldLabel>
                    <Input id="trueLabel" placeholder="e.g. ON" {...register("trueLabel")} />
                  </Field>
                </div>
              )}

              {isReadWrite && (
                <>
                  <Separator />
                  <p className="-mb-2 text-xs font-medium uppercase text-muted-foreground">
                    Write / Command — {isBoolean ? "Toggle" : "Setpoint"}
                  </p>
                  <FieldDescription className="-mt-2">
                    {isBoolean
                      ? "Boolean data type, so this is a toggle: one command, two values."
                      : "Non-boolean data type, so this is a setpoint: the operator supplies the value each time."}
                  </FieldDescription>

                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Name and key: </span>
                    <span className="font-medium">{label || "—"}</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="font-mono">{key || "—"}</span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Same as the data point above — one identity for both halves of the pair.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field data-invalid={errors.writeRegisterNumber ? true : undefined}>
                      <FieldLabel htmlFor="writeReg">Write register</FieldLabel>
                      <Input id="writeReg" type="number" {...register("writeRegisterNumber")} />
                      {errors.writeRegisterNumber && <FieldError>{errors.writeRegisterNumber.message}</FieldError>}
                    </Field>
                    <Field data-invalid={errors.commandFunctionCode ? true : undefined}>
                      <FieldLabel htmlFor="writeFc">Function code</FieldLabel>
                      <Input id="writeFc" type="number" {...register("commandFunctionCode")} />
                      {errors.commandFunctionCode && <FieldError>{errors.commandFunctionCode.message}</FieldError>}
                    </Field>
                  </div>

                  {isBoolean ? (
                    <div className="grid grid-cols-2 gap-4">
                      <Field data-invalid={errors.onValue ? true : undefined}>
                        <FieldLabel htmlFor="onval">On value</FieldLabel>
                        <Input id="onval" type="number" {...register("onValue")} />
                      </Field>
                      <Field data-invalid={errors.offValue ? true : undefined}>
                        <FieldLabel htmlFor="offval">Off value</FieldLabel>
                        <Input id="offval" type="number" {...register("offValue")} />
                      </Field>
                    </div>
                  ) : (
                    <>
                      <Field data-invalid={errors.category ? true : undefined}>
                        <FieldLabel>Category</FieldLabel>
                        <Select
                          value={category ?? "OTHER"}
                          onValueChange={(v) => setValue("category", v as FormValues["category"])}
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

                      <div className="grid grid-cols-3 gap-4">
                        <Field data-invalid={errors.writeScaleFactor ? true : undefined}>
                          <FieldLabel htmlFor="wscale">Write scale</FieldLabel>
                          <Input id="wscale" type="number" step="any" {...register("writeScaleFactor")} />
                          {errors.writeScaleFactor && <FieldError>{errors.writeScaleFactor.message}</FieldError>}
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="woffset">Write offset</FieldLabel>
                          <Input id="woffset" type="number" step="any" {...register("writeOffset")} />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="wunit">Write unit</FieldLabel>
                          <Input id="wunit" placeholder="Seconds" {...register("writeUnit")} />
                        </Field>
                      </div>
                      <FieldDescription>
                        The value an operator types is real-world — sent to the PLC as (value − offset) ÷ scale.
                      </FieldDescription>
                    </>
                  )}

                  <Field>
                    <FieldLabel>Minimum role</FieldLabel>
                    <Select value={minRole ?? "OPERATOR"} onValueChange={(v) => setValue("minRole", v as FormValues["minRole"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...register("confirmationRequired")} className="size-4" />
                    Require confirmation before sending
                  </label>
                </>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || createReadWriteMutation.isPending}>
                {editing ? "Save" : isReadWrite ? "Create point + command" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !points?.length ? (
        <p className="text-sm text-muted-foreground">No data points. Add one to define what registers to decode.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <TableFilterInput value={filter} onChange={setFilter} placeholder="Filter by label or key…" />
          {!filteredPoints.length ? (
            <p className="text-sm text-muted-foreground">No data points match "{filter}".</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="Label" sortKey="label" sort={sort} onSort={toggleSort} />
                    <SortableHead label="Key" sortKey="key" sort={sort} onSort={toggleSort} />
                    <SortableHead label="Register" sortKey="registerNumber" sort={sort} onSort={toggleSort} />
                    <SortableHead label="Data type" sortKey="dataType" sort={sort} onSort={toggleSort} />
                    <SortableHead label="Unit" sortKey="unit" sort={sort} onSort={toggleSort} />
                    <SortableHead label="Mode" sortKey="mode" sort={sort} onSort={toggleSort} />
                    <TableHead className="w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPoints.map((dp) => {
                    const linked = linkedCommandFor(dp.key)
                    return (
                      <TableRow key={dp.id}>
                        <TableCell>{dp.label}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{dp.key}</TableCell>
                        <TableCell className="font-mono text-xs">{dp.registerNumber}</TableCell>
                        <TableCell className="text-xs">{dp.dataType}</TableCell>
                        <TableCell>{dp.unit ?? "—"}</TableCell>
                        <TableCell>
                          {linked ? (
                            <Badge variant="outline" className="text-xs" title={`Command: ${linked.name}`}>
                              Read/Write
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Read only</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <CloneButton onClick={() => openClone(dp)} />
                            <EditButton onClick={() => openEdit(dp)} />
                            <DeleteConfirm onConfirm={() => deleteMutation.mutate(dp.id)} title={`Delete "${dp.label}"?`} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
