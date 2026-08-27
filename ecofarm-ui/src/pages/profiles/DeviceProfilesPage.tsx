import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus, Package, Upload } from "lucide-react"

import { deviceProfilesApi } from "@/api/deviceProfiles"
import { useAuthStore } from "@/store/authStore"
import { ImportDialog } from "./ImportDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { DeleteConfirm } from "@/components/DeleteConfirm"
import { EditButton } from "@/components/EditButton"
import type { DeviceProfile } from "@/types/api"

const CATEGORIES = ["ENERGY_METER", "PLC", "SENSOR", "VFD", "RELAY"] as const

const schema = z.object({
  name: z.string().min(1),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  category: z.enum(CATEGORIES),
  description: z.string().optional(),
  global: z.boolean().optional(),
})
type FormValues = z.infer<typeof schema>

export function DeviceProfilesPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DeviceProfile | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === "SUPER_ADMIN"
  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "TENANT_ADMIN"

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["device-profiles"],
    queryFn: deviceProfilesApi.list,
  })

  const createMutation = useMutation({
    mutationFn: deviceProfilesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-profiles"] })
      toast.success("Profile created")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<FormValues> }) =>
      deviceProfilesApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-profiles"] })
      toast.success("Profile updated")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: deviceProfilesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-profiles"] })
      toast.success("Profile deleted")
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { category: "PLC" } })
  const category = watch("category")

  const openCreate = () => {
    setEditing(null)
    reset({ name: "", category: "PLC", manufacturer: "", model: "", description: "", global: false })
    setOpen(true)
  }
  const openEdit = (p: DeviceProfile) => {
    setEditing(p)
    reset({
      name: p.name,
      manufacturer: p.manufacturer ?? "",
      model: p.model ?? "",
      category: p.category,
      description: p.description ?? "",
      global: p.global,
    })
    setOpen(true)
  }
  const closeDialog = () => {
    setOpen(false)
    setEditing(null)
    reset()
  }

  const onSubmit = (data: FormValues) => {
    const body = {
      name: data.name,
      manufacturer: data.manufacturer,
      model: data.model,
      category: data.category,
      description: data.description,
      global: isSuperAdmin ? data.global : undefined,
    }
    return editing
      ? updateMutation.mutateAsync({ id: editing.id, body })
      : createMutation.mutateAsync(body)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Device Profiles</h1>
          <p className="text-sm text-muted-foreground">
            Templates describing how to talk to a specific device model.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload data-icon="inline-start" />
              Import as new profile
            </Button>
          )}
          <Button onClick={openCreate}><Plus data-icon="inline-start" />New Profile</Button>
        </div>
      </div>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => queryClient.invalidateQueries({ queryKey: ["device-profiles"] })}
      />

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit "${editing.name}"` : "Create a device profile"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update profile metadata. Poll groups, data points, and commands are edited on the detail page."
                  : "Create a template. You'll add poll groups, data points, and commands on the next screen."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" placeholder="Schneider PM5560" aria-invalid={!!errors.name} {...register("name")} />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="manufacturer">Manufacturer</FieldLabel>
                  <Input id="manufacturer" placeholder="Schneider" {...register("manufacturer")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="model">Model</FieldLabel>
                  <Input id="model" placeholder="PM5560" {...register("model")} />
                </Field>
              </div>

              <Field>
                <FieldLabel>Category</FieldLabel>
                <Select value={category ?? "PLC"} onValueChange={(v) => setValue("category", v as FormValues["category"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Input id="description" placeholder="Optional" {...register("description")} />
              </Field>

              {isSuperAdmin && !editing && (
                <Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...register("global")} className="size-4" />
                    Make this a global profile (available to all tenants)
                  </label>
                </Field>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {editing ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex flex-col gap-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
      ) : !profiles?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Package /></EmptyMedia>
            <EmptyTitle>No device profiles</EmptyTitle>
            <EmptyDescription>Create your first device profile to start adding devices.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Manufacturer / Model</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link to={`/profiles/${p.id}`} className="hover:underline">{p.name}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.manufacturer ?? "—"} {p.model && `/ ${p.model}`}
                  </TableCell>
                  <TableCell><Badge variant="secondary">{p.category.replace("_", " ")}</Badge></TableCell>
                  <TableCell><Badge variant={p.global ? "default" : "outline"}>{p.global ? "Global" : "Tenant"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <EditButton onClick={() => openEdit(p)} />
                      {isSuperAdmin && (
                        <DeleteConfirm
                          onConfirm={() => deleteMutation.mutate(p.id)}
                          title={`Delete "${p.name}"?`}
                          description="Devices using this profile will also be affected."
                        />
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
