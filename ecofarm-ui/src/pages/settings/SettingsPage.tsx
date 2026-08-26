import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { authApi } from "@/api/auth"
import { useAuthStore } from "@/store/authStore"
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
type ChangePasswordForm = z.infer<typeof schema>

export function SettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)
  const [forgotOpen, setForgotOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  const signOutToLogin = (message: string) => {
    clear()
    toast.success(message)
    navigate("/login", { replace: true })
  }

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordForm) => authApi.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      reset()
      signOutToLogin("Password changed — please sign in again")
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Couldn't change your password"),
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and security.</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span>{user?.firstName || user?.lastName ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <Badge variant="secondary">{user?.role.replace("_", " ")}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Organisation</span>
            <span>{user?.tenantName}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <form onSubmit={handleSubmit((d) => changePasswordMutation.mutate(d))}>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>You'll be signed out everywhere and need to sign back in.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field data-invalid={errors.currentPassword ? true : undefined}>
              <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...register("currentPassword")}
              />
              {errors.currentPassword && <FieldError>{errors.currentPassword.message}</FieldError>}
            </Field>
            <Field data-invalid={errors.newPassword ? true : undefined}>
              <FieldLabel htmlFor="newPassword">New password</FieldLabel>
              <Input id="newPassword" type="password" autoComplete="new-password" {...register("newPassword")} />
              {errors.newPassword && <FieldError>{errors.newPassword.message}</FieldError>}
            </Field>
            <Field data-invalid={errors.confirmPassword ? true : undefined}>
              <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && <FieldError>{errors.confirmPassword.message}</FieldError>}
            </Field>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => setForgotOpen(true)}
            >
              Don't remember your current password?
            </button>
            <Button type="submit" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending && <Spinner data-icon="inline-start" />}
              Change password
            </Button>
          </CardFooter>
        </form>
      </Card>

      <ForgotPasswordDialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        defaultEmail={user?.email}
        onSent={() => signOutToLogin("Check your email for a temporary password")}
      />
    </div>
  )
}
