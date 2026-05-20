import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus, Building2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { tenantsApi, type UpdateTenantBody } from "@/api/tenants"
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
import { Separator } from "@/components/ui/separator"
import { brokersApi } from "@/api/brokers"
import type { Tenant, TenantStatus } from "@/types/api"

const TENANT_STATUSES: TenantStatus[] = ["ACTIVE", "SUSPENDED"]

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Lowercase, numbers, hyphens"),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminFirstName: z.string().optional(),
  adminLastName: z.string().optional(),
  mqttBrokerId: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

const editSchema = z.object({
  name: z.string().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  plan: z.string().optional(),
  mqttBrokerId: z.string().optional(),
})
type EditForm = z.infer<typeof editSchema>

export function TenantsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Tenant | null>(null)
  const queryClient = useQueryClient()

  const { data: tenants, isLoading } = useQuery({ queryKey: ["tenants"], queryFn: tenantsApi.list })
  const { data: brokers } = useQuery({ queryKey: ["brokers"], queryFn: brokersApi.list })

  const createMutation = useMutation({
    mutationFn: tenantsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] })
      toast.success("Tenant created")
      setCreateOpen(false)
      createForm.reset()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTenantBody }) => tenantsApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] })
      toast.success("Tenant updated")
      setEditOpen(false)
      setEditing(null)
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: tenantsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] })
      toast.success("Tenant deleted")
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) })
  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) })
  const editStatus = editForm.watch("status")

  const openEdit = (t: Tenant) => {
    setEditing(t)
    editForm.reset({
      name: t.name,
      status: t.status,
      plan: t.plan,
      mqttBrokerId: t.mqttBrokerId ?? "",
    })
    setEditOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            Customer organizations on the platform. Each tenant's data is fully isolated.
          </p>
        </div>
        <Button onClick={() => { createForm.reset(); setCreateOpen(true) }}>
          <Plus data-icon="inline-start" />New Tenant
        </Button>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={createForm.handleSubmit((d) => createMutation.mutateAsync(d))}>
            <DialogHeader>
              <DialogTitle>Create tenant</DialogTitle>
              <DialogDescription>Provisions a new organization and its first admin user.</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={createForm.formState.errors.name ? true : undefined}>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input id="name" placeholder="Acme Corp" {...createForm.register("name")} />
                  {createForm.formState.errors.name && <FieldError>{createForm.formState.errors.name.message}</FieldError>}
                </Field>
                <Field data-invalid={createForm.formState.errors.slug ? true : undefined}>
                  <FieldLabel htmlFor="slug">Slug</FieldLabel>
                  <Input id="slug" placeholder="acme-corp" {...createForm.register("slug")} />
                  {createForm.formState.errors.slug && <FieldError>{createForm.formState.errors.slug.message}</FieldError>}
                </Field>
              </div>

              <Separator />
              <p className="-mb-2 text-xs font-medium uppercase text-muted-foreground">Initial tenant admin</p>

              <Field data-invalid={createForm.formState.errors.adminEmail ? true : undefined}>
                <FieldLabel htmlFor="adminEmail">Email</FieldLabel>
                <Input id="adminEmail" type="email" {...createForm.register("adminEmail")} />
                {createForm.formState.errors.adminEmail && <FieldError>{createForm.formState.errors.adminEmail.message}</FieldError>}
              </Field>

              <Field data-invalid={createForm.formState.errors.adminPassword ? true : undefined}>
                <FieldLabel htmlFor="adminPassword">Password</FieldLabel>
                <Input id="adminPassword" type="password" {...createForm.register("adminPassword")} />
                {createForm.formState.errors.adminPassword && <FieldError>{createForm.formState.errors.adminPassword.message}</FieldError>}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="adminFirstName">First name</FieldLabel>
                  <Input id="adminFirstName" {...createForm.register("adminFirstName")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="adminLastName">Last name</FieldLabel>
                  <Input id="adminLastName" {...createForm.register("adminLastName")} />
                </Field>
              </div>

              <Separator />
              <p className="-mb-2 text-xs font-medium uppercase text-muted-foreground">MQTT broker</p>

              <Field>
                <FieldLabel>Assigned broker</FieldLabel>
                <Select
                  value={createForm.watch("mqttBrokerId") ?? ""}
                  onValueChange={(v) => createForm.setValue("mqttBrokerId", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Unassigned (assign later)" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {brokers?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting && <Spinner data-icon="inline-start" />}
                Create tenant
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditing(null) }}>
        <DialogContent>
          <form onSubmit={editForm.handleSubmit((d) => editing && updateMutation.mutateAsync({ id: editing.id, body: d }))}>
            <DialogHeader>
              <DialogTitle>Edit "{editing?.name}"</DialogTitle>
              <DialogDescription>Update name, plan, and activation status.</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <Field data-invalid={editForm.formState.errors.name ? true : undefined}>
                <FieldLabel htmlFor="e-name">Name</FieldLabel>
                <Input id="e-name" {...editForm.register("name")} />
              </Field>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select value={editStatus} onValueChange={(v) => editForm.setValue("status", v as EditForm["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {TENANT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="e-plan">Plan</FieldLabel>
                <Input id="e-plan" {...editForm.register("plan")} />
              </Field>
              <Field>
                <FieldLabel>Assigned broker</FieldLabel>
                <Select
                  value={editForm.watch("mqttBrokerId") ?? ""}
                  onValueChange={(v) => editForm.setValue("mqttBrokerId", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {brokers?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting && <Spinner data-icon="inline-start" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex flex-col gap-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
      ) : !tenants?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
            <EmptyTitle>No tenants</EmptyTitle>
            <EmptyDescription>Provision your first customer organization.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="font-mono text-xs">{t.slug}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {t.mqttBrokerName ?? <span className="italic text-destructive">unassigned</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.plan}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "ACTIVE" ? "default" : "destructive"}>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <EditButton onClick={() => openEdit(t)} />
                      <DeleteConfirm
                        onConfirm={() => deleteMutation.mutate(t.id)}
                        title={`Delete "${t.name}"?`}
                        description="All users, sites, gateways, devices, and readings will be permanently removed."
                      />
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
