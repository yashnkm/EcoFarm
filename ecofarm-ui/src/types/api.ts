// Shared API types matching the backend DTOs.

export type Role = "SUPER_ADMIN" | "TENANT_ADMIN" | "OPERATOR" | "VIEWER"
export type UserStatus = "ACTIVE" | "INVITED" | "SUSPENDED"
export type TenantStatus = "ACTIVE" | "SUSPENDED"
export type SiteStatus = "ACTIVE" | "INACTIVE"
export type GatewayStatus = "ONLINE" | "OFFLINE" | "DEGRADED" | "UNREGISTERED"
export type DeviceStatus = "ONLINE" | "OFFLINE" | "ERROR"
export type DeviceCategory = "ENERGY_METER" | "PLC" | "SENSOR" | "VFD" | "RELAY"
export type DeviceProtocol = "RTU" | "TCP"
export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL" | "EMERGENCY"
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED"
export type AlertCondition = "GT" | "LT" | "EQ" | "GTE" | "LTE" | "NEQ"
export type CommandStatus = "PENDING" | "SENT" | "ACKNOWLEDGED" | "FAILED"
export type ReadingQuality = "GOOD" | "SUSPECT" | "ERROR"

// ── Auth ──────────────────────────────────

export interface UserSummary {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: Role
  tenantId: string
  tenantName: string
  tenantSlug: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
  user: UserSummary
}

/** Login can land in one of two shapes: a normal success (tokens populated),
 * or — for an account still on its one-time invite password — a signal to
 * go set a real password first, carrying a short-lived resetToken instead
 * of any access to the account. */
export interface LoginResponse {
  mustSetPassword: boolean
  resetToken: string | null
  tokens: TokenResponse | null
}

// ── User ──────────────────────────────────

export interface User {
  id: string
  tenantId: string
  email: string
  firstName: string | null
  lastName: string | null
  role: Role
  status: UserStatus
  activatedAt: string | null
  createdAt: string
}

// ── Tenant ────────────────────────────────

export interface Tenant {
  id: string
  name: string
  slug: string
  status: TenantStatus
  plan: string
  createdAt: string
}

export type BrokerStatus = "ACTIVE" | "DISABLED"

export interface MqttBroker {
  id: string
  name: string
  host: string
  port: number
  useTls: boolean
  username: string | null
  keepaliveSeconds: number
  defaultQos: number
  status: BrokerStatus
  brokerUrl: string
  connected: boolean
  lastError: string | null
  createdAt: string
}

// ── Site ──────────────────────────────────

export interface Site {
  id: string
  tenantId: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  timezone: string
  status: SiteStatus
  createdAt: string
  updatedAt: string
}

export interface Zone {
  id: string
  siteId: string
  name: string
  description: string | null
  createdAt: string
}

// ── Gateway ───────────────────────────────

export interface Gateway {
  id: string
  tenantId: string
  siteId: string | null
  zoneId: string | null
  driverId: string
  driverName: string
  mqttBrokerId: string | null
  mqttBrokerName: string | null
  serialNumber: string
  mqttClientId: string | null
  name: string | null
  status: GatewayStatus
  lastSeen: string | null
  createdAt: string
}

export interface GatewayDriver {
  id: string
  name: string
  transport: string
  protocol: string
  requestFormat: string | null
  responseParser: string | null
  supportsBroadcast: boolean
  messageType: string
  topicRequest: string
  topicResponse: string
  topicStatus: string | null
  createdAt: string
}

// ── Device Profile ───────────────────────

export interface DeviceProfile {
  id: string
  tenantId: string | null
  name: string
  manufacturer: string | null
  model: string | null
  category: DeviceCategory
  description: string | null
  global: boolean
  createdAt: string
}

export interface DataPoint {
  id: string
  profileId: string
  pollGroupId: string
  key: string
  label: string
  registerNumber: number
  functionCode: number
  dataType: string
  wordCount: number
  byteOrder: string
  scaleFactor: number
  offset: number
  unit: string | null
  minValue: number | null
  maxValue: number | null
  writable: boolean
  displayed: boolean
  displayWidget: string
  displayGroup: string | null
  falseLabel: string | null
  trueLabel: string | null
}

export interface PollGroup {
  id: string
  profileId: string
  name: string
  intervalSeconds: number
  startRegister: number
  count: number
  functionCode: number
}

export interface CommandTemplate {
  id: string
  profileId: string
  name: string
  key: string | null
  description: string | null
  registerNumber: number
  functionCode: number
  value: number
  confirmationRequired: boolean
  minRole: Role
  promptForValue: boolean
  offValue: number | null
  statusDataPointKey: string | null
  category: "TEMPERATURE" | "FOGGING" | "OTHER" | null
  scaleFactor: number
  offset: number
  unit: string | null
}

// ── Device ────────────────────────────────

export interface Device {
  id: string
  tenantId: string
  gatewayId: string
  siteId: string | null
  zoneId: string | null
  profileId: string
  profileName: string
  name: string
  slaveId: number
  protocol: DeviceProtocol
  ipAddress: string | null
  port: number | null
  timeoutSeconds: number
  status: DeviceStatus
  lastReadingAt: string | null
  createdAt: string
  recordedDataPoints: string[]
  recordedDataPointRetentionDays: Record<string, number>
  dataPointGroups: Record<string, string>
  commandGroups: Record<string, string>
  sortOrder: number | null
  zoneOrder: Record<string, number>
}

// ── Admin Overview ────────────────────────

export interface AdminTenantSummary {
  id: string
  name: string
  slug: string
  deviceCount: number
  onlineCount: number
  offlineCount: number
}

export interface AdminOverview {
  tenants: AdminTenantSummary[]
  totalDevices: number
  totalOnline: number
  totalOffline: number
}

// ── Alert Rule ────────────────────────────

export interface AlertRule {
  id: string
  tenantId: string
  deviceId: string
  deviceName: string
  dataPointKey: string
  name: string
  condition: AlertCondition
  threshold: number
  severity: AlertSeverity
  enabled: boolean
  cooldownMinutes: number
  createdAt: string
  updatedAt: string
}

// ── Alert ─────────────────────────────────

export interface Alert {
  id: string
  tenantId: string
  alertRuleId: string
  ruleName: string
  deviceId: string
  deviceName: string
  dataPointKey: string
  triggeredValue: number
  severity: AlertSeverity
  status: AlertStatus
  triggeredAt: string
  acknowledgedAt: string | null
  acknowledgedBy: string | null
  resolvedAt: string | null
  resolvedBy: string | null
}

// ── Reading ───────────────────────────────

export interface Reading {
  time: string
  deviceId: string
  dataPoint: string
  value: number | null
  rawValue: number | null
  quality: ReadingQuality
  unit: string | null
}

// ── Sampling Group ────────────────────────

export interface SamplingChannel {
  deviceId: string
  deviceName: string
  siteId: string | null
  siteName: string | null
  dataPointKey: string
  label: string
  unit: string | null
}

export interface SamplingGroup {
  id: string
  name: string
  description: string | null
  createdAt: string
  channels: SamplingChannel[]
}
