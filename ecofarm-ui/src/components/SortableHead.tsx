import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"

import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { SortState } from "@/lib/tableSortFilter"

/** A clickable TableHead that shows the current sort direction for its
 * column — used together with useSortFilter so every admin table's sort
 * UI looks and behaves the same. */
export function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string
  sortKey: string
  sort: SortState | null
  onSort: (key: string) => void
  className?: string
}) {
  const active = sort?.key === sortKey
  return (
    <TableHead
      className={cn("cursor-pointer select-none hover:text-foreground", className)}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
        ) : (
          <ArrowUpDown className="size-3 text-muted-foreground/40" />
        )}
      </span>
    </TableHead>
  )
}
