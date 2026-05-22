import { apiClient } from "@/lib/apiClient"

export interface MqttHealth {
  connected: boolean
  brokerUrl: string | null
  brokerName: string | null
  lastConnectedAt: string | null
  lastFailureAt: string | null
  lastError: string | null
}

export const healthApi = {
  mqtt: () => apiClient.get<MqttHealth>("/health/mqtt").then((r) => r.data),
}
