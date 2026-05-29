import { useQuery } from "@tanstack/react-query"
import { RefreshCw, Wifi, WifiOff } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

import { healthApi } from "@/api/health"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"

export function MqttStatusCard() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["mqtt-health"],
    queryFn: healthApi.mqtt,
    refetchInterval: 10_000,
  })

  const handleCheck = async () => {
    const result = await refetch()
    const brokers = result.data ?? []
    const allConnected = brokers.length > 0 && brokers.every((b) => b.connected)
    const anyDisconnected = brokers.some((b) => !b.connected)
    if (allConnected) {
      toast.success("All brokers connected")
    } else if (anyDisconnected) {
      const names = brokers.filter((b) => !b.connected).map((b) => b.brokerName).join(", ")
      toast.error(`Disconnected: ${names}`)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-medium">MQTT Brokers</CardTitle>
          <CardDescription className="mt-1 text-xs">
            Live connection status for all configured brokers
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleCheck} disabled={isFetching}>
          {isFetching ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <RefreshCw data-icon="inline-start" />
          )}
          Refresh
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">No brokers configured.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.map((broker) => (
              <div
                key={broker.brokerId}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{broker.brokerName}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {broker.brokerUrl}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {broker.connected && broker.lastConnectedAt
                      ? `Since ${formatDistanceToNow(new Date(broker.lastConnectedAt), { addSuffix: true })}`
                      : broker.lastError
                        ? broker.lastError
                        : "Waiting for connection…"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={broker.connected ? "default" : "destructive"}>
                    {broker.connected ? "Connected" : "Disconnected"}
                  </Badge>
                  {broker.connected ? (
                    <Wifi className="size-4 text-muted-foreground" />
                  ) : (
                    <WifiOff className="size-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
