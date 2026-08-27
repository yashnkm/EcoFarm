import { useState } from "react"
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus, ChevronRight, ChevronLeft, Search } from "lucide-react"

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

const channelKeyOf = (c: SamplingChannel) => `${c.deviceId}:${c.dataPointKey}`

function toggle(set: Set<string>, key: string): Set<string> {
  const next = new Set(set)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  return next
}

export function SamplingGroupsTab() {
  const user = useAuthStore((s) => s.user)
  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "TENANT_ADMIN"
  const isSuperAdmin = user?.role === "SUPER_ADMIN"
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SamplingGroup | null>(null)
  const [channels, setChannels] = useState<SamplingChannel[]>([])
  const [pickerSiteId, setPickerSiteId] = useState("all")
  const [pickerSearch, setPickerSearch] = useState("")
  const [leftSelected, setLeftSelected] = useState<Set<string>>(new Set())
  const [rightSelected, setRightSelected] = useState<Set<string>>(new Set())

  const { data: groups, isLoading } = useQuery({ queryKey: ["sampling-groups"], queryFn: samplingGroupsApi.list })
  const { data: sites } = useQuery({ queryKey: ["sites"], queryFn: sitesApi.list })
  const { data: devices } = useQuery({ queryKey: ["devices"], queryFn: () => devicesApi.list() })

  // Every device's profile's data points, fetched once per unique profile
  // (most devices share a profile, and react-query dedupes identical keys
  // anyway) — needed to resolve each recorded key into a label/unit for
  // display, without a per-device round trip.
  const uniqueProfileIds = [...new Set((devices ?? []).map((d) => d.profileId))]
  const dataPointQueries = useQueries({
    queries: uniqueProfileIds.map((profileId) => ({
      queryKey: ["data-points", profileId],
      queryFn: () => dataPointsApi.list(profileId),
    })),
  })
  const dataPointsByProfile = new Map(uniqueProfileIds.map((id, i) => [id, dataPointQueries[i]?.data ?? []]))

  // Every (device, data point) pair across the whole tenant that's eligible
  // to become a channel — i.e. recording is already enabled for it.
  const allCandidates: SamplingChannel[] = (devices ?? []).flatMap((d) => {
    const dps = dataPointsByProfile.get(d.profileId) ?? []
    return d.recordedDataPoints
      .map((key) => dps.find((dp) => dp.key === key))
      .filter((dp): dp is NonNullable<typeof dp> => !!dp)
      .map((dp) => ({
        deviceId: d.id,
        deviceName: d.name,
        siteId: d.siteId,
        siteName: sites?.find((s) => s.id === d.siteId)?.name ?? null,
        dataPointKey: dp.key,
        label: dp.label,
        unit: dp.unit,
      }))
  })

  const sortedSites = [...(sites ?? [])].sort((a, b) => naturalCompare(a.name, b.name))
  const enabledKeys = new Set(channels.map(channelKeyOf))
  const searchQuery = pickerSearch.trim().toLowerCase()
  const availableChannels = allCandidates
    .filter((c) => !enabledKeys.has(channelKeyOf(c)))
    .filter((c) => pickerSiteId === "all" || c.siteId === pickerSiteId)
    .filter((c) =>
      !searchQuery
      || c.label.toLowerCase().includes(searchQuery)
      || c.dataPointKey.toLowerCase().includes(searchQuery)
      || c.deviceName.toLowerCase().includes(searchQuery)
    )
    .sort((a, b) => naturalCompare(a.deviceName, b.deviceName) || naturalCompare(a.label, b.label))

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
    setPickerSearch("")
    setLeftSelected(new Set())
    setRightSelected(new Set())
  }

  const moveToEnabled = () => {
    const toAdd = availableChannels.filter((c) => leftSelected.has(channelKeyOf(c)))
    setChannels((prev) => [...prev, ...toAdd])
    setLeftSelected(new Set())
  }
  const moveToAvailable = () => {
    setChannels((prev) => prev.filter((c) => !rightSelected.has(channelKeyOf(c))))
    setRightSelected(new Set())
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
        <DialogContent className="sm:max-w-2xl">
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
                  Only data points with recording enabled on a device show up as available — enable recording from
                  the device's own page first if the one you want is missing.
                </FieldDescription>

                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Site</FieldLabel>
                    <Select value={pickerSiteId} onValueChange={(v) => { setPickerSiteId(v ?? "all"); setLeftSelected(new Set()) }}>
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
                    <FieldLabel>Search</FieldLabel>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        placeholder="Key, label, or device…"
                        className="h-7 pl-7"
                      />
                    </div>
                  </Field>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-muted-foreground">Available Channels ({availableChannels.length})</p>
                    <div className="themed-scrollbar h-56 overflow-y-auto rounded-md border p-1">
                      {!availableChannels.length ? (
                        <p className="p-2 text-xs text-muted-foreground">No channels match.</p>
                      ) : (
                        availableChannels.map((c) => {
                          const key = channelKeyOf(c)
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setLeftSelected((prev) => toggle(prev, key))}
                              className={cn(
                                "block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                                leftSelected.has(key) && "bg-accent"
                              )}
                            >
                              <span className="font-medium">{c.deviceName}</span> · {c.label}
                              <span className="ml-1 font-mono text-xs text-muted-foreground">({c.dataPointKey})</span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button type="button" size="icon-sm" variant="outline" disabled={!leftSelected.size} onClick={moveToEnabled} title="Add">
                      <ChevronRight className="size-4" />
                    </Button>
                    <Button type="button" size="icon-sm" variant="outline" disabled={!rightSelected.size} onClick={moveToAvailable} title="Remove">
                      <ChevronLeft className="size-4" />
                    </Button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-muted-foreground">Enabled Channels ({channels.length})</p>
                    <div className="themed-scrollbar h-56 overflow-y-auto rounded-md border p-1">
                      {!channels.length ? (
                        <p className="p-2 text-xs text-muted-foreground">None yet.</p>
                      ) : (
                        channels.map((c) => {
                          const key = channelKeyOf(c)
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setRightSelected((prev) => toggle(prev, key))}
                              className={cn(
                                "block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                                rightSelected.has(key) && "bg-accent"
                              )}
                            >
                              <span className="font-medium">{c.deviceName}</span> · {c.label}
                              <span className="ml-1 font-mono text-xs text-muted-foreground">({c.dataPointKey})</span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
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
                        {isSuperAdmin && (
                          <DeleteConfirm onConfirm={() => deleteMutation.mutate(g.id)} title={`Delete "${g.name}"?`} />
                        )}
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
