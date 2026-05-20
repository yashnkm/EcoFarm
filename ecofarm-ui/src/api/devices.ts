import { apiClient } from "@/lib/apiClient"
import type { CommandStatus, Device, DeviceProfile, Reading } from "@/types/api"

export interface ControlCommand {
  id: string
  deviceId: string
  issuedBy: string | null
  registerNumber: number
  functionCode: number
  value: number
  status: CommandStatus
  sentAt: string | null
  acknowledgedAt: string | null
  result: string | null
  createdAt: string
}

export const devicesApi = {
  list: (gatewayId?: string) =>
    apiClient
      .get<Device[]>("/devices", { params: { gatewayId } })
      .then((r) => r.data),

  get: (id: string) => apiClient.get<Device>(`/devices/${id}`).then((r) => r.data),

  create: (body: {
    gatewayId: string
    profileId: string
    name: string
    slaveId: number
    protocol?: string
    ipAddress?: string
    port?: number
    zoneId?: string
    timeoutSeconds?: number
  }) => apiClient.post<Device>("/devices", body).then((r) => r.data),

  update: (id: string, body: Partial<Device>) =>
    apiClient.patch<Device>(`/devices/${id}`, body).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/devices/${id}`).then(() => undefined),

  issueCommand: (id: string, commandTemplateId: string) =>
    apiClient
      .post<ControlCommand>(`/devices/${id}/commands`, { commandTemplateId })
      .then((r) => r.data),

  listCommands: (id: string) =>
    apiClient.get<ControlCommand[]>(`/devices/${id}/commands`).then((r) => r.data),

  latestReadings: (id: string) =>
    apiClient.get<Reading[]>(`/devices/${id}/readings/latest`).then((r) => r.data),

  updateRecordedDataPoints: (id: string, dataPoints: string[]) =>
    apiClient
      .patch<Device>(`/devices/${id}/recorded-data-points`, { dataPoints })
      .then((r) => r.data),
}

export const deviceProfilesApi = {
  list: () => apiClient.get<DeviceProfile[]>("/device-profiles").then((r) => r.data),
  get: (id: string) =>
    apiClient.get<DeviceProfile>(`/device-profiles/${id}`).then((r) => r.data),
}
