import { useState, useLayoutEffect } from "react"
import { Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus, Cpu, GripVertical } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { devicesApi, deviceProfilesApi } from "@/api/devices"
import { gatewaysApi } from "@/api/gateways"
import { cn, sortByPositionOrName } from "@/lib/utils"
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
import type { Device } from "@/types/api"

const schema = z.object({
  gatewayId: z.string().min(1, "Gateway is required"),
  profileId: z.string().min(1, "Profile is required"),
  name: z.string().min(1, "Name is required"),
  slaveId: z.coerce.number().int().min(1).max(255),
  timeoutSeconds: z.coerce.number().int().min(1).max(60),
})
type FormValues = z.infer<typeof schema>

export function DevicesPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Device | null>(null)
  const queryClient = useQueryClient()

  const { data: devices, isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: () => devicesApi.list(),
  })

  // Local, draggable copy of the list — synced from the server whenever
  // fresh data arrives (initial load, or after a reorder round-trips),
  // but mutated directly during a drag for instant visual feedback instead
  // of waiting on a request.
  const [orderedDevices, setOrderedDevices] = useState<Device[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  useLayoutEffect(() => {
    if (devices) {
      setOrderedDevices(sortByPositionOrName(devices, (d) => d.sortOrder, (d) => d.name))
    }
  }, [devices])

  const reorderMutation = useMutation({
    mutationFn: (deviceIds: string[]) => devicesApi.reorder(deviceIds),
    onSuccess: (updated) => queryClient.setQueryData(["devices"], updated),
    onError: () => {
      toast.error("Failed to save the new order")
      queryClient.invalidateQueries({ queryKey: ["devices"] })
    },
  })

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    const next = [...orderedDevices]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, moved)
    setOrderedDevices(next)
    setDragIndex(null)
    reorderMutation.mutate(next.map((d) => d.id))
  }

  const { data: gateways } = useQuery({ queryKey: ["gateways"], queryFn: gatewaysApi.list })
  const { data: profiles } = useQuery({
    queryKey: ["device-profiles"],
    queryFn: deviceProfilesApi.list,
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> })
  const gatewayId = watch("gatewayId")
  const profileId = watch("profileId")

  const createMutation = useMutation({
    mutationFn: devicesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] })
      toast.success("Device added")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof devicesApi.update>[1] }) =>
      devicesApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] })
      toast.success("Device updated")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: devicesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] })
      toast.success("Device removed")
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const openCreate = () => {
    setEditing(null)
    reset({ gatewayId: "", profileId: "", name: "", slaveId: 1, timeoutSeconds: 5 })
    setOpen(true)
  }
  const openEdit = (d: Device) => {
    setEditing(d)
    reset({
      gatewayId: d.gatewayId,
      profileId: d.profileId,
      name: d.name,
      slaveId: d.slaveId,
      timeoutSeconds: d.timeoutSeconds,
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
        body: { name: data.name, timeoutSeconds: data.timeoutSeconds },
      })
    }
    return createMutation.mutateAsync({
      gatewayId: data.gatewayId,
      profileId: data.profileId,
      name: data.name,
      slaveId: data.slaveId,
      timeoutSeconds: data.timeoutSeconds,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Devices</h1>
          <p className="text-sm text-muted-foreground">
            Individual field devices polled through a gateway.
          </p>
        </div>
        <Button onClick={openCreate}><Plus data-icon="inline-start" />Add Device</Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit "${editing.name}"` : "Add a device"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Only the name can be changed — gateway, profile, and slave ID are fixed."
                  : "Attach a physical device to a gateway using a device profile."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <Field data-invalid={errors.gatewayId ? true : undefined}>
                <FieldLabel>Gateway</FieldLabel>
                <Select value={gatewayId ?? ""} onValueChange={(v) => setValue("gatewayId", v ?? "", { shouldValidate: true })} disabled={!!editing}>
                  <SelectTrigger aria-invalid={!!errors.gatewayId}>
                    <SelectValue placeholder="Select a gateway">
                      {(value: string | null) => { const g = gateways?.find((g) => g.id === value); return g ? (g.name ?? g.serialNumber) : value }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {gateways?.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name ?? g.serialNumber}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errors.gatewayId && <FieldError>{errors.gatewayId.message}</FieldError>}
              </Field>

              <Field data-invalid={errors.profileId ? true : undefined}>
                <FieldLabel>Device profile</FieldLabel>
                <Select value={profileId ?? ""} onValueChange={(v) => setValue("profileId", v ?? "", { shouldValidate: true })} disabled={!!editing}>
                  <SelectTrigger aria-invalid={!!errors.profileId}>
                    <SelectValue placeholder="Select a profile">
                      {(value: string | null) => { const p = profiles?.find((p) => p.id === value); return p ? `${p.name}${p.global ? " (global)" : ""}` : value }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {profiles?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} {p.global && "(global)"}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errors.profileId && <FieldError>{errors.profileId.message}</FieldError>}
              </Field>

              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="name">Device name</FieldLabel>
                <Input id="name" placeholder="Main Meter" aria-invalid={!!errors.name} {...register("name")} />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={errors.slaveId ? true : undefined}>
                  <FieldLabel htmlFor="slaveId">Modbus slave ID</FieldLabel>
                  <Input id="slaveId" type="number" min={1} max={255} disabled={!!editing} aria-invalid={!!errors.slaveId} {...register("slaveId")} />
                  {errors.slaveId && <FieldError>{errors.slaveId.message}</FieldError>}
                </Field>
                <Field data-invalid={errors.timeoutSeconds ? true : undefined}>
                  <FieldLabel htmlFor="timeoutSeconds">Timeout (s)</FieldLabel>
                  <Input id="timeoutSeconds" type="number" min={1} max={60} {...register("timeoutSeconds")} />
                  {errors.timeoutSeconds && <FieldError>{errors.timeoutSeconds.message}</FieldError>}
                </Field>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {editing ? "Save changes" : "Add device"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex flex-col gap-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
      ) : !devices?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Cpu /></EmptyMedia>
            <EmptyTitle>No devices</EmptyTitle>
            <EmptyDescription>Add a device to start ingesting readings.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Slave ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last reading</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedDevices.map((d, i) => (
                <TableRow
                  key={d.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                  className={cn(dragIndex === i && "opacity-50")}
                >
                  <TableCell className="w-8">
                    <span
                      draggable
                      onDragStart={() => setDragIndex(i)}
                      onDragEnd={() => setDragIndex(null)}
                      className="flex cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
                      title="Drag to reorder"
                    >
                      <GripVertical className="size-4" />
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link to={`/devices/${d.id}`} className="hover:underline">{d.name}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{d.profileName}</TableCell>
                  <TableCell className="font-mono text-xs">{d.slaveId}</TableCell>
                  <TableCell>
                    <Badge variant={
                      d.status === "ONLINE" ? "default" :
                      d.status === "ERROR" ? "destructive" : "secondary"
                    }>{d.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.lastReadingAt ? formatDistanceToNow(new Date(d.lastReadingAt), { addSuffix: true }) : "never"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <EditButton onClick={() => openEdit(d)} />
                      <DeleteConfirm
                        onConfirm={() => deleteMutation.mutate(d.id)}
                        title={`Delete "${d.name}"?`}
                        description="This permanently deletes all of its historical readings, alerts, and command history. This cannot be undone."
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
