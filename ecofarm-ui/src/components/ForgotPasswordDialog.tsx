import { useEffect, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Mail } from "lucide-react"

import { authApi } from "@/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const schema = z.object({ email: z.string().email("Enter a valid email") })
type ForgotPasswordForm = z.infer<typeof schema>

interface ForgotPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill (e.g. whatever the user already typed on the login form, or
   * their own address when opened from Settings). */
  defaultEmail?: string
  /** Called after the mail is sent (or "sent" — the backend never reveals
   * whether the address actually had an account). Use this to sign the
   * user out if they triggered this while already logged in, since the
   * backend revokes all of that account's sessions. */
  onSent?: () => void
}

/**
 * Mails a fresh one-time temp password — same mechanism as inviting a new
 * user. Always reports success regardless of whether the email matched an
 * account, matching the backend's response, so this can't be used to test
 * which emails have accounts.
 */
export function ForgotPasswordDialog({ open, onOpenChange, defaultEmail, onSent }: ForgotPasswordDialogProps) {
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: defaultEmail ?? "" },
  })

  useEffect(() => {
    if (open) {
      reset({ email: defaultEmail ?? "" })
      setSent(false)
    }
  }, [open, defaultEmail, reset])

  const mutation = useMutation({
    mutationFn: (data: ForgotPasswordForm) => authApi.forgotPassword(data.email),
    onSuccess: () => setSent(true),
    onError: () => toast.error("Something went wrong — try again in a moment"),
  })

  const handleClose = (o: boolean) => {
    onOpenChange(o)
    if (!o && sent) onSent?.()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset your password</DialogTitle>
          <DialogDescription>
            {sent
              ? "If that email has an account, we've sent a temporary password to it."
              : "We'll email you a temporary password to sign in with."}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-4 shrink-0" />
              Check your inbox, then sign in with the temporary password — you'll be asked
              to set a new one right away.
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
            <div className="flex flex-col gap-4 py-2">
              <Field data-invalid={errors.email ? true : undefined}>
                <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
                <Input id="forgot-email" type="email" autoFocus {...register("email")} />
                {errors.email && <FieldError>{errors.email.message}</FieldError>}
              </Field>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Spinner data-icon="inline-start" />}
                Send temporary password
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
