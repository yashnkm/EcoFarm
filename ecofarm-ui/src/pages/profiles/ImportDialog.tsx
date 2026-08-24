import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Upload, FileWarning, CheckCircle2 } from "lucide-react"

import { profileImportExportApi, type ImportPreviewResponse } from "@/api/profileImportExport"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { DeviceProfile } from "@/types/api"

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Import into this existing profile. Omit to always create a new profile (list-page entry point). */
  targetProfileId?: string
  targetProfileName?: string
  onImported: (profile: DeviceProfile) => void
}

/**
 * File picker -> preview (parse + validate, nothing persisted) -> diff ->
 * Confirm -> apply. Preview and apply share the exact same backend
 * validation, so Confirm is disabled whenever the preview reports any
 * error — nothing is ever persisted from a file that failed validation.
 */
export function ImportDialog({ open, onOpenChange, targetProfileId, targetProfileName, onImported }: ImportDialogProps) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [newProfileName, setNewProfileName] = useState("")
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null)

  const creatingNew = !targetProfileId

  const previewMutation = useMutation({
    mutationFn: (f: File) => profileImportExportApi.preview(f, targetProfileId),
    onSuccess: (data) => setPreview(data),
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "Could not read that file")
      setFile(null)
    },
  })

  const applyMutation = useMutation({
    mutationFn: (f: File) => profileImportExportApi.apply(f, targetProfileId, creatingNew ? newProfileName : undefined),
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: ["device-profiles"] })
      queryClient.invalidateQueries({ queryKey: ["device-profile", profile.id] })
      queryClient.invalidateQueries({ queryKey: ["poll-groups", profile.id] })
      queryClient.invalidateQueries({ queryKey: ["data-points", profile.id] })
      queryClient.invalidateQueries({ queryKey: ["commands", profile.id] })
      toast.success(creatingNew ? "Profile imported" : "Profile updated")
      onImported(profile)
      reset()
      onOpenChange(false)
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Import failed"),
  })

  const reset = () => {
    setFile(null)
    setPreview(null)
    setNewProfileName("")
  }

  const handleFile = (f: File | null) => {
    setFile(f)
    setPreview(null)
    if (f) previewMutation.mutate(f)
  }

  const hasErrors = !!preview && (preview.errorCount > 0 || preview.fileErrors.length > 0)
  const canConfirm = !!preview && !hasErrors && !!file && (!creatingNew || newProfileName.trim().length > 0)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{creatingNew ? "Import as new profile" : `Import into "${targetProfileName}"`}</DialogTitle>
          <DialogDescription>
            {creatingNew
              ? "Upload a Device Profile CSV to create a new profile from it."
              : "Upload a Device Profile CSV. Rows are matched by name/key and upserted — nothing already in this profile is ever deleted."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <Field>
            <FieldLabel htmlFor="import-file">CSV file</FieldLabel>
            <Input
              id="import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </Field>

          {creatingNew && (
            <Field>
              <FieldLabel htmlFor="new-profile-name">New profile name</FieldLabel>
              <Input
                id="new-profile-name"
                placeholder="Schneider PM5560"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
              />
            </Field>
          )}

          {previewMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Reading file…
            </div>
          )}

          {preview && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{preview.newCount} new</Badge>
                <Badge variant="outline">{preview.updateCount} updated</Badge>
                {preview.errorCount > 0 && <Badge variant="destructive">{preview.errorCount} error(s)</Badge>}
                {!hasErrors && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-3.5" /> Ready to import
                  </span>
                )}
              </div>

              {preview.fileErrors.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
                  {preview.fileErrors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}

              <div className="themed-scrollbar max-h-64 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium">Row</th>
                      <th className="px-2 py-1 text-left font-medium">Type</th>
                      <th className="px-2 py-1 text-left font-medium">Item</th>
                      <th className="px-2 py-1 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr key={`${r.type}-${r.rowNumber}`} className="border-t">
                        <td className="px-2 py-1 text-muted-foreground">{r.rowNumber}</td>
                        <td className="px-2 py-1">{r.type}</td>
                        <td className="px-2 py-1 font-mono text-xs">{r.identifier ?? "—"}</td>
                        <td className="px-2 py-1">
                          {r.errors.length > 0 ? (
                            <div className="flex items-start gap-1 text-destructive">
                              <FileWarning className="mt-0.5 size-3.5 shrink-0" />
                              <span>{r.errors.join("; ")}</span>
                            </div>
                          ) : (
                            <Badge variant={r.action === "create" ? "secondary" : "outline"}>{r.action}</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => file && applyMutation.mutate(file)}
            disabled={!canConfirm || applyMutation.isPending}
          >
            {applyMutation.isPending ? <Spinner data-icon="inline-start" /> : <Upload data-icon="inline-start" />}
            Confirm import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
