import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { Bell, BellOff, CheckCheck, Plus, ShieldAlert } from "lucide-react"

import { alertsApi, alertRulesApi } from "@/api/alerts"
import { devicesApi } from "@/api/devices"
import { dataPointsApi } from "@/api/deviceProfiles"
import { useLiveAlerts } from "@/hooks/useLiveAlerts"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { DeleteConfirm } from "@/components/DeleteConfirm"
import { EditButton } from "@/components/EditButton"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import type { Alert, AlertCondition, AlertRule, AlertSeverity, AlertStatus } from "@/types/api"

// ── Severity badge ──────────────────────────────────────────────

const severityVariant: Record<AlertSeverity, "default" | "secondary" | "destructive" | "outline"> = {
  INFO: "secondary",
  WARNING: "outline",
  CRITICAL: "destructive",
  EMERGENCY: "destructive",
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <Badge variant={severityVariant[severity]} className={severity === "EMERGENCY" ? "animate-pulse" : ""}>
      {severity}
    </Badge>
  )
}

function StatusBadge({ status }: { status: AlertStatus }) {
  const variant = status === "ACTIVE" ? "destructive" : status === "ACKNOWLEDGED" ? "outline" : "secondary"
  return <Badge variant={variant}>{status}</Badge>
}

// ── Alerts tab ──────────────────────────────────────────────────

