import { apiClient } from "@/lib/apiClient"
import type { DeviceProfile } from "@/types/api"

export interface ImportRowResult {
  rowNumber: number
  type: "PollGroup" | "DataPoint" | "Command"
  identifier: string | null
  action: "create" | "update"
  errors: string[]
}

export interface ImportPreviewResponse {
  newCount: number
  updateCount: number
  errorCount: number
  rows: ImportRowResult[]
  fileErrors: string[]
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const profileImportExportApi = {
  export: async (profileId: string, profileName: string) => {
    const res = await apiClient.get(`/device-profiles/${profileId}/export`, { responseType: "blob" })
    downloadBlob(res.data as Blob, `${profileName.replace(/[^a-zA-Z0-9-_]/g, "_")}.csv`)
  },

  preview: (file: File, targetProfileId?: string) => {
    const form = new FormData()
    form.append("file", file)
    if (targetProfileId) form.append("targetProfileId", targetProfileId)
    return apiClient
      .post<ImportPreviewResponse>("/device-profiles/import/preview", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data)
  },

  apply: (file: File, targetProfileId?: string, newProfileName?: string) => {
    const form = new FormData()
    form.append("file", file)
    if (targetProfileId) form.append("targetProfileId", targetProfileId)
    if (newProfileName) form.append("newProfileName", newProfileName)
    return apiClient
      .post<DeviceProfile>("/device-profiles/import/apply", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data)
  },
}
