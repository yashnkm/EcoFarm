import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus } from "lucide-react"

import { commandTemplatesApi, type CommandTemplateBody } from "@/api/deviceProfiles"
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
import { Badge } from "@/components/ui/badge"
import { DeleteConfirm } from "@/components/DeleteConfirm"
import { EditButton } from "@/components/EditButton"
import type { CommandTemplate } from "@/types/api"

const ROLES = ["OPERATOR", "TENANT_ADMIN", "SUPER_ADMIN"] as const

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  registerNumber: z.coerce.number().int().min(0),
  functionCode: z.coerce.number().int().min(1).max(127),
  value: z.coerce.number().int(),
  confirmationRequired: z.boolean().optional(),
  minRole: z.enum(ROLES),
})
type FormValues = z.infer<typeof schema>

export function CommandsTab({ profileId }: { profileId: string }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CommandTemplate | null>(null)
  const queryClient = useQueryClient()

  const { data: commands, isLoading } = useQuery({
    queryKey: ["commands", profileId],
    queryFn: () => commandTemplatesApi.list(profileId),
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { minRole: "OPERATOR", functionCode: 6, confirmationRequired: true },
    })
  const role = watch("minRole")

  const createMutation = useMutation({
    mutationFn: (body: CommandTemplateBody) => commandTemplatesApi.create(profileId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commands", profileId] })
      toast.success("Command created")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: CommandTemplateBody }) =>
      commandTemplatesApi.update(profileId, id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commands", profileId] })
      toast.success("Command updated")
      closeDialog()
    },
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
    reset({ name: "", description: "", registerNumber: 0, functionCode: 6, value: 1, confirmationRequired: true, minRole: "OPERATOR" })
    setOpen(true)
  }
  const openEdit = (c: CommandTemplate) => {
    setEditing(c)
    reset({
      name: c.name,
      description: c.description ?? "",
      registerNumber: c.registerNumber,
      functionCode: c.functionCode,
      value: c.value,
      confirmationRequired: c.confirmationRequired,
      minRole: c.minRole,
    })
    setOpen(true)
  }
  const closeDialog = () => {
    setOpen(false)
    setEditing(null)
    reset()
  }

  const onSubmit = (d: FormValues) =>
    editing
      ? updateMutation.mutateAsync({ id: editing.id, body: d })
      : createMutation.mutateAsync(d)

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}><Plus data-icon="inline-start" />Add command</Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit "${editing.name}"` : "Add command"}</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="cname">Name</FieldLabel>
                <Input id="cname" placeholder="Start Pump" {...register("name")} />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>

              <Field>
                <FieldLabel htmlFor="cdesc">Description</FieldLabel>
                <Input id="cdesc" placeholder="Activates the pump relay" {...register("description")} />
              </Field>

              <div className="grid grid-cols-3 gap-4">
                <Field data-invalid={errors.registerNumber ? true : undefined}>
                  <FieldLabel htmlFor="creg">Register</FieldLabel>
                  <Input id="creg" type="number" {...register("registerNumber")} />
                </Field>
                <Field data-invalid={errors.functionCode ? true : undefined}>
                  <FieldLabel htmlFor="cfc">Function code</FieldLabel>
                  <Input id="cfc" type="number" {...register("functionCode")} />
                </Field>
                <Field data-invalid={errors.value ? true : undefined}>
                  <FieldLabel htmlFor="cval">Value</FieldLabel>
                  <Input id="cval" type="number" {...register("value")} />
                </Field>
              </div>

              <Field>
                <FieldLabel>Minimum role</FieldLabel>
                <Select value={role} onValueChange={(v) => setValue("minRole", v as FormValues["minRole"])}>
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
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
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
                <TableHead>Description</TableHead>
                <TableHead>Register</TableHead>
                <TableHead>FC</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Min role</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commands.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.description ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{c.registerNumber}</TableCell>
                  <TableCell>{c.functionCode}</TableCell>
                  <TableCell>{c.value}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{c.minRole}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
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
