import { apiClient } from "@/lib/apiClient"
import type { CommandTemplate, DataPoint, DeviceProfile, PollGroup } from "@/types/api"

// ── Profiles ─────────────────────────────────────────

export interface DeviceProfileCreate {
  name: string
  manufacturer?: string
  model?: string
  category?: string
  description?: string
  global?: boolean
}

export const deviceProfilesApi = {
  list: () => apiClient.get<DeviceProfile[]>("/device-profiles").then((r) => r.data),

  get: (id: string) =>
    apiClient.get<DeviceProfile>(`/device-profiles/${id}`).then((r) => r.data),

  create: (body: DeviceProfileCreate) =>
    apiClient.post<DeviceProfile>("/device-profiles", body).then((r) => r.data),

  update: (id: string, body: Partial<DeviceProfileCreate>) =>
    apiClient.patch<DeviceProfile>(`/device-profiles/${id}`, body).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/device-profiles/${id}`).then(() => undefined),
}

// ── Poll Groups ──────────────────────────────────────

export interface PollGroupBody {
  name: string
  intervalSeconds: number
  startRegister: number
  count: number
}

export const pollGroupsApi = {
  list: (profileId: string) =>
    apiClient
      .get<PollGroup[]>(`/device-profiles/${profileId}/poll-groups`)
      .then((r) => r.data),

  create: (profileId: string, body: PollGroupBody) =>
    apiClient
      .post<PollGroup>(`/device-profiles/${profileId}/poll-groups`, body)
      .then((r) => r.data),

  update: (profileId: string, id: string, body: PollGroupBody) =>
    apiClient
      .patch<PollGroup>(`/device-profiles/${profileId}/poll-groups/${id}`, body)
      .then((r) => r.data),

  delete: (profileId: string, id: string) =>
    apiClient
      .delete(`/device-profiles/${profileId}/poll-groups/${id}`)
      .then(() => undefined),
}

// ── Data Points ──────────────────────────────────────

export interface DataPointBody {
  key: string
  label: string
  registerNumber: number
  functionCode: number
  dataType?: string
  wordCount?: number
  byteOrder?: string
  scaleFactor?: number
  offset?: number
  unit?: string
  minValue?: number
  maxValue?: number
  writable?: boolean
  displayed?: boolean
  displayWidget?: string
  pollGroupId?: string | null
}

export const dataPointsApi = {
  list: (profileId: string) =>
    apiClient
      .get<DataPoint[]>(`/device-profiles/${profileId}/data-points`)
      .then((r) => r.data),

  create: (profileId: string, body: DataPointBody) =>
    apiClient
      .post<DataPoint>(`/device-profiles/${profileId}/data-points`, body)
      .then((r) => r.data),

  update: (profileId: string, id: string, body: DataPointBody) =>
    apiClient
      .patch<DataPoint>(`/device-profiles/${profileId}/data-points/${id}`, body)
      .then((r) => r.data),

  delete: (profileId: string, id: string) =>
    apiClient
      .delete(`/device-profiles/${profileId}/data-points/${id}`)
      .then(() => undefined),
}

// ── Command Templates ────────────────────────────────

export interface CommandTemplateBody {
  name: string
  description?: string
  registerNumber: number
  functionCode: number
  value: number
  confirmationRequired?: boolean
  minRole?: string
}

export const commandTemplatesApi = {
  list: (profileId: string) =>
    apiClient
      .get<CommandTemplate[]>(`/device-profiles/${profileId}/commands`)
      .then((r) => r.data),

  create: (profileId: string, body: CommandTemplateBody) =>
    apiClient
      .post<CommandTemplate>(`/device-profiles/${profileId}/commands`, body)
      .then((r) => r.data),

  update: (profileId: string, id: string, body: CommandTemplateBody) =>
    apiClient
      .patch<CommandTemplate>(`/device-profiles/${profileId}/commands/${id}`, body)
      .then((r) => r.data),

  delete: (profileId: string, id: string) =>
    apiClient
      .delete(`/device-profiles/${profileId}/commands/${id}`)
      .then(() => undefined),
}
