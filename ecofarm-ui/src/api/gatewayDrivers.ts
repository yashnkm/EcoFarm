import { apiClient } from "@/lib/apiClient"
import type { GatewayDriver } from "@/types/api"

export interface GatewayDriverBody {
  name: string
  transport: "MQTT" | "MODBUS_TCP" | "OPCUA"
  protocol: "MODBUS_RTU" | "MODBUS_TCP"
  requestFormat?: string
  responseParser?: string
  supportsBroadcast?: boolean
  messageType?: string
  topicRequest?: string
  topicResponse?: string
  topicStatus?: string
}

export const gatewayDriversApi = {
  list: () => apiClient.get<GatewayDriver[]>("/gateway-drivers").then((r) => r.data),
  get: (id: string) =>
    apiClient.get<GatewayDriver>(`/gateway-drivers/${id}`).then((r) => r.data),
  create: (body: GatewayDriverBody) =>
    apiClient.post<GatewayDriver>("/gateway-drivers", body).then((r) => r.data),
  update: (id: string, body: Partial<GatewayDriverBody>) =>
    apiClient.patch<GatewayDriver>(`/gateway-drivers/${id}`, body).then((r) => r.data),
  delete: (id: string) =>
    apiClient.delete(`/gateway-drivers/${id}`).then(() => undefined),
}
