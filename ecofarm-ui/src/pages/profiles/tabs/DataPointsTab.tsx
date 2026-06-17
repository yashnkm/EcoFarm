import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus } from "lucide-react"

import { dataPointsApi, pollGroupsApi, type DataPointBody } from "@/api/deviceProfiles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
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
import { DeleteConfirm } from "@/components/DeleteConfirm"
import { EditButton } from "@/components/EditButton"
import type { DataPoint } from "@/types/api"

const DATA_TYPES = ["UINT16", "INT16", "UINT32", "INT32", "FLOAT32", "ASCII", "BOOLEAN"] as const
const WIDGETS = ["NUMBER", "GAUGE", "BOOLEAN_TOGGLE", "BOOLEAN_DISPLAY", "STATUS_BADGE"] as const
const BYTE_ORDERS = ["BIG_ENDIAN", "LITTLE_ENDIAN"] as const

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

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema) as Resolver<FormValues>,
      defaultValues: {
        dataType: "UINT16", wordCount: 1, byteOrder: "BIG_ENDIAN",
        scaleFactor: 1, offset: 0, displayWidget: "NUMBER",
      },
    })
  const dataType = watch("dataType")
  const byteOrder = watch("byteOrder")
  const widget = watch("displayWidget")
  const pollGroupId = watch("pollGroupId")
  const isBoolean = dataType === "BOOLEAN"

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
    })
    setOpen(true)
  }
  const closeDialog = () => {
    setOpen(false)
    setEditing(null)
    reset()
  }

  const onSubmit = (d: FormValues) => {
    const body: DataPointBody = {
      ...d,
      falseLabel: d.dataType === "BOOLEAN" ? (d.falseLabel || undefined) : undefined,
      trueLabel: d.dataType === "BOOLEAN" ? (d.trueLabel || undefined) : undefined,
    }
    return editing
      ? updateMutation.mutateAsync({ id: editing.id, body })
      : createMutation.mutateAsync(body)
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}><Plus data-icon="inline-start" />Add data point</Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit "${editing.label}"` : "Add data point"}</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={errors.key ? true : undefined}>
                  <FieldLabel htmlFor="key">Key</FieldLabel>
                  <Input id="key" placeholder="voltage_l1" {...register("key")} />
                  {errors.key && <FieldError>{errors.key.message}</FieldError>}
                </Field>
                <Field data-invalid={errors.label ? true : undefined}>
                  <FieldLabel htmlFor="label">Label</FieldLabel>
                  <Input id="label" placeholder="Voltage L1" {...register("label")} />
                  {errors.label && <FieldError>{errors.label.message}</FieldError>}
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

              <div className="grid grid-cols-3 gap-4">
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
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !points?.length ? (
        <p className="text-sm text-muted-foreground">No data points. Add one to define what registers to decode.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Register</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map((dp) => (
                <TableRow key={dp.id}>
                  <TableCell className="font-mono text-xs">{dp.key}</TableCell>
                  <TableCell>{dp.label}</TableCell>
                  <TableCell className="font-mono text-xs">{dp.registerNumber}</TableCell>
                  <TableCell className="text-xs">{dp.dataType}</TableCell>
                  <TableCell>{dp.unit ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <EditButton onClick={() => openEdit(dp)} />
                      <DeleteConfirm onConfirm={() => deleteMutation.mutate(dp.id)} title={`Delete "${dp.label}"?`} />
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
