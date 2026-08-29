import { apiClient } from "@/lib/apiClient"
import type { Reading, ReadingBucket, ReadingGranularity } from "@/types/api"

export const readingsApi = {
  range: (params: { deviceId: string; dataPoint: string; from?: string; to?: string }) =>
    apiClient.get<Reading[]>("/readings", { params }).then((r) => r.data),

  /** Bucketed avg/min/max/count instead of every raw reading — used for the
   * Hourly/Daily/Weekly resolution views so large ranges stay fast to fetch
   * and cheap to render. */
  aggregate: (params: { deviceId: string; dataPoint: string; from?: string; to?: string; granularity: ReadingGranularity }) =>
    apiClient.get<ReadingBucket[]>("/readings/aggregate", { params }).then((r) => r.data),

  latestForSite: (siteId: string) =>
    apiClient.get<Reading[]>(`/sites/${siteId}/readings/latest`).then((r) => r.data),

  latestForTenant: () =>
    apiClient.get<Reading[]>("/readings/latest").then((r) => r.data),
}
