import { apiClient } from "@/lib/apiClient"
import type { Reading } from "@/types/api"

export const readingsApi = {
  range: (params: { deviceId: string; dataPoint: string; from?: string; to?: string }) =>
    apiClient.get<Reading[]>("/readings", { params }).then((r) => r.data),

  latestForSite: (siteId: string) =>
    apiClient.get<Reading[]>(`/sites/${siteId}/readings/latest`).then((r) => r.data),

  latestForTenant: () =>
    apiClient.get<Reading[]>("/readings/latest").then((r) => r.data),
}
