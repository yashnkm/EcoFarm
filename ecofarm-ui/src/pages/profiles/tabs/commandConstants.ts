// Shared between CommandsTab (standalone write-only commands) and
// DataPointsTab (the "Read & Write" unified point flow) so the two forms'
// role/category options can't drift apart.
export const ROLES = ["OPERATOR", "TENANT_ADMIN", "SUPER_ADMIN"] as const
export const CATEGORIES = ["TEMPERATURE", "FOGGING", "OTHER"] as const
export const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  TEMPERATURE: "Temperature Control",
  FOGGING: "Fogging",
  OTHER: "Other",
}
