import { apiClient } from "@/lib/apiClient"
import type { Gateway, GatewayDriver } from "@/types/api"

export const gatewaysApi = {
  list: () => apiClient.get<Gateway[]>("/gateways").then((r) => r.data),
  listUnregistered: () =>
    apiClient.get<Gateway[]>("/gateways/unregistered").then((r) => r.data),
  get: (id: string) => apiClient.get<Gateway>(`/gateways/${id}`).then((r) => r.data),
  register: (body: {
    serialNumber: string
    driverId: string
    name?: string
    siteId?: string
    zoneId?: string
    baudRate?: number
    parity?: string
    stopBits?: number
  }) => apiClient.post<Gateway>("/gateways", body).then((r) => r.data),
  claim: (id: string, body: { name: string; siteId: string; zoneId?: string }) =>
    apiClient.post<Gateway>(`/gateways/${id}/claim`, body).then((r) => r.data),
  update: (id: string, body: Partial<Gateway>) =>
    apiClient.patch<Gateway>(`/gateways/${id}`, body).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/gateways/${id}`).then(() => undefined),

  drivers: {
    list: () => apiClient.get<GatewayDriver[]>("/gateway-drivers").then((r) => r.data),
  },
}
