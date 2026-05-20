import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  onClick: () => void
  label?: string
}

export function EditButton({ onClick, label = "Edit" }: Props) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <Pencil />
    </Button>
  )
}
