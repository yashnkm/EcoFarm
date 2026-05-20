import { apiClient } from "@/lib/apiClient"
import type { Role, User, UserStatus } from "@/types/api"

export interface CreateUserBody {
  email: string
  password: string
  role: Role
  firstName?: string
  lastName?: string
}

export interface UpdateUserBody {
  firstName?: string
  lastName?: string
  role?: Role
  status?: UserStatus
}

export const usersApi = {
  list: () => apiClient.get<User[]>("/users").then((r) => r.data),

  get: (id: string) => apiClient.get<User>(`/users/${id}`).then((r) => r.data),

  create: (body: CreateUserBody) =>
    apiClient.post<User>("/users", body).then((r) => r.data),

  update: (id: string, body: UpdateUserBody) =>
    apiClient.patch<User>(`/users/${id}`, body).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/users/${id}`).then(() => undefined),
}
