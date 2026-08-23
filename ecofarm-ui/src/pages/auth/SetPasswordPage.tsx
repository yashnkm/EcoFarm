import { useState } from "react"
import { useLocation, useNavigate, Navigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Sprout } from "lucide-react"

import { authApi } from "@/api/auth"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"

const isAdminPortal = window.location.hostname.startsWith("admin.")

const schema = z
  .object({
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
type SetPasswordForm = z.infer<typeof schema>

/** Where a forced first-login (or, later, "forgot password") lands — the
 * resetToken travels here via router state, not a URL query param, so it
 * never sits in the address bar or browser history. Landing here without
 * one (e.g. a direct visit) just bounces back to login. */
export function SetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const resetToken = (location.state as { resetToken?: string } | null)?.resetToken
  const setAuth = useAuthStore((s) => s.setAuth)
  const authenticated = useAuthStore((s) => !!s.accessToken)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<SetPasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  })

  if (authenticated) return <Navigate to="/" replace />
  if (!resetToken) return <Navigate to="/login" replace />

  const onSubmit = async (data: SetPasswordForm) => {
    setSubmitting(true)
    try {
      const res = await authApi.setPassword(resetToken, data.newPassword)
      setAuth(res.accessToken, res.refreshToken, res.user, isAdminPortal)
      toast.success("Password set — welcome!")
      navigate(isAdminPortal ? "/admin/overview" : "/", { replace: true })
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ?? "Couldn't set your password — the link may have expired, try signing in again"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sprout className="size-4" />
            </div>
            <span className="font-semibold">EcoFarm SCADA</span>
          </div>
          <CardTitle>Set your password</CardTitle>
          <CardDescription>
            Choose a password for your account — you'll use this to sign in from now on.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <Field data-invalid={errors.newPassword ? true : undefined}>
              <FieldLabel htmlFor="newPassword">New password</FieldLabel>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                autoFocus
                {...register("newPassword")}
              />
              {errors.newPassword && <FieldError>{errors.newPassword.message}</FieldError>}
            </Field>
            <Field data-invalid={errors.confirmPassword ? true : undefined}>
              <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && <FieldError>{errors.confirmPassword.message}</FieldError>}
            </Field>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              Set password and sign in
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
