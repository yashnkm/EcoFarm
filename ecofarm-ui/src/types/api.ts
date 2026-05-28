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
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
  user: UserSummary
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
  mqttBrokerId: string | null
  mqttBrokerName: string | null
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
  serialNumber: string
  mqttClientId: string | null
  name: string | null
  baudRate: number
  parity: string
  stopBits: number
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
  description: string | null
  registerNumber: number
  functionCode: number
  value: number
  confirmationRequired: boolean
  minRole: Role
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
