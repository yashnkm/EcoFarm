import { useQuery } from "@tanstack/react-query"
import { MapPin, Radio, Cpu, Bell } from "lucide-react"

import { useAuthStore } from "@/store/authStore"
import { sitesApi } from "@/api/sites"
import { gatewaysApi } from "@/api/gateways"
import { devicesApi } from "@/api/devices"
import { MqttStatusCard } from "@/components/MqttStatusBadge"
import { LiveOverviewSection } from "@/components/LiveOverviewSection"
import { useLiveReadingsAll } from "@/hooks/useLiveReadingsAll"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  const sites = useQuery({ queryKey: ["sites"], queryFn: sitesApi.list })
  const gateways = useQuery({ queryKey: ["gateways"], queryFn: gatewaysApi.list })
  const devices = useQuery({ queryKey: ["devices"], queryFn: () => devicesApi.list() })
  const liveReadings = useLiveReadingsAll()

  const onlineGateways = gateways.data?.filter((g) => g.status === "ONLINE").length ?? 0
  const onlineDevices = devices.data?.filter((d) => d.status === "ONLINE").length ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user?.firstName ?? user?.email}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Sites"
          icon={MapPin}
          value={sites.data?.length}
          loading={sites.isLoading}
        />
        <StatCard
          title="Gateways"
          icon={Radio}
          value={gateways.data?.length}
          sub={`${onlineGateways} online`}
          loading={gateways.isLoading}
        />
        <StatCard
          title="Devices"
          icon={Cpu}
          value={devices.data?.length}
          sub={`${onlineDevices} online`}
          loading={devices.isLoading}
        />
        <StatCard
          title="Active Alerts"
          icon={Bell}
          value={0}
          sub="Phase 2"
          loading={false}
        />
      </div>

      {user?.role === "SUPER_ADMIN" && <MqttStatusCard />}

      <LiveOverviewSection
        sites={sites.data ?? []}
        devices={devices.data ?? []}
        liveReadings={liveReadings}
        devicesLoading={devices.isLoading}
      />

      {/* Gateway status overview */}
      {user?.role === "SUPER_ADMIN" && <Card>
        <CardHeader>
          <CardTitle>Gateways</CardTitle>
          <CardDescription>Status of all registered gateways</CardDescription>
        </CardHeader>
        <CardContent>
          {gateways.isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !gateways.data?.length ? (
            <p className="text-sm text-muted-foreground">
              No gateways registered yet. Add one via the Gateways page.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {gateways.data.map((gw) => (
                <div
                  key={gw.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{gw.name ?? gw.serialNumber}</span>
                    <span className="text-xs text-muted-foreground">
                      {gw.driverName} &middot; {gw.serialNumber}
                    </span>
                  </div>
                  <StatusBadge status={gw.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>}
    </div>
  )
}

function StatCard({
  title,
  icon: Icon,
  value,
  sub,
  loading,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  value?: number
  sub?: string
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value ?? 0}</div>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "ONLINE"
      ? "default"
      : status === "OFFLINE"
        ? "destructive"
        : "secondary"

  return <Badge variant={variant}>{status}</Badge>
}
