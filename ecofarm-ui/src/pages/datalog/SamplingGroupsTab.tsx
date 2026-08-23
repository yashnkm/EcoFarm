import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus, X } from "lucide-react"

import { samplingGroupsApi, type ChannelRefBody } from "@/api/samplingGroups"
import { sitesApi } from "@/api/sites"
import { devicesApi } from "@/api/devices"
import { dataPointsApi } from "@/api/deviceProfiles"
import { useAuthStore } from "@/store/authStore"
import { cn, naturalCompare } from "@/lib/utils"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { DeleteConfirm } from "@/components/DeleteConfirm"
import { EditButton } from "@/components/EditButton"
import type { SamplingGroup, SamplingChannel } from "@/types/api"

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function SamplingGroupsTab() {
  const user = useAuthStore((s) => s.user)
  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "TENANT_ADMIN"
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SamplingGroup | null>(null)
  const [channels, setChannels] = useState<SamplingChannel[]>([])
  const [pickerSiteId, setPickerSiteId] = useState("all")
  const [pickerDeviceId, setPickerDeviceId] = useState("")
  const [pickerDeviceFilter, setPickerDeviceFilter] = useState("")
  const [deviceListOpen, setDeviceListOpen] = useState(false)
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set())

  const { data: groups, isLoading } = useQuery({ queryKey: ["sampling-groups"], queryFn: samplingGroupsApi.list })
  const { data: sites } = useQuery({ queryKey: ["sites"], queryFn: sitesApi.list })
  const { data: devices } = useQuery({ queryKey: ["devices"], queryFn: () => devicesApi.list() })

  const pickerDevice = devices?.find((d) => d.id === pickerDeviceId)
  const { data: pickerDataPoints } = useQuery({
    queryKey: ["data-points", pickerDevice?.profileId],
    queryFn: () => dataPointsApi.list(pickerDevice!.profileId),
    enabled: !!pickerDevice?.profileId,
  })
  const recordedOptions = (pickerDataPoints ?? []).filter((dp) => pickerDevice?.recordedDataPoints.includes(dp.key))
  const sortedSites = [...(sites ?? [])].sort((a, b) => naturalCompare(a.name, b.name))
  const devicesForSite = (devices ?? [])
    .filter((d) => pickerSiteId === "all" || d.siteId === pickerSiteId)
    .filter((d) => d.name.toLowerCase().includes(pickerDeviceFilter.trim().toLowerCase()))
    .sort((a, b) => naturalCompare(a.name, b.name))

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const invalidateAndClose = (message: string) => {
    queryClient.invalidateQueries({ queryKey: ["sampling-groups"] })
    toast.success(message)
    closeDialog()
  }
  const onError = (err: { response?: { data?: { message?: string } } }) =>
    toast.error(err.response?.data?.message ?? "Failed")

  const createMutation = useMutation({
    mutationFn: (body: { name: string; description?: string; channels: ChannelRefBody[] }) =>
      samplingGroupsApi.create(body),
    onSuccess: () => invalidateAndClose("Sampling group created"),
    onError,
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string; description?: string; channels: ChannelRefBody[] } }) =>
      samplingGroupsApi.update(id, body),
    onSuccess: () => invalidateAndClose("Sampling group updated"),
    onError,
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => samplingGroupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sampling-groups"] })
      toast.success("Sampling group deleted")
    },
  })

  const openCreate = () => {
    setEditing(null)
    setChannels([])
    resetPicker()
    reset({ name: "", description: "" })
    setOpen(true)
  }
  const openEdit = (g: SamplingGroup) => {
    setEditing(g)
    setChannels(g.channels)
    resetPicker()
    reset({ name: g.name, description: g.description ?? "" })
    setOpen(true)
  }
  const closeDialog = () => {
    setOpen(false)
    setEditing(null)
    setChannels([])
    resetPicker()
    reset()
  }
  const resetPicker = () => {
    setPickerSiteId("all")
    setPickerDeviceId("")
    setPickerDeviceFilter("")
    setDeviceListOpen(false)
    setPickerSelected(new Set())
  }

  const addSelectedChannels = () => {
    if (!pickerDevice) return
    const toAdd: SamplingChannel[] = recordedOptions
      .filter((dp) => pickerSelected.has(dp.key))
      .map((dp) => ({
        deviceId: pickerDevice.id,
        deviceName: pickerDevice.name,
        siteId: pickerDevice.siteId,
        siteName: sites?.find((s) => s.id === pickerDevice.siteId)?.name ?? null,
        dataPointKey: dp.key,
        label: dp.label,
        unit: dp.unit,
      }))
    setChannels((prev) => {
      const existing = new Set(prev.map((c) => `${c.deviceId}:${c.dataPointKey}`))
      return [...prev, ...toAdd.filter((c) => !existing.has(`${c.deviceId}:${c.dataPointKey}`))]
    })
    setPickerSelected(new Set())
  }

  const removeChannel = (deviceId: string, dataPointKey: string) => {
    setChannels((prev) => prev.filter((c) => !(c.deviceId === deviceId && c.dataPointKey === dataPointKey)))
  }

  const onSubmit = (d: FormValues) => {
    if (!channels.length) {
      toast.error("Add at least one channel")
      return
    }
    const body = {
      name: d.name,
      description: d.description || undefined,
      channels: channels.map((c) => ({ deviceId: c.deviceId, dataPointKey: c.dataPointKey })),
    }
    return editing ? updateMutation.mutateAsync({ id: editing.id, body }) : createMutation.mutateAsync(body)
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}><Plus data-icon="inline-start" />Add Sampling Group</Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit "${editing.name}"` : "Add Sampling Group"}</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="sgname">Name</FieldLabel>
                <Input id="sgname" placeholder="DATA LOG" {...register("name")} />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="sgdesc">Description</FieldLabel>
                <Input id="sgdesc" placeholder="Optional" {...register("description")} />
              </Field>

              <div className="flex flex-col gap-3 rounded-lg border p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Add channels</p>
                <FieldDescription className="-mt-1">
                  Only data points with recording enabled on the device show up here — enable recording from the
                  device's own page first if the one you want is missing.
                </FieldDescription>

                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Site</FieldLabel>
                    <Select value={pickerSiteId} onValueChange={(v) => { setPickerSiteId(v ?? "all"); setPickerDeviceId(""); setPickerDeviceFilter(""); setPickerSelected(new Set()) }}>
                      <SelectTrigger size="sm">
                        <SelectValue placeholder="All sites">
                          {(value: string | null) => value === "all" || !value ? "All sites" : sites?.find((s) => s.id === value)?.name ?? value}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="all">All sites</SelectItem>
                          {sortedSites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Device</FieldLabel>
                    {/* A plain Select can't hold a search box — Base UI's
                        Select.List only renders Item/Group children, so an
                        embedded <Input> silently doesn't render at all. This
                        is the same collapsible-panel pattern the channel
                        checklist above (OriginalDataTab) already uses. */}
                    <details
                      open={deviceListOpen}
                      onToggle={(e) => setDeviceListOpen(e.currentTarget.open)}
                      className="relative"
                    >
                      <summary className="flex h-7 cursor-pointer list-none items-center justify-between rounded-[min(var(--radius-md),10px)] border border-input bg-transparent px-2.5 text-sm shadow-xs dark:bg-input/30">
                        <span className="truncate">
                          {devices?.find((d) => d.id === pickerDeviceId)?.name ?? "Select device"}
                        </span>
                      </summary>
                      <div className="themed-scrollbar absolute z-20 mt-1 max-h-64 w-64 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                        <Input
                          value={pickerDeviceFilter}
                          onChange={(e) => setPickerDeviceFilter(e.target.value)}
                          placeholder="Filter devices…"
                          className="mb-1 h-8"
                          autoFocus
                        />
                        {!devicesForSite.length ? (
                          <p className="px-2 py-1.5 text-xs text-muted-foreground">No devices match.</p>
                        ) : (
                          devicesForSite.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                setPickerDeviceId(d.id)
                                setPickerSelected(new Set())
                                setDeviceListOpen(false)
                              }}
                              className={cn(
                                "block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                                d.id === pickerDeviceId && "bg-accent"
                              )}
                            >
                              {d.name}
                            </button>
                          ))
                        )}
                      </div>
                    </details>
                  </Field>
                </div>

                {pickerDeviceId && (
                  !recordedOptions.length ? (
                    <p className="text-xs text-muted-foreground">
                      No recording-enabled data points on this device.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1 rounded-md border p-2">
                      {recordedOptions.map((dp) => (
                        <label key={dp.key} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
                          <input
                            type="checkbox"
                            checked={pickerSelected.has(dp.key)}
                            onChange={() => setPickerSelected((prev) => {
                              const next = new Set(prev)
                              if (next.has(dp.key)) next.delete(dp.key)
                              else next.add(dp.key)
                              return next
                            })}
                            className="size-4 rounded border-input"
                          />
                          {dp.label} <span className="font-mono text-xs text-muted-foreground">({dp.key})</span>
                        </label>
                      ))}
                    </div>
                  )
                )}

                <Button type="button" size="sm" variant="outline" disabled={!pickerSelected.size} onClick={addSelectedChannels}>
                  Add selected
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Channels in this group ({channels.length})
                </p>
                {!channels.length ? (
                  <p className="text-sm text-muted-foreground">No channels added yet.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {channels.map((c) => (
                      <div key={`${c.deviceId}:${c.dataPointKey}`} className="flex items-center justify-between rounded-md border px-2 py-1.5 text-sm">
                        <span>{c.deviceName} · {c.label}{c.unit ? ` (${c.unit})` : ""}</span>
                        <button type="button" onClick={() => removeChannel(c.deviceId, c.dataPointKey)} className="text-muted-foreground hover:text-destructive">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
        <p className="text-sm text-muted-foreground">
          No Sampling Groups yet. {canManage ? "Add one to start viewing readings in Original Data." : "Ask an admin to add one."}
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Created</TableHead>
                {canManage && <TableHead className="w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{g.description ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{g.channels.length}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(g.createdAt).toLocaleDateString()}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <EditButton onClick={() => openEdit(g)} />
                        <DeleteConfirm onConfirm={() => deleteMutation.mutate(g.id)} title={`Delete "${g.name}"?`} />
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
