import { useEffect, useRef, useState } from "react"
import { Client } from "@stomp/stompjs"
import { useAuthStore } from "@/store/authStore"
import type { LiveReading } from "./useLiveReadings"

// Tenant-wide WebSocket subscription — key is `${deviceId}:${dataPointKey}`
export function useLiveReadingsAll() {
  const [readings, setReadings] = useState<Map<string, LiveReading>>(new Map())
  const clientRef = useRef<Client | null>(null)
  const { accessToken, user } = useAuthStore()

  useEffect(() => {
    if (!accessToken || !user?.tenantId) return

    const wsUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`

    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/tenant/${user.tenantId}/readings`, (frame) => {
          const msg: LiveReading = JSON.parse(frame.body)
          const key = `${msg.deviceId}:${msg.dataPoint}`
          setReadings((prev) => new Map(prev).set(key, msg))
        })
      },
    })

    client.activate()
    clientRef.current = client

    return () => {
      client.deactivate()
    }
  }, [accessToken, user?.tenantId])

  return readings
}
