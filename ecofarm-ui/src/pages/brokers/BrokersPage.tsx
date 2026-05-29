import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus, Cloud } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { brokersApi, type CreateBrokerBody, type UpdateBrokerBody } from "@/api/brokers"
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
import type { MqttBroker } from "@/types/api"

const schema = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  useTls: z.boolean().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  keepaliveSeconds: z.coerce.number().int().min(5).max(3600),
  defaultQos: z.coerce.number().int().min(0).max(2),
})
type FormValues = z.infer<typeof schema>

export function BrokersPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MqttBroker | null>(null)
  const queryClient = useQueryClient()

  const { data: brokers, isLoading } = useQuery({
    queryKey: ["brokers"],
    queryFn: brokersApi.list,
    refetchInterval: 10_000,
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateBrokerBody) => brokersApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokers"] })
      toast.success("Broker created")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBrokerBody }) =>
      brokersApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokers"] })
      toast.success("Broker updated")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => brokersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokers"] })
      toast.success("Broker deleted")
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema) as Resolver<FormValues>,
      defaultValues: {
        port: 1883, useTls: false, keepaliveSeconds: 60, defaultQos: 1,
      },
    })

  const openCreate = () => {
    setEditing(null)
    reset({
      name: "", host: "", port: 1883, useTls: false,
      username: "", password: "", keepaliveSeconds: 60, defaultQos: 1,
    })
    setOpen(true)
  }
  const openEdit = (b: MqttBroker) => {
    setEditing(b)
    reset({
      name: b.name,
      host: b.host,
      port: b.port,
      useTls: b.useTls,
      username: b.username ?? "",
      password: "", // never pre-fill, blank = keep existing
      keepaliveSeconds: b.keepaliveSeconds,
      defaultQos: b.defaultQos,
    })
    setOpen(true)
  }
  const closeDialog = () => {
    setOpen(false)
    setEditing(null)
    reset()
  }

  const onSubmit = (data: FormValues) => {
    const body: CreateBrokerBody = {
      name: data.name,
      host: data.host,
      port: data.port,
      useTls: data.useTls,
      username: data.username || undefined,
      password: data.password || undefined,
      keepaliveSeconds: data.keepaliveSeconds,
      defaultQos: data.defaultQos,
    }
    return editing
      ? updateMutation.mutateAsync({ id: editing.id, body })
      : createMutation.mutateAsync(body)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">MQTT Brokers</h1>
          <p className="text-sm text-muted-foreground">
            Message brokers the platform connects to. Assign one to each gateway.
          </p>
        </div>
        <Button onClick={openCreate}><Plus data-icon="inline-start" />New Broker</Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit "${editing.name}"` : "Create broker"}</DialogTitle>
              <DialogDescription>
                Connection details for an MQTT broker (e.g. Mosquitto, HiveMQ).
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" placeholder="Production VPS" {...register("name")} />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Field data-invalid={errors.host ? true : undefined}>
                    <FieldLabel htmlFor="host">Host</FieldLabel>
                    <Input id="host" placeholder="77.37.47.14" {...register("host")} />
                    {errors.host && <FieldError>{errors.host.message}</FieldError>}
                  </Field>
                </div>
                <Field data-invalid={errors.port ? true : undefined}>
                  <FieldLabel htmlFor="port">Port</FieldLabel>
                  <Input id="port" type="number" {...register("port")} />
                </Field>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("useTls")} className="size-4" />
                Use TLS / SSL
              </label>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <Input id="username" placeholder="Optional" {...register("username")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input id="password" type="password" placeholder={editing ? "Leave blank to keep" : "Optional"} {...register("password")} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="keepaliveSeconds">Keepalive (s)</FieldLabel>
                  <Input id="keepaliveSeconds" type="number" {...register("keepaliveSeconds")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="defaultQos">Default QoS</FieldLabel>
                  <Input id="defaultQos" type="number" min={0} max={2} {...register("defaultQos")} />
                </Field>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {editing ? "Save changes" : "Create broker"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex flex-col gap-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
      ) : !brokers?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Cloud /></EmptyMedia>
            <EmptyTitle>No brokers yet</EmptyTitle>
            <EmptyDescription>Create a broker then assign it to tenants.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>TLS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Connection</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brokers.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="font-mono text-xs">{b.brokerUrl}</TableCell>
                  <TableCell className="text-xs">{b.useTls ? "yes" : "no"}</TableCell>
                  <TableCell>
                    <Badge variant={b.status === "ACTIVE" ? "default" : "destructive"}>{b.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={b.connected ? "default" : "destructive"}
                      title={b.lastError ?? undefined}
                    >
                      {b.connected ? "Online" : "Offline"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(b.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <EditButton onClick={() => openEdit(b)} />
                      <DeleteConfirm
                        onConfirm={() => deleteMutation.mutate(b.id)}
                        title={`Delete "${b.name}"?`}
                        description="Tenants currently using this broker will lose connectivity."
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
