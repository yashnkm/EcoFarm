import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Check, Plus } from "lucide-react"

import { sitesApi } from "@/api/sites"
import { gatewaysApi } from "@/api/gateways"
import { devicesApi } from "@/api/devices"
import { deviceProfilesApi } from "@/api/deviceProfiles"
import { brokersApi } from "@/api/brokers"
import { useAuthStore } from "@/store/authStore"
import type { Site } from "@/types/api"

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
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"

// ── Schemas ───────────────────────────────────────────────────────────────────

const siteSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  address: z.string().optional(),
  timezone: z.string().optional(),
})
type SiteForm = z.infer<typeof siteSchema>

const gwRegisterSchema = z.object({
  serialNumber: z.string().min(1, "Serial number is required"),
  driverId: z.string().min(1, "Driver is required"),
  mqttBrokerId: z.string().min(1, "Broker is required"),
  name: z.string().optional(),
})
type GwRegisterForm = z.infer<typeof gwRegisterSchema>

const deviceSchema = z.object({
  profileId: z.string().min(1, "Profile is required"),
  name: z.string().min(1, "Name is required"),
  slaveId: z.coerce.number().int().min(1, "Must be 1–255").max(255, "Must be 1–255"),
  timeoutSeconds: z.coerce.number().int().min(1).max(60),
})
type DeviceForm = z.infer<typeof deviceSchema>

// ── Step Progress ─────────────────────────────────────────────────────────────

function StepProgress({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Site", "Gateway", "Devices"]
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, idx) => {
        const n = idx + 1
        const done = n < current
        const active = n === current
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={[
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                      ? "border-2 border-primary text-primary"
                      : "border border-muted-foreground/30 text-muted-foreground",
                ].join(" ")}
              >
                {done ? <Check className="size-3" /> : n}
              </div>
              <span
                className={
                  active ? "text-sm font-medium" : "text-sm text-muted-foreground"
                }
              >
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && <div className="h-px w-6 bg-border" />}
          </div>
        )
      })}
    </div>
  )
}

// ── Wizard ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
}

