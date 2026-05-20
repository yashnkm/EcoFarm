import { useEffect, useRef, useState } from "react"
import { Client } from "@stomp/stompjs"
import { useAuthStore } from "@/store/authStore"
import type { ReadingQuality } from "@/types/api"

export interface LiveReading {
  deviceId: string
  dataPoint: string
  value: number | null
  rawValue: number | null
  quality: ReadingQuality
  unit: string | null
  time: string
}

export function useLiveReadings(deviceId: string | undefined) {
  const [readings, setReadings] = useState<Map<string, LiveReading>>(new Map())
  const clientRef = useRef<Client | null>(null)
  const { accessToken, user } = useAuthStore()

  useEffect(() => {
    if (!deviceId || !accessToken || !user?.tenantId) return

    const wsUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`

    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/tenant/${user.tenantId}/readings`, (frame) => {
          const msg: LiveReading = JSON.parse(frame.body)
          if (msg.deviceId !== deviceId) return
          setReadings((prev) => new Map(prev).set(msg.dataPoint, msg))
        })
      },
    })

    client.activate()
    clientRef.current = client

    return () => {
      client.deactivate()
    }
  }, [deviceId, accessToken, user?.tenantId])

  return readings
}
