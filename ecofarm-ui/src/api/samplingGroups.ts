import { apiClient } from "@/lib/apiClient"
import type { SamplingGroup } from "@/types/api"

export interface ChannelRefBody {
  deviceId: string
  dataPointKey: string
}

export interface SamplingGroupBody {
  name: string
  description?: string
  sampleIntervalMinutes: number
  retentionDays: number | null
  channels: ChannelRefBody[]
}

export const samplingGroupsApi = {
  list: () => apiClient.get<SamplingGroup[]>("/sampling-groups").then((r) => r.data),

  get: (id: string) => apiClient.get<SamplingGroup>(`/sampling-groups/${id}`).then((r) => r.data),

  create: (body: SamplingGroupBody) =>
    apiClient.post<SamplingGroup>("/sampling-groups", body).then((r) => r.data),

  update: (id: string, body: SamplingGroupBody) =>
    apiClient.patch<SamplingGroup>(`/sampling-groups/${id}`, body).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/sampling-groups/${id}`).then(() => undefined),
}