export function NewSiteWizard({ open, onClose }: Props) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === "SUPER_ADMIN"

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [savedSite, setSavedSite] = useState<Site | null>(null)
  const [savedGatewayId, setSavedGatewayId] = useState<string | null>(null)

  // ── Step 1 — Site ─────────────────────────────────────────────────────────

  const {
    register: regSite,
    handleSubmit: handleSiteSubmit,
    reset: resetSite,
    formState: { errors: siteErrors, isSubmitting: siteSubmitting },
  } = useForm<SiteForm>({ resolver: zodResolver(siteSchema) })

  const createSiteMutation = useMutation({
    mutationFn: sitesApi.create,
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed to create site"),
  })
  const updateSiteMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Site> }) =>
      sitesApi.update(id, body),
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed to update site"),
  })

  async function saveSiteData(data: SiteForm): Promise<Site | null> {
    const body = { ...data, timezone: data.timezone || "UTC" }
    try {
      if (savedSite) {
        return await updateSiteMutation.mutateAsync({ id: savedSite.id, body })
      }
      return await createSiteMutation.mutateAsync(body)
    } catch {
      return null
    }
  }

  const onStep1Continue = handleSiteSubmit(async (data) => {
    const site = await saveSiteData(data)
    if (!site) return
    setSavedSite(site)
    queryClient.invalidateQueries({ queryKey: ["sites"] })
    setStep(2)
  })

  const onStep1Exit = handleSiteSubmit(async (data) => {
    const site = await saveSiteData(data)
    if (!site) return
    setSavedSite(site)
    queryClient.invalidateQueries({ queryKey: ["sites"] })
    toast.success("Site saved")
    doClose()
  })

  // ── Step 2 — Gateway ──────────────────────────────────────────────────────

  const [gwTab, setGwTab] = useState<string>("select")
  const [selectedGwId, setSelectedGwId] = useState<string>("")

  const { data: gateways } = useQuery({
    queryKey: ["gateways"],
    queryFn: gatewaysApi.list,
  })
  const { data: drivers } = useQuery({
    queryKey: ["gateway-drivers"],
    queryFn: gatewaysApi.drivers.list,
    enabled: isSuperAdmin,
  })
  const { data: brokers } = useQuery({
    queryKey: ["brokers"],
    queryFn: brokersApi.list,
    enabled: isSuperAdmin,
  })

  const {
    register: regGw,
    handleSubmit: handleGwSubmit,
    setValue: setGwValue,
    watch: watchGw,
    reset: resetGw,
    formState: { errors: gwErrors },
  } = useForm<GwRegisterForm>({
    resolver: zodResolver(gwRegisterSchema) as Resolver<GwRegisterForm>,
    defaultValues: { serialNumber: "", driverId: "", mqttBrokerId: "", name: "" },
  })
  const gwDriverId = watchGw("driverId")
  const gwBrokerId = watchGw("mqttBrokerId")

  const linkGatewayMutation = useMutation({
    mutationFn: (gwId: string) => gatewaysApi.update(gwId, { siteId: savedSite!.id }),
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed to link gateway"),
  })

  const registerGatewayMutation = useMutation({
    mutationFn: (body: GwRegisterForm) =>
      gatewaysApi.register({ ...body, siteId: savedSite!.id }),
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed to register gateway"),
  })

  async function handleStep2Continue() {
    if (gwTab === "select") {
      if (!selectedGwId) {
        toast.error("Select a gateway to link")
        return
      }
      if (selectedGwId !== savedGatewayId) {
        try {
          await linkGatewayMutation.mutateAsync(selectedGwId)
          queryClient.invalidateQueries({ queryKey: ["gateways"] })
          setSavedGatewayId(selectedGwId)
        } catch {
          return
        }
      }
      setStep(3)
    } else {
      await handleGwSubmit(async (data) => {
        try {
          const gw = await registerGatewayMutation.mutateAsync(data)
          queryClient.invalidateQueries({ queryKey: ["gateways"] })
          setSavedGatewayId(gw.id)
          setStep(3)
        } catch { /* handled by mutation onError */ }
      })()
    }
  }

  const step2Busy = linkGatewayMutation.isPending || registerGatewayMutation.isPending

  // ── Step 3 — Devices ──────────────────────────────────────────────────────

  const { data: existingDevices, isLoading: devicesLoading } = useQuery({
    queryKey: ["devices", savedGatewayId],
    queryFn: () => devicesApi.list(savedGatewayId!),
    enabled: step === 3 && !!savedGatewayId,
  })
  const { data: profiles } = useQuery({
    queryKey: ["device-profiles"],
    queryFn: deviceProfilesApi.list,
    enabled: step === 3,
  })

  const [showDeviceForm, setShowDeviceForm] = useState(false)
  const {
    register: regDev,
    handleSubmit: handleDevSubmit,
    setValue: setDevValue,
    watch: watchDev,
    reset: resetDev,
    formState: { errors: devErrors, isSubmitting: devSubmitting },
  } = useForm<DeviceForm>({
    resolver: zodResolver(deviceSchema) as Resolver<DeviceForm>,
    defaultValues: { profileId: "", name: "", timeoutSeconds: 10 },
  })
  const devProfileId = watchDev("profileId")

  const createDeviceMutation = useMutation({
    mutationFn: (body: DeviceForm) =>
      devicesApi.create({ gatewayId: savedGatewayId!, ...body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices", savedGatewayId] })
      queryClient.invalidateQueries({ queryKey: ["devices"] })
      toast.success("Device added")
      resetDev()
      setShowDeviceForm(false)
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed to add device"),
  })

  const onDeviceSubmit = handleDevSubmit(async (data) => {
    await createDeviceMutation.mutateAsync(data)
  })

  // ── Shared ────────────────────────────────────────────────────────────────

  function doClose() {
    onClose()
    setStep(1)
    setSavedSite(null)
    setSavedGatewayId(null)
    setSelectedGwId("")
    setGwTab("select")
    setShowDeviceForm(false)
    resetSite()
    resetGw()
    resetDev()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && doClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Site</DialogTitle>
          <DialogDescription>
            Set up a site, link a gateway, and add devices in one flow.
          </DialogDescription>
        </DialogHeader>

        <div className="py-1">
          <StepProgress current={step} />
        </div>

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <Field data-invalid={siteErrors.name ? true : undefined}>
              <FieldLabel htmlFor="wiz-name">Name</FieldLabel>
              <Input id="wiz-name" placeholder="Mumbai Plant" {...regSite("name")} />
              {siteErrors.name && <FieldError>{siteErrors.name.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="wiz-addr">Address</FieldLabel>
              <Input id="wiz-addr" placeholder="Optional" {...regSite("address")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="wiz-tz">Timezone</FieldLabel>
              <Input id="wiz-tz" placeholder="UTC" {...regSite("timezone")} />
            </Field>

            <DialogFooter className="flex-row justify-between sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={siteSubmitting}
                onClick={onStep1Exit}
              >
                {siteSubmitting && <Spinner data-icon="inline-start" />}
                Save & Exit
              </Button>
              <Button
                type="button"
                disabled={siteSubmitting}
                onClick={onStep1Continue}
              >
                {siteSubmitting && <Spinner data-icon="inline-start" />}
                Save & Continue
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <Tabs value={gwTab} onValueChange={setGwTab}>
              <TabsList>
                <TabsTrigger value="select">Select Existing</TabsTrigger>
                {isSuperAdmin && (
                  <TabsTrigger value="register">Register New</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="select" className="mt-4">
                <Field>
                  <FieldLabel>Gateway</FieldLabel>
                  <Select
                    value={selectedGwId}
                    onValueChange={(v) => setSelectedGwId(v ?? "")}
                  >
                    <SelectTrigger>
                      <span className="flex flex-1 truncate text-left text-sm">
                        {selectedGwId
                          ? (gateways?.find((g) => g.id === selectedGwId)?.name ??
                             gateways?.find((g) => g.id === selectedGwId)?.serialNumber ??
                             "Select gateway")
                          : "Select gateway"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {gateways?.map((gw) => (
                        <SelectItem key={gw.id} value={gw.id}>
                          {gw.name ?? gw.serialNumber}
                          {gw.siteId && gw.siteId !== savedSite?.id
                            ? " (assigned)"
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </TabsContent>

              {isSuperAdmin && (
                <TabsContent value="register" className="mt-4 flex flex-col gap-3">
                  <Field data-invalid={gwErrors.serialNumber ? true : undefined}>
                    <FieldLabel htmlFor="gw-serial">Serial Number</FieldLabel>
                    <Input
                      id="gw-serial"
                      placeholder="GW-001"
                      {...regGw("serialNumber")}
                    />
                    {gwErrors.serialNumber && (
                      <FieldError>{gwErrors.serialNumber.message}</FieldError>
                    )}
                  </Field>
                  <Field data-invalid={gwErrors.driverId ? true : undefined}>
                    <FieldLabel>Driver</FieldLabel>
                    <Select
                      value={gwDriverId}
                      onValueChange={(v) =>
                        setGwValue("driverId", v ?? "", { shouldValidate: true })
                      }
                    >
                      <SelectTrigger>
                        <span className="flex flex-1 truncate text-left text-sm">
                          {gwDriverId
                            ? (drivers?.find((d) => d.id === gwDriverId)?.name ??
                               "Select driver")
                            : "Select driver"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {drivers?.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {gwErrors.driverId && (
                      <FieldError>{gwErrors.driverId.message}</FieldError>
                    )}
                  </Field>
                  <Field data-invalid={gwErrors.mqttBrokerId ? true : undefined}>
                    <FieldLabel>MQTT Broker</FieldLabel>
                    <Select
                      value={gwBrokerId}
                      onValueChange={(v) =>
                        setGwValue("mqttBrokerId", v ?? "", { shouldValidate: true })
                      }
                    >
                      <SelectTrigger>
                        <span className="flex flex-1 truncate text-left text-sm">
                          {gwBrokerId
                            ? (brokers?.find((b) => b.id === gwBrokerId)?.name ??
                               "Select broker")
                            : "Select broker"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {brokers?.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {gwErrors.mqttBrokerId && (
                      <FieldError>{gwErrors.mqttBrokerId.message}</FieldError>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="gw-name-opt">Name (optional)</FieldLabel>
                    <Input
                      id="gw-name-opt"
                      placeholder="Main Gateway"
                      {...regGw("name")}
                    />
                  </Field>
                </TabsContent>
              )}
            </Tabs>

            <DialogFooter className="flex-row items-center justify-between sm:justify-between">
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" variant="outline" onClick={doClose}>
                  Save & Exit
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    toast.success(`"${savedSite?.name}" created — link a gateway later`)
                    doClose()
                  }}
                >
                  Skip
                </Button>
                <Button
                  type="button"
                  disabled={step2Busy}
                  onClick={handleStep2Continue}
                >
                  {step2Busy && <Spinner data-icon="inline-start" />}
                  {gwTab === "select" ? "Link & Continue" : "Register & Continue"}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              {!savedGatewayId ? (
                <p className="text-sm text-muted-foreground">
                  No gateway linked — you can add devices later from the Devices page.
                </p>
              ) : devicesLoading ? (
                <p className="text-sm text-muted-foreground">Loading devices…</p>
              ) : existingDevices && existingDevices.length > 0 ? (
                <div className="rounded-md border">
                  {existingDevices.map((d, i) => (
                    <div
                      key={d.id}
                      className={[
                        "flex items-center justify-between px-4 py-2.5 text-sm",
                        i > 0 ? "border-t" : "",
                      ].join(" ")}
                    >
                      <span className="font-medium">{d.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {d.profileName} · Slave {d.slaveId}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No devices on this gateway yet.
                </p>
              )}

              {savedGatewayId &&
                (showDeviceForm ? (
                  <form
                    onSubmit={onDeviceSubmit}
                    className="flex flex-col gap-3 rounded-md border p-3"
                  >
                    <p className="text-sm font-medium">Add Device</p>
                    <Field data-invalid={devErrors.profileId ? true : undefined}>
                      <FieldLabel>Device Profile</FieldLabel>
                      <Select
                        value={devProfileId}
                        onValueChange={(v) =>
                          setDevValue("profileId", v ?? "", { shouldValidate: true })
                        }
                      >
                        <SelectTrigger>
                          <span className="flex flex-1 truncate text-left text-sm">
                            {devProfileId
                              ? (profiles?.find((p) => p.id === devProfileId)?.name ??
                                 "Select profile")
                              : "Select profile"}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {profiles?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {devErrors.profileId && (
                        <FieldError>{devErrors.profileId.message}</FieldError>
                      )}
                    </Field>
                    <Field data-invalid={devErrors.name ? true : undefined}>
                      <FieldLabel htmlFor="dev-name">Name</FieldLabel>
                      <Input
                        id="dev-name"
                        placeholder="Sensor-01"
                        {...regDev("name")}
                      />
                      {devErrors.name && (
                        <FieldError>{devErrors.name.message}</FieldError>
                      )}
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field data-invalid={devErrors.slaveId ? true : undefined}>
                        <FieldLabel htmlFor="dev-slave">Slave ID</FieldLabel>
                        <Input
                          id="dev-slave"
                          type="number"
                          min={1}
                          max={255}
                          {...regDev("slaveId")}
                        />
                        {devErrors.slaveId && (
                          <FieldError>{devErrors.slaveId.message}</FieldError>
                        )}
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="dev-timeout">Timeout (s)</FieldLabel>
                        <Input
                          id="dev-timeout"
                          type="number"
                          min={1}
                          max={60}
                          {...regDev("timeoutSeconds")}
                        />
                      </Field>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={devSubmitting}>
                        {devSubmitting && <Spinner data-icon="inline-start" />}
                        Add Device
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowDeviceForm(false)
                          resetDev()
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => setShowDeviceForm(true)}
                  >
                    <Plus data-icon="inline-start" />
                    Add Device
                  </Button>
                ))}
            </div>

            <DialogFooter className="flex-row items-center justify-between sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep(2)
                  if (savedGatewayId) {
                    setSelectedGwId(savedGatewayId)
                    setGwTab("select")
                  }
                }}
              >
                Back
              </Button>
              <Button type="button" onClick={doClose}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
