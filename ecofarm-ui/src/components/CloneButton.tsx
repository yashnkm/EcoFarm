import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  onClick: () => void
  label?: string
}

export function CloneButton({ onClick, label = "Clone" }: Props) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <Copy />
    </Button>
  )
}
