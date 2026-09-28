import { apiClient } from "@/lib/apiClient"

export interface MqttHealth {
  brokerId: string
  connected: boolean
  brokerUrl: string | null
  brokerName: string | null
  lastConnectedAt: string | null
  lastFailureAt: string | null
  lastError: string | null
}

export interface DiskHealth {
  totalBytes: number
  usedBytes: number
  freeBytes: number
  usedPercent: number
  level: "OK" | "WARNING" | "CRITICAL"
}

export const healthApi = {
  mqtt: () => apiClient.get<MqttHealth[]>("/health/mqtt").then((r) => r.data),
  disk: () => apiClient.get<DiskHealth>("/health/disk").then((r) => r.data),
}
