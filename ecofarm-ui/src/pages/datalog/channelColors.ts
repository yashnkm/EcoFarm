// Fixed palette cycled across selected channels — distinct enough to tell
// apart at a glance in both the chart legend and the list header, and
// readable on both light and dark backgrounds.
const PALETTE = [
  "#3b82f6", // blue
  "#f97316", // orange
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#eab308", // yellow
  "#84cc16", // lime
  "#f43f5e", // rose
  "#6366f1", // indigo
  "#14b8a6", // teal
]

export function channelColor(index: number): string {
  return PALETTE[index % PALETTE.length]
}
