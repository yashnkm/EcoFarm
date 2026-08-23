import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

/** Text filter above an admin table — paired with useSortFilter. */
export function TableFilterInput({
  value,
  onChange,
  placeholder = "Filter…",
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={`relative w-full max-w-xs ${className ?? ""}`}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  )
}
