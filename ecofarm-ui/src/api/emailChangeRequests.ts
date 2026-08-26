import { apiClient } from "@/lib/apiClient"

export interface EmailChangeRequest {
  id: string
  userId: string
  requesterName: string | null
  requesterEmail: string
  requestedEmail: string
  note: string | null
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
}

export const emailChangeRequestsApi = {
  listPending: () => apiClient.get<EmailChangeRequest[]>("/email-change-requests").then((r) => r.data),

  approve: (id: string) =>
    apiClient.post<void>(`/email-change-requests/${id}/approve`).then(() => undefined),

  reject: (id: string, reason?: string) =>
    apiClient.post<void>(`/email-change-requests/${id}/reject`, reason ? { reason } : undefined).then(() => undefined),
}
