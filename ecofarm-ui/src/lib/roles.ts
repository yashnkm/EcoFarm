import type { Role } from "@/types/api"

const ROLE_ORDER: Role[] = ["VIEWER", "OPERATOR", "TENANT_ADMIN", "SUPER_ADMIN"]

export function meetsMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(minRole)
}
