import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus, MapPin, Layers } from "lucide-react"

import { sitesApi } from "@/api/sites"
import { NewSiteWizard } from "./NewSiteWizard"
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
import type { Site, Zone } from "@/types/api"

const zoneSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
})
type ZoneFormValues = z.infer<typeof zoneSchema>

function ZonesDialog({ site, open, onClose }: { site: Site; open: boolean; onClose: () => void }) {
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["zones", site.id],
    queryFn: () => sitesApi.listZones(site.id),
    enabled: open,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<ZoneFormValues>({ resolver: zodResolver(zoneSchema) })

  const createZone = useMutation({
    mutationFn: (body: ZoneFormValues) => sitesApi.createZone(site.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones", site.id] })
      toast.success("Zone created")
      setAddOpen(false)
      reset()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const updateZone = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ZoneFormValues }) =>
      sitesApi.updateZone(site.id, id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones", site.id] })
      toast.success("Zone updated")
      setEditingZone(null)
      reset()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const deleteZone = useMutation({
    mutationFn: (id: string) => sitesApi.deleteZone(site.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones", site.id] })
      toast.success("Zone deleted")
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const openAdd = () => {
    setEditingZone(null)
    reset({ name: "", description: "" })
    setAddOpen(true)
  }

  const openEdit = (z: Zone) => {
    setEditingZone(z)
    reset({ name: z.name, description: z.description ?? "" })
    setAddOpen(true)
  }

  const closeForm = () => {
    setAddOpen(false)
    setEditingZone(null)
    reset()
  }

  const onSubmit = (data: ZoneFormValues) => {
    const body = { ...data, description: data.description || undefined }
    return editingZone
      ? updateZone.mutateAsync({ id: editingZone.id, body })
      : createZone.mutateAsync(body)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Zones — {site.name}</DialogTitle>
          <DialogDescription>
            Zones divide a site into sections (e.g. polyhouse sections, floors, areas).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : zones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No zones yet. Add one below.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((z) => (
                    <TableRow key={z.id}>
                      <TableCell className="font-medium">{z.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{z.description ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <EditButton onClick={() => openEdit(z)} />
                          <DeleteConfirm
                            onConfirm={() => deleteZone.mutate(z.id)}
                            title={`Delete "${z.name}"?`}
                            description="Devices assigned to this zone will become unassigned."
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {addOpen ? (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 rounded-md border p-3">
              <p className="text-sm font-medium">{editingZone ? `Edit "${editingZone.name}"` : "New zone"}</p>
              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="zoneName">Name</FieldLabel>
                <Input id="zoneName" placeholder="Section-1" {...register("name")} />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="zoneDesc">Description</FieldLabel>
                <Input id="zoneDesc" placeholder="Optional" {...register("description")} />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting && <Spinner data-icon="inline-start" />}
                  {editingZone ? "Save" : "Create"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={closeForm}>Cancel</Button>
              </div>
            </form>
          ) : (
            <Button size="sm" variant="outline" onClick={openAdd} className="self-start">
              <Plus data-icon="inline-start" />Add zone
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const schema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  address: z.string().optional(),
  timezone: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function SitesPage() {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Site | null>(null)
  const [zonesFor, setZonesFor] = useState<Site | null>(null)
  const queryClient = useQueryClient()

  const { data: sites, isLoading } = useQuery({ queryKey: ["sites"], queryFn: sitesApi.list })

  const createMutation = useMutation({
    mutationFn: sitesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] })
      toast.success("Site created")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Site> }) => sitesApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] })
      toast.success("Site updated")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: sitesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] })
      toast.success("Site deleted")
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  const openCreate = () => setWizardOpen(true)
  const openEdit = (site: Site) => {
    setEditing(site)
    reset({ name: site.name, address: site.address ?? "", timezone: site.timezone })
    setOpen(true)
  }
  const closeDialog = () => {
    setOpen(false)
    setEditing(null)
    reset()
  }

  const onSubmit = (data: FormValues) => {
    const body = { ...data, timezone: data.timezone || "UTC" }
    return editing
      ? updateMutation.mutateAsync({ id: editing.id, body })
      : createMutation.mutateAsync(body)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sites</h1>
          <p className="text-sm text-muted-foreground">
            Physical locations where equipment is installed.
          </p>
        </div>

        <Button onClick={openCreate}><Plus data-icon="inline-start" />New Site</Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit "${editing.name}"` : "Create new site"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update the site details." : "Add a physical location to host gateways and devices."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" placeholder="Mumbai Plant" aria-invalid={!!errors.name} {...register("name")} />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Input id="address" placeholder="Optional" {...register("address")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
                <Input id="timezone" placeholder="UTC" {...register("timezone")} />
              </Field>
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
      ) : !sites?.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><MapPin /></EmptyMedia>
            <EmptyTitle>No sites yet</EmptyTitle>
            <EmptyDescription>Create your first site to start adding gateways and devices.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell className="font-medium">{site.name}</TableCell>
                  <TableCell className="text-muted-foreground">{site.address ?? "—"}</TableCell>
                  <TableCell>{site.timezone}</TableCell>
                  <TableCell>
                    <Badge variant={site.status === "ACTIVE" ? "default" : "secondary"}>{site.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Manage zones"
                        onClick={() => setZonesFor(site)}
                      >
                        <Layers className="size-4" />
                      </Button>
                      <EditButton onClick={() => openEdit(site)} />
                      <DeleteConfirm
                        onConfirm={() => deleteMutation.mutate(site.id)}
                        title={`Delete "${site.name}"?`}
                        description="This will also remove any zones, gateways and devices attached to this site."
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {zonesFor && (
        <ZonesDialog
          site={zonesFor}
          open={!!zonesFor}
          onClose={() => setZonesFor(null)}
        />
      )}

      <NewSiteWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  )
}
