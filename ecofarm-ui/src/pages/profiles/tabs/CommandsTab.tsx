import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, type Resolver } from "react-hook-form"
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
import type { CommandTemplate } from "@/types/api"

const ROLES = ["OPERATOR", "TENANT_ADMIN", "SUPER_ADMIN"] as const

const sharedFields = {
  name: z.string().min(1),
  description: z.string().optional(),
  registerNumber: z.coerce.number().int().min(0),
  functionCode: z.coerce.number().int().min(1).max(127),
  confirmationRequired: z.boolean().optional(),
  minRole: z.enum(ROLES),
}

// Creating writes two commands at once — "{name} ON" / "{name} OFF" — sharing
// everything except the value each one sends.
const createSchema = z.object({
  ...sharedFields,
  onValue: z.coerce.number().int(),
  offValue: z.coerce.number().int(),
})
type CreateValues = z.infer<typeof createSchema>

// Editing still targets one specific command, so it keeps a single value.
const editSchema = z.object({
  ...sharedFields,
  value: z.coerce.number().int(),
})
type EditValues = z.infer<typeof editSchema>

export function CommandsTab({ profileId }: { profileId: string }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CommandTemplate | null>(null)
  const queryClient = useQueryClient()

  const { data: commands, isLoading } = useQuery({
    queryKey: ["commands", profileId],
    queryFn: () => commandTemplatesApi.list(profileId),
  })

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema) as Resolver<CreateValues>,
    defaultValues: { minRole: "OPERATOR", functionCode: 6, confirmationRequired: true, onValue: 1, offValue: 0 },
  })
  const createRole = createForm.watch("minRole")

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema) as Resolver<EditValues>,
    defaultValues: { minRole: "OPERATOR", functionCode: 6, confirmationRequired: true },
  })
  const editRole = editForm.watch("minRole")

  const createMutation = useMutation({
    mutationFn: async (values: CreateValues) => {
      const { name, onValue, offValue, ...rest } = values
      const base: Omit<CommandTemplateBody, "name" | "value"> = rest
      await commandTemplatesApi.create(profileId, { ...base, name: `${name} ON`, value: onValue })
      await commandTemplatesApi.create(profileId, { ...base, name: `${name} OFF`, value: offValue })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commands", profileId] })
      toast.success("ON/OFF commands created")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed to create commands"),
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
    createForm.reset({
      name: "",
      description: "",
      registerNumber: 0,
      functionCode: 6,
      onValue: 1,
      offValue: 0,
      confirmationRequired: true,
      minRole: "OPERATOR",
    })
    setOpen(true)
  }
  const openEdit = (c: CommandTemplate) => {
    setEditing(c)
    editForm.reset({
      name: c.name,
      description: c.description ?? "",
      registerNumber: c.registerNumber,
      functionCode: c.functionCode,
      value: c.value,
      confirmationRequired: c.confirmationRequired,
      minRole: c.minRole as EditValues["minRole"],
    })
    setOpen(true)
  }
  const closeDialog = () => {
    setOpen(false)
    setEditing(null)
    createForm.reset()
    editForm.reset()
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}><Plus data-icon="inline-start" />Add command</Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent>
          {editing ? (
            <form onSubmit={editForm.handleSubmit((d) => updateMutation.mutateAsync({ id: editing.id, body: d }))}>
              <DialogHeader>
                <DialogTitle>Edit &quot;{editing.name}&quot;</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-4">
                <Field data-invalid={editForm.formState.errors.name ? true : undefined}>
                  <FieldLabel htmlFor="ename">Name</FieldLabel>
                  <Input id="ename" placeholder="Fan-3 ON" {...editForm.register("name")} />
                  {editForm.formState.errors.name && <FieldError>{editForm.formState.errors.name.message}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="edesc">Description</FieldLabel>
                  <Input id="edesc" placeholder="Activates the pump relay" {...editForm.register("description")} />
                </Field>

                <div className="grid grid-cols-3 gap-4">
                  <Field data-invalid={editForm.formState.errors.registerNumber ? true : undefined}>
                    <FieldLabel htmlFor="ereg">Register</FieldLabel>
                    <Input id="ereg" type="number" {...editForm.register("registerNumber")} />
                  </Field>
                  <Field data-invalid={editForm.formState.errors.functionCode ? true : undefined}>
                    <FieldLabel htmlFor="efc">Function code</FieldLabel>
                    <Input id="efc" type="number" {...editForm.register("functionCode")} />
                  </Field>
                  <Field data-invalid={editForm.formState.errors.value ? true : undefined}>
                    <FieldLabel htmlFor="eval">Value</FieldLabel>
                    <Input id="eval" type="number" {...editForm.register("value")} />
                  </Field>
                </div>

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
            <form onSubmit={createForm.handleSubmit((d) => createMutation.mutateAsync(d))}>
              <DialogHeader>
                <DialogTitle>Add command</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-4">
                <Field data-invalid={createForm.formState.errors.name ? true : undefined}>
                  <FieldLabel htmlFor="cname">Name</FieldLabel>
                  <Input id="cname" placeholder="Fan-3" {...createForm.register("name")} />
                  <FieldDescription>Creates two commands: &quot;{createForm.watch("name") || "Fan-3"} ON&quot; and &quot;{createForm.watch("name") || "Fan-3"} OFF&quot;.</FieldDescription>
                  {createForm.formState.errors.name && <FieldError>{createForm.formState.errors.name.message}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="cdesc">Description</FieldLabel>
                  <Input id="cdesc" placeholder="Activates the pump relay" {...createForm.register("description")} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field data-invalid={createForm.formState.errors.registerNumber ? true : undefined}>
                    <FieldLabel htmlFor="creg">Register</FieldLabel>
                    <Input id="creg" type="number" {...createForm.register("registerNumber")} />
                  </Field>
                  <Field data-invalid={createForm.formState.errors.functionCode ? true : undefined}>
                    <FieldLabel htmlFor="cfc">Function code</FieldLabel>
                    <Input id="cfc" type="number" {...createForm.register("functionCode")} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field data-invalid={createForm.formState.errors.onValue ? true : undefined}>
                    <FieldLabel htmlFor="onval">On value</FieldLabel>
                    <Input id="onval" type="number" {...createForm.register("onValue")} />
                  </Field>
                  <Field data-invalid={createForm.formState.errors.offValue ? true : undefined}>
                    <FieldLabel htmlFor="offval">Off value</FieldLabel>
                    <Input id="offval" type="number" {...createForm.register("offValue")} />
                  </Field>
                </div>

                <Field>
                  <FieldLabel>Minimum role</FieldLabel>
                  <Select value={createRole} onValueChange={(v) => createForm.setValue("minRole", v as CreateValues["minRole"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...createForm.register("confirmationRequired")} className="size-4" />
                  Require confirmation before sending
                </label>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={createForm.formState.isSubmitting}>Create</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !commands?.length ? (
        <p className="text-sm text-muted-foreground">No commands. Add one to expose a named ON/OFF action on devices.</p>
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
