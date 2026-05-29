import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus, Radio } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { gatewaysApi } from "@/api/gateways"
import { sitesApi } from "@/api/sites"
import { brokersApi } from "@/api/brokers"
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
import type { Gateway } from "@/types/api"

const schema = z.object({
  serialNumber: z.string().min(1, "Serial number is required"),
  driverId: z.string().min(1, "Driver is required"),
  mqttBrokerId: z.string().min(1, "Broker is required"),
  name: z.string().optional(),
  siteId: z.string().optional(),
  baudRate: z.coerce.number().int().positive(),
  parity: z.enum(["none", "even", "odd"]),
  stopBits: z.coerce.number().int().min(1).max(2),
})
type FormValues = z.infer<typeof schema>

export function GatewaysPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Gateway | null>(null)
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === "SUPER_ADMIN"

  const { data: gateways, isLoading } = useQuery({ queryKey: ["gateways"], queryFn: gatewaysApi.list })
  const { data: drivers } = useQuery({ queryKey: ["gateway-drivers"], queryFn: gatewaysApi.drivers.list })
  const { data: sites } = useQuery({ queryKey: ["sites"], queryFn: sitesApi.list })
  const { data: brokers } = useQuery({ queryKey: ["brokers"], queryFn: brokersApi.list, enabled: isSuperAdmin })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema) as Resolver<FormValues>,
      defaultValues: { baudRate: 9600, parity: "none", stopBits: 1 },
    })
  const driverId = watch("driverId")
  const siteId = watch("siteId")
  const parity = watch("parity")
  const mqttBrokerId = watch("mqttBrokerId")

  const createMutation = useMutation({
    mutationFn: gatewaysApi.register,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gateways"] })
      toast.success("Gateway registered")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Gateway> }) => gatewaysApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gateways"] })
      toast.success("Gateway updated")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: gatewaysApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gateways"] })
      toast.success("Gateway removed")
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const openCreate = () => {
    setEditing(null)
    reset({ serialNumber: "", driverId: "", mqttBrokerId: "", name: "", siteId: "", baudRate: 9600, parity: "none", stopBits: 1 })
    setOpen(true)
  }
  const openEdit = (gw: Gateway) => {
    setEditing(gw)
    reset({
      serialNumber: gw.serialNumber,
      driverId: gw.driverId,
      mqttBrokerId: gw.mqttBrokerId ?? "",
      name: gw.name ?? "",
      siteId: gw.siteId ?? "",
      baudRate: gw.baudRate,
      parity: gw.parity as FormValues["parity"],
      stopBits: gw.stopBits,
    })
    setOpen(true)
  }
  const closeDialog = () => {
    setOpen(false)
    setEditing(null)
    reset()
  }

  const onSubmit = (data: FormValues) => {
    if (editing) {
      return updateMutation.mutateAsync({
        id: editing.id,
        body: {
          name: data.name || undefined,
          siteId: data.siteId || undefined,
          mqttBrokerId: isSuperAdmin && data.mqttBrokerId ? data.mqttBrokerId : undefined,
          baudRate: data.baudRate,
          parity: data.parity,
          stopBits: data.stopBits,
        },
      })
    }
    return createMutation.mutateAsync({
      serialNumber: data.serialNumber,
      driverId: data.driverId,
      mqttBrokerId: data.mqttBrokerId,
      name: data.name || undefined,
      siteId: data.siteId || undefined,
      baudRate: data.baudRate,
      parity: data.parity,
      stopBits: data.stopBits,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gateways</h1>
          <p className="text-sm text-muted-foreground">
            Edge devices that bridge Modbus field equipment to the cloud.
          </p>
        </div>
        {isSuperAdmin && <Button onClick={openCreate}><Plus data-icon="inline-start" />Register Gateway</Button>}
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit "${editing.name ?? editing.serialNumber}"` : "Register a gateway"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Change the name or assigned site. Serial and driver can't be changed after registration."
                  : "Provide the gateway serial number and assign it to a site."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <Field data-invalid={errors.serialNumber ? true : undefined}>
                <FieldLabel htmlFor="serialNumber">Serial number</FieldLabel>
                <Input id="serialNumber" placeholder="TRB145-ABC123" disabled={!!editing} aria-invalid={!!errors.serialNumber} {...register("serialNumber")} />
                {errors.serialNumber && <FieldError>{errors.serialNumber.message}</FieldError>}
              </Field>

              <Field data-invalid={errors.driverId ? true : undefined}>
                <FieldLabel>Driver</FieldLabel>
                <Select value={driverId ?? ""} onValueChange={(v) => setValue("driverId", v ?? "", { shouldValidate: true })} disabled={!!editing}>
                  <SelectTrigger aria-invalid={!!errors.driverId}>
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {drivers?.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errors.driverId && <FieldError>{errors.driverId.message}</FieldError>}
              </Field>

              {isSuperAdmin && (
                <Field data-invalid={errors.mqttBrokerId ? true : undefined}>
                  <FieldLabel>MQTT Broker</FieldLabel>
                  <Select value={mqttBrokerId ?? ""} onValueChange={(v) => setValue("mqttBrokerId", v ?? "", { shouldValidate: true })}>
                    <SelectTrigger aria-invalid={!!errors.mqttBrokerId}>
                      <SelectValue placeholder="Select a broker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {brokers?.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {errors.mqttBrokerId && <FieldError>{errors.mqttBrokerId.message}</FieldError>}
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="name">Friendly name</FieldLabel>
                <Input id="name" placeholder="Main Panel Gateway" {...register("name")} />
              </Field>

              <Field>
                <FieldLabel>Site</FieldLabel>
                <Select value={siteId ?? ""} onValueChange={(v) => setValue("siteId", v ?? undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {sites?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <p className="-mb-2 text-xs font-medium uppercase text-muted-foreground">
                RS485 bus settings
              </p>

              <div className="grid grid-cols-3 gap-4">
                <Field data-invalid={errors.baudRate ? true : undefined}>
                  <FieldLabel htmlFor="baudRate">Baud rate</FieldLabel>
                  <Input id="baudRate" type="number" {...register("baudRate")} />
                </Field>
                <Field>
                  <FieldLabel>Parity</FieldLabel>
                  <Select value={parity} onValueChange={(v) => setValue("parity", v as FormValues["parity"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">none</SelectItem>
                        <SelectItem value="even">even</SelectItem>
                        <SelectItem value="odd">odd</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field data-invalid={errors.stopBits ? true : undefined}>
                  <FieldLabel htmlFor="stopBits">Stop bits</FieldLabel>
                  <Input id="stopBits" type="number" min={1} max={2} {...register("stopBits")} />
                </Field>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {editing ? "Save changes" : "Register"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex flex-col gap-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
      ) : !gateways?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Radio /></EmptyMedia>
            <EmptyTitle>No gateways</EmptyTitle>
            <EmptyDescription>Register a gateway to begin collecting data.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gateways.map((gw) => (
                <TableRow key={gw.id}>
                  <TableCell className="font-medium">{gw.name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{gw.serialNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{gw.driverName}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {gw.mqttBrokerName ?? <span className="italic text-destructive">unassigned</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      gw.status === "ONLINE" ? "default" :
                      gw.status === "OFFLINE" ? "destructive" : "secondary"
                    }>{gw.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {gw.lastSeen ? formatDistanceToNow(new Date(gw.lastSeen), { addSuffix: true }) : "never"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <EditButton onClick={() => openEdit(gw)} />
                      <DeleteConfirm
                        onConfirm={() => deleteMutation.mutate(gw.id)}
                        title={`Delete "${gw.name ?? gw.serialNumber}"?`}
                        description="This will also remove all devices attached to this gateway."
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
