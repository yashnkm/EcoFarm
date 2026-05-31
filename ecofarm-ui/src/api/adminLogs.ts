import { apiClient } from "@/lib/apiClient"

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface AuditLogEntry {
  id: string
  tenantName: string | null
  userEmail: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  payload: string | null
  ipAddress: string | null
  createdAt: string
}

export interface SystemEventEntry {
  id: string
  tenantName: string | null
  eventType: string
  siteName: string | null
  gatewaySerial: string | null
  deviceName: string | null
  severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL"
  message: string
  payload: string | null
  createdAt: string
}

export interface CommLogEntry {
  id: string
  tenantName: string | null
  gatewaySerial: string | null
  deviceName: string | null
  direction: "REQUEST" | "RESPONSE"
  modbusFc: number | null
  register: number | null
  value: string | null
  status: "OK" | "ERROR"
  errorMessage: string | null
  createdAt: string
}

export const adminLogsApi = {
  audit: (page = 0, size = 50) =>
    apiClient
      .get<PageResponse<AuditLogEntry>>("/admin/logs/audit", { params: { page, size } })
      .then((r) => r.data),

  events: (page = 0, size = 50) =>
    apiClient
      .get<PageResponse<SystemEventEntry>>("/admin/logs/events", { params: { page, size } })
      .then((r) => r.data),

  comms: (page = 0, size = 50) =>
    apiClient
      .get<PageResponse<CommLogEntry>>("/admin/logs/comms", { params: { page, size } })
      .then((r) => r.data),
}
