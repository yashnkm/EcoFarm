import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus, Users } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { usersApi, type UpdateUserBody } from "@/api/users"
import { useAuthStore } from "@/store/authStore"
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
import type { Role, User } from "@/types/api"

const ASSIGNABLE_ROLES: Role[] = ["TENANT_ADMIN", "OPERATOR", "VIEWER"]
const USER_STATUSES = ["ACTIVE", "SUSPENDED"] as const

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(["TENANT_ADMIN", "OPERATOR", "VIEWER"]),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

const editSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["TENANT_ADMIN", "OPERATOR", "VIEWER"]),
  status: z.enum(USER_STATUSES),
})
type EditForm = z.infer<typeof editSchema>

export function UsersPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const { data: users, isLoading } = useQuery({ queryKey: ["users"], queryFn: usersApi.list })

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success(`Invite sent to ${user.email}`)
      setCreateOpen(false)
      createForm.reset()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateUserBody }) => usersApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("User updated")
      setEditOpen(false)
      setEditing(null)
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("User removed")
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: "OPERATOR" },
  })
  const createRole = createForm.watch("role")

  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) })
  const editRole = editForm.watch("role")
  const editStatus = editForm.watch("status")

  const openEdit = (u: User) => {
    setEditing(u)
    editForm.reset({
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      role: (u.role === "SUPER_ADMIN" ? "TENANT_ADMIN" : u.role) as EditForm["role"],
      status: (u.status === "INVITED" ? "ACTIVE" : u.status) as EditForm["status"],
    })
    setEditOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">Team members with access to this tenant.</p>
        </div>
        <Button onClick={() => { createForm.reset({ role: "OPERATOR" }); setCreateOpen(true) }}>
          <Plus data-icon="inline-start" />Add User
        </Button>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={createForm.handleSubmit((d) => createMutation.mutateAsync(d))}>
            <DialogHeader>
              <DialogTitle>Invite a user</DialogTitle>
              <DialogDescription>
                They'll get an email with a one-time password and a link to sign in — they'll be asked
                to set their own password immediately, before they can access anything.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <Field data-invalid={createForm.formState.errors.email ? true : undefined}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" {...createForm.register("email")} />
                {createForm.formState.errors.email && <FieldError>{createForm.formState.errors.email.message}</FieldError>}
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="firstName">First name</FieldLabel>
                  <Input id="firstName" {...createForm.register("firstName")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                  <Input id="lastName" {...createForm.register("lastName")} />
                </Field>
              </div>
              <Field>
                <FieldLabel>Role</FieldLabel>
                <Select value={createRole} onValueChange={(v) => createForm.setValue("role", v as CreateForm["role"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ASSIGNABLE_ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting && <Spinner data-icon="inline-start" />}
                Send invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditing(null) }}>
        <DialogContent>
          <form onSubmit={editForm.handleSubmit((d) => {
            if (!editing) return
            // Editing name/role shouldn't silently activate someone still
            // on their one-time invite password — the status Select always
            // has a value, but only actually send it when the admin could
            // legitimately be choosing between ACTIVE/SUSPENDED.
            const body = editing.status === "INVITED" ? { ...d, status: undefined } : d
            return updateMutation.mutateAsync({ id: editing.id, body })
          })}>
            <DialogHeader>
              <DialogTitle>Edit {editing?.email}</DialogTitle>
              <DialogDescription>Update name, role, or activation status.</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="e-first">First name</FieldLabel>
                  <Input id="e-first" {...editForm.register("firstName")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="e-last">Last name</FieldLabel>
                  <Input id="e-last" {...editForm.register("lastName")} />
                </Field>
              </div>

              <Field>
                <FieldLabel>Role</FieldLabel>
                <Select value={editRole} onValueChange={(v) => editForm.setValue("role", v as EditForm["role"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ASSIGNABLE_ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              {editing?.status === "INVITED" ? (
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <p className="text-sm text-muted-foreground">
                    Still on their one-time invite password — becomes Active automatically once they sign in and set one.
                  </p>
                </Field>
              ) : (
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select value={editStatus} onValueChange={(v) => editForm.setValue("status", v as EditForm["status"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {USER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
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
      ) : !users?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Users /></EmptyMedia>
            <EmptyTitle>No users</EmptyTitle>
            <EmptyDescription>Invite team members to collaborate.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id
                const isSuperAdmin = u.role === "SUPER_ADMIN"
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "—"}
                      {isSelf && <Badge variant="outline" className="ml-2 text-xs">you</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell><Badge variant="secondary">{u.role.replace("_", " ")}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={
                        u.status === "ACTIVE" ? "default" :
                        u.status === "SUSPENDED" ? "destructive" : "secondary"
                      }>{u.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {!isSuperAdmin && <EditButton onClick={() => openEdit(u)} />}
                        {!isSelf && (
                          <DeleteConfirm
                            onConfirm={() => deleteMutation.mutate(u.id)}
                            title={`Remove ${u.email}?`}
                            description="Their access tokens will be revoked immediately."
                          />
                        )}
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
  )
}
