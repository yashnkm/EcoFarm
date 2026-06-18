import { useEffect, useState } from "react"
import { Client } from "@stomp/stompjs"
import { useAuthStore } from "@/store/authStore"
import { readingsApi } from "@/api/readings"
import type { Reading } from "@/types/api"

export function useLiveReadingsAll() {
  const [readings, setReadings] = useState<Map<string, Reading>>(new Map())
  const { accessToken, user } = useAuthStore()

  useEffect(() => {
    if (!user?.tenantId) return
    readingsApi.latestForTenant().then((data) => {
      const map = new Map<string, Reading>()
      for (const r of data) map.set(`${r.deviceId}:${r.dataPoint}`, r)
      setReadings(map)
    }).catch(() => {})
  }, [user?.tenantId])

  useEffect(() => {
    if (!accessToken || !user?.tenantId) return

    const wsUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`
    const tenantId = user.tenantId

    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/tenant/${tenantId}/readings`, (frame) => {
          const msg: Reading = JSON.parse(frame.body)
          setReadings((prev) => new Map(prev).set(`${msg.deviceId}:${msg.dataPoint}`, msg))
        })
      },
    })

    client.activate()

    return () => { client.deactivate() }
  }, [accessToken, user?.tenantId])

  return readings
}
