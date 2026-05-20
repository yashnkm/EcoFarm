import { apiClient } from "@/lib/apiClient"
import type { Tenant, TenantStatus } from "@/types/api"

export interface CreateTenantBody {
  name: string
  slug: string
  adminEmail: string
  adminPassword: string
  adminFirstName?: string
  adminLastName?: string
  mqttBrokerId?: string
}

export interface UpdateTenantBody {
  name?: string
  status?: TenantStatus
  plan?: string
  mqttBrokerId?: string
}

export const tenantsApi = {
  list: () => apiClient.get<Tenant[]>("/admin/tenants").then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Tenant>(`/admin/tenants/${id}`).then((r) => r.data),

  create: (body: CreateTenantBody) =>
    apiClient.post<Tenant>("/admin/tenants", body).then((r) => r.data),

  update: (id: string, body: UpdateTenantBody) =>
    apiClient.patch<Tenant>(`/admin/tenants/${id}`, body).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/admin/tenants/${id}`).then(() => undefined),
}
