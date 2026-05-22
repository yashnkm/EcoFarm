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

export function MqttStatusCard() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["mqtt-health"],
    queryFn: healthApi.mqtt,
    refetchInterval: 10_000,
  })

  const handleCheck = async () => {
    const result = await refetch()
    if (result.data?.connected) {
      toast.success("Broker connected")
    } else {
      toast.error(`Broker disconnected — ${result.data?.lastError ?? "not yet connected"}`)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-medium">
            {data?.brokerName ?? "MQTT Broker"}
          </CardTitle>
          <CardDescription className="mt-1 font-mono text-xs">
            {data ? (data.brokerUrl ?? "No broker assigned") : "…"}
          </CardDescription>
        </div>
        {isLoading ? (
          <Spinner />
        ) : data?.connected ? (
          <Wifi className="size-4 text-muted-foreground" />
        ) : (
          <WifiOff className="size-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <Badge variant={data?.connected ? "default" : "destructive"}>
              {data?.connected ? "Connected" : "Disconnected"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {data?.connected && data.lastConnectedAt
                ? `Since ${formatDistanceToNow(new Date(data.lastConnectedAt), { addSuffix: true })}`
                : data?.lastError
                  ? data.lastError
                  : "Waiting for connection…"}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleCheck} disabled={isFetching}>
            <RefreshCw data-icon="inline-start" className={isFetching ? "animate-spin" : undefined} />
            Check
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
