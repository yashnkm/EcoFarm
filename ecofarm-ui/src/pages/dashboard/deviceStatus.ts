import type { Device, Reading } from "@/types/api"

// Shared online/offline visual language for device status, used by both
// the dashboard tiles and the live device detail card. Deliberately only
// two states — ONLINE (green) and everything else (grey) — so status stays
// glanceable instead of competing with alert-severity signaling.

export function isDeviceOnline(status: Device["status"]) {
  return status === "ONLINE"
}

// Whether to trust a live reading enough to display it is now a per-
// reading question, not a device-wide one — one stuck command (e.g. a
// write the device doesn't support) shouldn't blank out every other data
// point that's still updating normally. 60s is a bit above the backend's
// own 45s device-offline window (StatusMonitor.DEVICE_STALE_AFTER), so a
// reading doesn't flicker to "—" moments before the backend would even
// call the device offline.
const READING_STALE_AFTER_MS = 60_000

export function isReadingFresh(reading: Reading | undefined | null): boolean {
  if (!reading?.time) return false
  return Date.now() - new Date(reading.time).getTime() < READING_STALE_AFTER_MS
}

/** Left-edge tile accent — same color tokens as the status badge below, so
 * the accent and the badge always read as one signal, not two. */
export function statusAccentClass(status: Device["status"]) {
  return isDeviceOnline(status) ? "border-l-emerald-400" : "border-l-destructive"
}

/** Status badge variant + color override — ONLINE reads as a clear positive green. */
export function statusBadgeProps(status: Device["status"]) {
  if (isDeviceOnline(status)) {
    return {
      variant: "outline" as const,
      className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
    }
  }
  return { variant: "destructive" as const, className: undefined }
}
