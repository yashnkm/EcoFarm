import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus } from "lucide-react"

import { pollGroupsApi, type PollGroupBody } from "@/api/deviceProfiles"
import { useAuthStore } from "@/store/authStore"
import { naturalCompare } from "@/lib/utils"
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
import type { PollGroup } from "@/types/api"

const FC_OPTIONS = [
  { code: 1,  label: "01 – Read coils",                         description: "Read coils" },
  { code: 2,  label: "02 – Read input coils",                   description: "Read input coils" },
  { code: 3,  label: "03 – Read holding registers",             description: "Read holding registers" },
  { code: 4,  label: "04 – Read input registers",               description: "Read input registers" },
  { code: 5,  label: "05 – Set single coil",                    description: "Set single coil" },
  { code: 6,  label: "06 – Write to a single holding register", description: "Write to a single holding register" },
  { code: 15, label: "15 – Set multiple coils",                 description: "Set multiple coils" },
  { code: 16, label: "16 – Write to multiple holding registers", description: "Write to multiple holding registers" },
] as const

const VALID_FC_CODES = FC_OPTIONS.map((o) => o.code)

const schema = z.object({
  name: z.string().min(1),
  intervalSeconds: z.coerce.number().int().min(1),
  startRegister: z.coerce.number().int().min(0),
  count: z.coerce.number().int().min(1),
  functionCode: z.coerce.number().int().refine(
    (v) => VALID_FC_CODES.includes(v as typeof VALID_FC_CODES[number]),
    { message: "Select a valid function code" }
  ),
})
type FormValues = z.infer<typeof schema>

export function PollGroupsTab({ profileId }: { profileId: string }) {
  const isSuperAdmin = useAuthStore((s) => s.user?.role === "SUPER_ADMIN")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PollGroup | null>(null)
  const queryClient = useQueryClient()

  const { data: groups, isLoading } = useQuery({
    queryKey: ["poll-groups", profileId],
    queryFn: () => pollGroupsApi.list(profileId),
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues>, defaultValues: { intervalSeconds: 10, functionCode: 3 } })

  const functionCode = watch("functionCode")
  const selectedFc = FC_OPTIONS.find((o) => o.code === Number(functionCode))

  const createMutation = useMutation({
    mutationFn: (body: PollGroupBody) => pollGroupsApi.create(profileId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poll-groups", profileId] })
      toast.success("Poll group created")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: PollGroupBody }) =>
      pollGroupsApi.update(profileId, id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poll-groups", profileId] })
      toast.success("Poll group updated")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pollGroupsApi.delete(profileId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poll-groups", profileId] })
      toast.success("Poll group deleted")
    },
  })

  const openCreate = () => {
    setEditing(null)
    reset({ name: "", intervalSeconds: 10, startRegister: 0, count: 1, functionCode: 3 })
    setOpen(true)
  }
  const openEdit = (g: PollGroup) => {
    setEditing(g)
    reset({
      name: g.name,
      intervalSeconds: g.intervalSeconds,
      startRegister: g.startRegister,
      count: g.count,
      functionCode: g.functionCode,
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
        <Button size="sm" onClick={openCreate}><Plus data-icon="inline-start" />Add poll group</Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit "${editing.name}"` : "Add poll group"}</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="pg-name">Name</FieldLabel>
                <Input id="pg-name" placeholder="Electrical readings" {...register("name")} />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>

              <Field data-invalid={errors.functionCode ? true : undefined}>
                <FieldLabel>Function code</FieldLabel>
                <Select
                  value={String(functionCode ?? 3)}
                  onValueChange={(v) => setValue("functionCode", Number(v), { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select function code">
                      {(value: string | null) => FC_OPTIONS.find((o) => String(o.code) === value)?.label ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {FC_OPTIONS.map((o) => (
                        <SelectItem key={o.code} value={String(o.code)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {selectedFc && (
                  <p className="text-xs text-muted-foreground">{selectedFc.description}</p>
                )}
                {errors.functionCode && <FieldError>{errors.functionCode.message}</FieldError>}
              </Field>

              <div className="grid grid-cols-3 gap-4">
                <Field data-invalid={errors.intervalSeconds ? true : undefined}>
                  <FieldLabel htmlFor="interval">Interval (s)</FieldLabel>
                  <Input id="interval" type="number" {...register("intervalSeconds")} />
                  {errors.intervalSeconds && <FieldError>{errors.intervalSeconds.message}</FieldError>}
                </Field>
                <Field data-invalid={errors.startRegister ? true : undefined}>
                  <FieldLabel htmlFor="start">Start reg</FieldLabel>
                  <Input id="start" type="number" {...register("startRegister")} />
                  {errors.startRegister && <FieldError>{errors.startRegister.message}</FieldError>}
                </Field>
                <Field data-invalid={errors.count ? true : undefined}>
                  <FieldLabel htmlFor="count">Count</FieldLabel>
                  <Input id="count" type="number" {...register("count")} />
                  {errors.count && <FieldError>{errors.count.message}</FieldError>}
                </Field>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !groups?.length ? (
        <p className="text-sm text-muted-foreground">No poll groups yet. Add one to define what gets polled.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>FC</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Start register</TableHead>
                <TableHead>Count</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...groups].sort((a, b) => naturalCompare(a.name, b.name)).map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell className="text-xs">
                    {String(g.functionCode).padStart(2, "0")} – {FC_OPTIONS.find((o) => o.code === g.functionCode)?.description ?? g.functionCode}
                  </TableCell>
                  <TableCell>{g.intervalSeconds}s</TableCell>
                  <TableCell className="font-mono text-xs">{g.startRegister}</TableCell>
                  <TableCell>{g.count}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <EditButton onClick={() => openEdit(g)} />
                      {isSuperAdmin && (
                        <DeleteConfirm onConfirm={() => deleteMutation.mutate(g.id)} title={`Delete "${g.name}"?`} />
                      )}
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
