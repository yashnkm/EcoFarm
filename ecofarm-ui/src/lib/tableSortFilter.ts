import { useMemo, useState } from "react"

export interface SortState {
  key: string
  dir: "asc" | "desc"
}

/** Shared sort+filter behavior for admin tables: a text filter (matched via
 * a caller-supplied predicate, so each table decides which columns count)
 * and click-to-sort columns (via a caller-supplied comparator per key).
 * Clicking a column cycles asc -> desc -> unsorted; clicking a different
 * column starts it fresh at asc. */
export function useSortFilter<T>(
  items: T[],
  matchesFilter: (item: T, query: string) => boolean,
  comparators: Record<string, (a: T, b: T) => number>
) {
  const [filter, setFilter] = useState("")
  const [sort, setSort] = useState<SortState | null>(null)

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" }
      if (prev.dir === "asc") return { key, dir: "desc" }
      return null
    })
  }

  const result = useMemo(() => {
    const query = filter.trim().toLowerCase()
    let list = query ? items.filter((i) => matchesFilter(i, query)) : items
    if (sort) {
      const cmp = comparators[sort.key]
      if (cmp) {
        list = [...list].sort((a, b) => (sort.dir === "asc" ? cmp(a, b) : cmp(b, a)))
      }
    }
    return list
  }, [items, filter, sort, matchesFilter, comparators])

  return { filter, setFilter, sort, toggleSort, result }
}
