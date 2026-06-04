import { apiClient } from "@/lib/apiClient"
import type { Site, Zone } from "@/types/api"

export const sitesApi = {
  list: () => apiClient.get<Site[]>("/sites").then((r) => r.data),
  get: (id: string) => apiClient.get<Site>(`/sites/${id}`).then((r) => r.data),
  create: (body: Partial<Site>) => apiClient.post<Site>("/sites", body).then((r) => r.data),
  update: (id: string, body: Partial<Site>) =>
    apiClient.patch<Site>(`/sites/${id}`, body).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/sites/${id}`).then(() => undefined),

  listZones: (siteId: string) =>
    apiClient.get<Zone[]>(`/sites/${siteId}/zones`).then((r) => r.data),
  createZone: (siteId: string, body: { name: string; description?: string }) =>
    apiClient.post<Zone>(`/sites/${siteId}/zones`, body).then((r) => r.data),
  updateZone: (siteId: string, id: string, body: { name: string; description?: string }) =>
    apiClient.patch<Zone>(`/sites/${siteId}/zones/${id}`, body).then((r) => r.data),
  deleteZone: (siteId: string, id: string) =>
    apiClient.delete(`/sites/${siteId}/zones/${id}`).then(() => undefined),
}
