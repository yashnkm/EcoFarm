import { useEffect, useRef } from "react"
import { Client } from "@stomp/stompjs"
import { useAuthStore } from "@/store/authStore"
import type { AlertSeverity, AlertStatus } from "@/types/api"

export interface LiveAlert {
  alertId: string
  alertRuleId: string
  ruleName: string
  deviceId: string
  deviceName: string
  dataPointKey: string
  triggeredValue: number
  severity: AlertSeverity
  status: AlertStatus
  triggeredAt: string
}

export function useLiveAlerts(onAlert: (alert: LiveAlert) => void) {
  const { accessToken, user } = useAuthStore()
  const callbackRef = useRef(onAlert)
  callbackRef.current = onAlert

  useEffect(() => {
    if (!accessToken || !user?.tenantId) return

    const wsUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`

    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/tenant/${user.tenantId}/alerts`, (frame) => {
          const msg: LiveAlert = JSON.parse(frame.body)
          callbackRef.current(msg)
        })
      },
    })

    client.activate()
    return () => { client.deactivate() }
  }, [accessToken, user?.tenantId])
}
