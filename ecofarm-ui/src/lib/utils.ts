import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "Polyhouse-2" before "Polyhouse-10" — plain string sort gets this
 * backwards since "1" < "2" lexically. Used as the default order for any
 * list named with a trailing number (devices, gateways, sections, poll
 * groups), before a user-defined order (if any) takes over. */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
}

/** Sorts by an explicit position when every item has one; otherwise (mixed
 * or all-null — e.g. before any manual reordering has happened) falls back
 * to naturalCompare on name, so a fresh list starts in a sane order without
 * requiring positions to be backfilled first. */
export function sortByPositionOrName<T>(
  items: T[],
  getPosition: (item: T) => number | null | undefined,
  getName: (item: T) => string
): T[] {
  const allPositioned = items.every((i) => getPosition(i) != null)
  if (allPositioned) {
    return [...items].sort((a, b) => getPosition(a)! - getPosition(b)!)
  }
  return [...items].sort((a, b) => naturalCompare(getName(a), getName(b)))
}
