import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus, Radio } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { gatewayDriversApi, type GatewayDriverBody } from "@/api/gatewayDrivers"
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
import type { GatewayDriver } from "@/types/api"

const TRANSPORTS = ["MQTT", "MODBUS_TCP", "OPCUA"] as const
const PROTOCOLS = ["MODBUS_RTU", "MODBUS_TCP"] as const

const schema = z.object({
  name: z.string().min(1),
  transport: z.enum(TRANSPORTS),
  protocol: z.enum(PROTOCOLS),
  requestFormat: z.string().optional(),
  supportsBroadcast: z.boolean().optional(),
  messageType: z.string().min(1),
  topicRequest: z.string().min(1).refine((v) => v.includes("{serial}"), {
    message: "Must contain {serial} placeholder",
  }),
  topicResponse: z.string().min(1).refine((v) => v.includes("{serial}"), {
    message: "Must contain {serial} placeholder",
  }),
  topicStatus: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function GatewayDriversPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<GatewayDriver | null>(null)
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canManage = user?.role === "SUPER_ADMIN"

  const { data: drivers, isLoading } = useQuery({
    queryKey: ["gateway-drivers"],
    queryFn: gatewayDriversApi.list,
  })

  const createMutation = useMutation({
    mutationFn: (body: GatewayDriverBody) => gatewayDriversApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gateway-drivers"] })
      toast.success("Driver created")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<GatewayDriverBody> }) =>
      gatewayDriversApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gateway-drivers"] })
      toast.success("Driver updated")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => gatewayDriversApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gateway-drivers"] })
      toast.success("Driver deleted")
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        transport: "MQTT", protocol: "MODBUS_RTU", supportsBroadcast: false,
        messageType: "ASCII",
        topicRequest: "request/{serial}",
        topicResponse: "response/{serial}",
        topicStatus: "",
      },
    })
  const transport = watch("transport")
  const protocol = watch("protocol")

  const openCreate = () => {
    setEditing(null)
    reset({
      name: "", transport: "MQTT", protocol: "MODBUS_RTU",
      requestFormat: "", supportsBroadcast: false,
      messageType: "ASCII",
      topicRequest: "request/{serial}",
      topicResponse: "response/{serial}",
      topicStatus: "",
    })
    setOpen(true)
  }
  const openEdit = (d: GatewayDriver) => {
    setEditing(d)
    reset({
      name: d.name,
      transport: d.transport as FormValues["transport"],
      protocol: d.protocol as FormValues["protocol"],
      requestFormat: d.requestFormat ?? "",
      supportsBroadcast: d.supportsBroadcast,
      messageType: d.messageType,
      topicRequest: d.topicRequest,
      topicResponse: d.topicResponse,
      topicStatus: d.topicStatus ?? "",
    })
    setOpen(true)
  }
  const closeDialog = () => {
    setOpen(false)
    setEditing(null)
    reset()
  }

  const onSubmit = (data: FormValues) => {
    return editing
      ? updateMutation.mutateAsync({ id: editing.id, body: data })
      : createMutation.mutateAsync(data)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gateway Drivers</h1>
          <p className="text-sm text-muted-foreground">
            Transport + protocol templates for classes of edge gateways. Global across the platform.
          </p>
        </div>
        {canManage && <Button onClick={openCreate}><Plus data-icon="inline-start" />New Driver</Button>}
      </div>

      {canManage && (
        <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
          <DialogContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>{editing ? `Edit "${editing.name}"` : "Create gateway driver"}</DialogTitle>
                <DialogDescription>Describes how to talk to a class of gateway.</DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-4">
                <Field data-invalid={errors.name ? true : undefined}>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input id="name" placeholder="TRB140 MQTT Gateway" aria-invalid={!!errors.name} {...register("name")} />
                  {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Transport</FieldLabel>
                    <Select value={transport} onValueChange={(v) => setValue("transport", v as FormValues["transport"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {TRANSPORTS.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Protocol</FieldLabel>
                    <Select value={protocol} onValueChange={(v) => setValue("protocol", v as FormValues["protocol"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {PROTOCOLS.map((p) => <SelectItem key={p} value={p}>{p.replace("_", " ")}</SelectItem>)}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="requestFormat">Request format template (optional)</FieldLabel>
                  <Input id="requestFormat" placeholder="1 {cookie} {slave} {fc}..." {...register("requestFormat")} />
                </Field>

                <p className="-mb-2 text-xs font-medium uppercase text-muted-foreground">Topic patterns</p>

                <Field data-invalid={errors.topicRequest ? true : undefined}>
                  <FieldLabel htmlFor="topicRequest">Request topic (backend → gateway)</FieldLabel>
                  <Input id="topicRequest" placeholder="request/{serial}" {...register("topicRequest")} />
                  {errors.topicRequest && <FieldError>{errors.topicRequest.message}</FieldError>}
                </Field>

                <Field data-invalid={errors.topicResponse ? true : undefined}>
                  <FieldLabel htmlFor="topicResponse">Response topic (gateway → backend)</FieldLabel>
                  <Input id="topicResponse" placeholder="response/{serial}" {...register("topicResponse")} />
                  {errors.topicResponse && <FieldError>{errors.topicResponse.message}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="topicStatus">Status topic (optional)</FieldLabel>
                  <Input id="topicStatus" placeholder="status/{serial}" {...register("topicStatus")} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="messageType">Message type</FieldLabel>
                    <Input id="messageType" placeholder="ASCII" {...register("messageType")} />
                  </Field>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm pb-2">
                      <input type="checkbox" {...register("supportsBroadcast")} className="size-4" />
                      Supports broadcast
                    </label>
                  </div>
                </div>
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
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
      ) : !drivers?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Radio /></EmptyMedia>
            <EmptyTitle>No gateway drivers</EmptyTitle>
            <EmptyDescription>Create a driver describing a gateway's transport and protocol.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Transport</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Broadcast</TableHead>
                <TableHead>Created</TableHead>
                {canManage && <TableHead className="w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell><Badge variant="secondary">{d.transport.replace("_", " ")}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{d.protocol.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-xs">{d.supportsBroadcast ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <EditButton onClick={() => openEdit(d)} />
                        <DeleteConfirm
                          onConfirm={() => deleteMutation.mutate(d.id)}
                          title={`Delete "${d.name}"?`}
                          description="Any gateway using this driver will be affected."
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
