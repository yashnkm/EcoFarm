import { apiClient } from "@/lib/apiClient"
import type { BrokerStatus, MqttBroker } from "@/types/api"

export interface CreateBrokerBody {
  name: string
  host: string
  port: number
  useTls?: boolean
  username?: string
  password?: string
  keepaliveSeconds?: number
  defaultQos?: number
}

export interface UpdateBrokerBody {
  name?: string
  host?: string
  port?: number
  useTls?: boolean
  username?: string
  password?: string
  keepaliveSeconds?: number
  defaultQos?: number
  status?: BrokerStatus
}

export const brokersApi = {
  list: () => apiClient.get<MqttBroker[]>("/admin/brokers").then((r) => r.data),
  get: (id: string) =>
    apiClient.get<MqttBroker>(`/admin/brokers/${id}`).then((r) => r.data),
  create: (body: CreateBrokerBody) =>
    apiClient.post<MqttBroker>("/admin/brokers", body).then((r) => r.data),
  update: (id: string, body: UpdateBrokerBody) =>
    apiClient.patch<MqttBroker>(`/admin/brokers/${id}`, body).then((r) => r.data),
  delete: (id: string) =>
    apiClient.delete(`/admin/brokers/${id}`).then(() => undefined),
}