function AlertsTab() {
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "ALL">("ALL")
  const [page, setPage] = useState(0)
  const queryClient = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const canAct = role === "SUPER_ADMIN" || role === "TENANT_ADMIN" || role === "OPERATOR"

  const { data, isLoading } = useQuery({
    queryKey: ["alerts", statusFilter, page],
    queryFn: () =>
      alertsApi.list({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page,
        size: 50,
      }),
  })

  useLiveAlerts((alert) => {
    toast.warning(`Alert: ${alert.ruleName}`, {
      description: `${alert.deviceName} — ${alert.dataPointKey} = ${alert.triggeredValue} (${alert.severity})`,
    })
    queryClient.invalidateQueries({ queryKey: ["alerts"] })
  })

  const acknowledgeMutation = useMutation({
    mutationFn: alertsApi.acknowledge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] })
      toast.success("Alert acknowledged")
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const resolveMutation = useMutation({
    mutationFn: alertsApi.resolve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] })
      toast.success("Alert resolved")
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const alerts = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as AlertStatus | "ALL"); setPage(0) }}>
          <SelectTrigger className="w-44">
            <SelectValue>{(v: string | null) => v ?? "All statuses"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : alerts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><BellOff /></EmptyMedia>
            <EmptyTitle>No alerts</EmptyTitle>
            <EmptyDescription>
              {statusFilter === "ALL"
                ? "No alerts have been triggered yet."
                : `No ${statusFilter.toLowerCase()} alerts.`}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Severity</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Data Point</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Triggered</TableHead>
                {canAct && <TableHead className="w-36"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert: Alert) => (
                <TableRow key={alert.id}>
                  <TableCell><SeverityBadge severity={alert.severity} /></TableCell>
                  <TableCell><StatusBadge status={alert.status} /></TableCell>
                  <TableCell className="font-medium">{alert.deviceName}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{alert.ruleName}</TableCell>
                  <TableCell className="font-mono text-xs">{alert.dataPointKey}</TableCell>
                  <TableCell className="font-mono text-sm">{alert.triggeredValue}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true })}
                  </TableCell>
                  {canAct && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {alert.status === "ACTIVE" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            title="Acknowledge"
                            disabled={acknowledgeMutation.isPending}
                            onClick={() => acknowledgeMutation.mutate(alert.id)}
                          >
                            <Bell className="size-4" />
                          </Button>
                        )}
                        {alert.status !== "RESOLVED" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            title="Resolve"
                            disabled={resolveMutation.isPending}
                            onClick={() => resolveMutation.mutate(alert.id)}
                          >
                            <CheckCheck className="size-4" />
                          </Button>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Alert Rules tab ─────────────────────────────────────────────

const CONDITIONS: { value: AlertCondition; label: string }[] = [
  { value: "GT", label: "> Greater than" },
  { value: "GTE", label: ">= Greater than or equal" },
  { value: "LT", label: "< Less than" },
  { value: "LTE", label: "<= Less than or equal" },
  { value: "EQ", label: "= Equal to" },
  { value: "NEQ", label: "≠ Not equal to" },
]

const SEVERITIES: AlertSeverity[] = ["INFO", "WARNING", "CRITICAL", "EMERGENCY"]

const ruleSchema = z.object({
  deviceId: z.string().min(1, "Device is required"),
  dataPointKey: z.string().min(1, "Data point key is required"),
  name: z.string().min(1, "Name is required"),
  condition: z.string().min(1, "Condition is required"),
  threshold: z.string().min(1, "Threshold is required"),
  severity: z.string().min(1, "Severity is required"),
  cooldownMinutes: z.string().min(1, "Cooldown is required"),
})

type RuleFormValues = z.infer<typeof ruleSchema>

function AlertRulesTab() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AlertRule | null>(null)
  const queryClient = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const canManage = role === "SUPER_ADMIN" || role === "TENANT_ADMIN"
  const isSuperAdmin = role === "SUPER_ADMIN"

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["alert-rules"],
    queryFn: alertRulesApi.list,
  })

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: () => devicesApi.list(),
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: { cooldownMinutes: "15", severity: "WARNING", condition: "GT" },
  })

  const deviceId = watch("deviceId")
  const dataPointKey = watch("dataPointKey")
  const condition = watch("condition")
  const severity = watch("severity")

  const selectedDevice = devices.find((d) => d.id === deviceId)

  const { data: dataPoints = [] } = useQuery({
    queryKey: ["data-points", selectedDevice?.profileId],
    queryFn: () => dataPointsApi.list(selectedDevice!.profileId),
    enabled: !!selectedDevice,
  })

  const createMutation = useMutation({
    mutationFn: alertRulesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] })
      toast.success("Alert rule created")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<RuleFormValues> }) =>
      alertRulesApi.update(id, {
        name: body.name,
        condition: body.condition as AlertCondition,
        threshold: body.threshold !== undefined ? Number(body.threshold) : undefined,
        severity: body.severity as AlertSeverity,
        cooldownMinutes: body.cooldownMinutes !== undefined ? Number(body.cooldownMinutes) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] })
      toast.success("Alert rule updated")
      closeDialog()
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: alertRulesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] })
      toast.success("Alert rule deleted")
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      alertRulesApi.update(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] })
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed"),
  })

  const openCreate = () => {
    setEditing(null)
    reset({ cooldownMinutes: "15", severity: "WARNING", condition: "GT" })
    setOpen(true)
  }

  const openEdit = (rule: AlertRule) => {
    setEditing(rule)
    reset({
      deviceId: rule.deviceId,
      dataPointKey: rule.dataPointKey,
      name: rule.name,
      condition: rule.condition,
      threshold: String(rule.threshold),
      severity: rule.severity,
      cooldownMinutes: String(rule.cooldownMinutes),
    })
    setOpen(true)
  }

  const closeDialog = () => {
    setOpen(false)
    setEditing(null)
    reset()
  }

  const onSubmit = (data: RuleFormValues) => {
    if (editing) {
      return updateMutation.mutateAsync({
        id: editing.id,
        body: {
          name: data.name,
          condition: data.condition,
          threshold: data.threshold,
          severity: data.severity,
          cooldownMinutes: data.cooldownMinutes,
        },
      })
    }
    return createMutation.mutateAsync({
      deviceId: data.deviceId,
      dataPointKey: data.dataPointKey,
      name: data.name,
      condition: data.condition as AlertCondition,
      threshold: Number(data.threshold),
      severity: data.severity as AlertSeverity,
      cooldownMinutes: Number(data.cooldownMinutes),
    })
  }

  const conditionLabel = (c: string) => CONDITIONS.find((x) => x.value === c)?.label ?? c

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus data-icon="inline-start" />New Rule
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit "${editing.name}"` : "New alert rule"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update the rule configuration."
                  : "Define when an alert should be triggered for a device data point."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <Field data-invalid={errors.deviceId ? true : undefined}>
                <FieldLabel>Device</FieldLabel>
                <Select
                  value={deviceId ?? ""}
                  onValueChange={(v) => {
                    setValue("deviceId", v ?? "", { shouldValidate: true })
                    setValue("dataPointKey", "")
                  }}
                  disabled={!!editing}
                >
                  <SelectTrigger aria-invalid={!!errors.deviceId}>
                    <SelectValue placeholder="Select a device">
                      {(v: string | null) => devices.find((d) => d.id === v)?.name ?? v}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {devices.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errors.deviceId && <FieldError>{errors.deviceId.message}</FieldError>}
              </Field>

              <Field data-invalid={errors.dataPointKey ? true : undefined}>
                <FieldLabel>Data point</FieldLabel>
                <Select
                  value={dataPointKey ?? ""}
                  onValueChange={(v) => setValue("dataPointKey", v ?? "", { shouldValidate: true })}
                  disabled={!!editing || !deviceId}
                >
                  <SelectTrigger aria-invalid={!!errors.dataPointKey}>
                    <SelectValue placeholder={!deviceId ? "Select a device first" : "Select a data point"}>
                      {(v: string | null) => {
                        const dp = dataPoints.find((d) => d.key === v)
                        return dp ? `${dp.label} (${dp.key})` : v
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {dataPoints.map((dp) => (
                        <SelectItem key={dp.key} value={dp.key}>
                          {dp.label} <span className="text-muted-foreground text-xs ml-1">({dp.key})</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errors.dataPointKey && <FieldError>{errors.dataPointKey.message}</FieldError>}
              </Field>

              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="ruleName">Rule name</FieldLabel>
                <Input id="ruleName" placeholder="High voltage alert" {...register("name")} />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={errors.condition ? true : undefined}>
                  <FieldLabel>Condition</FieldLabel>
                  <Select
                    value={condition ?? "GT"}
                    onValueChange={(v) => setValue("condition", v ?? "GT", { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue>{(v: string | null) => conditionLabel(v ?? "")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {CONDITIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field data-invalid={errors.threshold ? true : undefined}>
                  <FieldLabel htmlFor="threshold">Threshold</FieldLabel>
                  <Input
                    id="threshold"
                    type="number"
                    step="any"
                    placeholder="0"
                    {...register("threshold")}
                  />
                  {errors.threshold && <FieldError>{errors.threshold.message}</FieldError>}
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={errors.severity ? true : undefined}>
                  <FieldLabel>Severity</FieldLabel>
                  <Select
                    value={severity ?? "WARNING"}
                    onValueChange={(v) => setValue("severity", v ?? "WARNING", { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue>{(v: string | null) => v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {SEVERITIES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field data-invalid={errors.cooldownMinutes ? true : undefined}>
                  <FieldLabel htmlFor="cooldown">Cooldown (minutes)</FieldLabel>
                  <Input
                    id="cooldown"
                    type="number"
                    min={1}
                    max={1440}
                    placeholder="15"
                    {...register("cooldownMinutes")}
                  />
                  {errors.cooldownMinutes && <FieldError>{errors.cooldownMinutes.message}</FieldError>}
                </Field>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {editing ? "Save changes" : "Create rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : rules.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ShieldAlert /></EmptyMedia>
            <EmptyTitle>No alert rules</EmptyTitle>
            <EmptyDescription>
              {canManage
                ? "Create your first rule to start monitoring device thresholds."
                : "No alert rules have been configured."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Data Point</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="w-20">Status</TableHead>
                {canManage && <TableHead className="w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule: AlertRule) => (
                <TableRow key={rule.id} className={!rule.enabled ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{rule.deviceName}</TableCell>
                  <TableCell className="font-mono text-xs">{rule.dataPointKey}</TableCell>
                  <TableCell className="text-sm">
                    {conditionLabel(rule.condition)} {rule.threshold}
                  </TableCell>
                  <TableCell><SeverityBadge severity={rule.severity} /></TableCell>
                  <TableCell>
                    <Badge variant={rule.enabled ? "default" : "secondary"}>
                      {rule.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          title={rule.enabled ? "Disable rule" : "Enable rule"}
                          disabled={toggleMutation.isPending}
                          onClick={() => toggleMutation.mutate({ id: rule.id, enabled: !rule.enabled })}
                        >
                          {rule.enabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
                        </Button>
                        <EditButton onClick={() => openEdit(rule)} />
                        {isSuperAdmin && (
                          <DeleteConfirm
                            onConfirm={() => deleteMutation.mutate(rule.id)}
                            title={`Delete "${rule.name}"?`}
                            description="All alerts triggered by this rule will also be deleted."
                          />
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

// ── Main page ───────────────────────────────────────────────────

export function AlertsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Monitor threshold breaches and manage alert rules across your devices.
        </p>
      </div>

      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts">
            <Bell data-icon="inline-start" />Alerts
          </TabsTrigger>
          <TabsTrigger value="rules">
            <ShieldAlert data-icon="inline-start" />Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="mt-4">
          <AlertsTab />
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <AlertRulesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
