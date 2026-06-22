import { apiClient } from "@/lib/apiClient"
import type { Alert, AlertCondition, AlertRule, AlertSeverity, AlertStatus } from "@/types/api"

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export const alertRulesApi = {
  list: () => apiClient.get<AlertRule[]>("/alert-rules").then((r) => r.data),

  create: (body: {
    deviceId: string
    dataPointKey: string
    name: string
    condition: AlertCondition
    threshold: number
    severity?: AlertSeverity
    cooldownMinutes?: number
  }) => apiClient.post<AlertRule>("/alert-rules", body).then((r) => r.data),

  update: (
    id: string,
    body: {
      name?: string
      condition?: AlertCondition
      threshold?: number
      severity?: AlertSeverity
      cooldownMinutes?: number
      enabled?: boolean
    },
  ) => apiClient.patch<AlertRule>(`/alert-rules/${id}`, body).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/alert-rules/${id}`).then(() => undefined),
}

export const alertsApi = {
  list: (params?: { status?: AlertStatus; page?: number; size?: number }) =>
    apiClient
      .get<PageResponse<Alert>>("/alerts", { params })
      .then((r) => r.data),

  acknowledge: (id: string) =>
    apiClient.patch<Alert>(`/alerts/${id}/acknowledge`).then((r) => r.data),

  resolve: (id: string) =>
    apiClient.patch<Alert>(`/alerts/${id}/resolve`).then((r) => r.data),
}
