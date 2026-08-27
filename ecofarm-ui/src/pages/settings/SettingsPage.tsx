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
import { InstallAppCard } from "@/components/pwa/InstallAppCard"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
type ChangePasswordForm = z.infer<typeof passwordSchema>

const emailSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newEmail: z.string().email("Enter a valid email"),
})
type ChangeEmailForm = z.infer<typeof emailSchema>

const requestEmailSchema = z.object({
  requestedEmail: z.string().email("Enter a valid email"),
  note: z.string().max(500).optional(),
})
type RequestEmailChangeForm = z.infer<typeof requestEmailSchema>

export function SettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [requestEmailOpen, setRequestEmailOpen] = useState(false)

  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  const emailForm = useForm<ChangeEmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { currentPassword: "", newEmail: "" },
  })

  const requestEmailForm = useForm<RequestEmailChangeForm>({
    resolver: zodResolver(requestEmailSchema),
    defaultValues: { requestedEmail: "", note: "" },
  })

  const signOutToLogin = (message: string) => {
    clear()
    toast.success(message)
    navigate("/login", { replace: true })
  }

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordForm) => authApi.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      passwordForm.reset()
      signOutToLogin("Password changed — please sign in again")
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Couldn't change your password"),
  })

  const changeEmailMutation = useMutation({
    mutationFn: (data: ChangeEmailForm) => authApi.changeEmail(data.currentPassword, data.newEmail),
    onSuccess: () => {
      emailForm.reset()
      signOutToLogin("Email changed — please sign in again")
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Couldn't change your email"),
  })

  const requestEmailChangeMutation = useMutation({
    mutationFn: (data: RequestEmailChangeForm) => authApi.requestEmailChange(data.requestedEmail, data.note),
    onSuccess: () => {
      requestEmailForm.reset()
      setRequestEmailOpen(false)
      toast.success("Sent — a tenant admin or super admin will review it")
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Couldn't send the request"),
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

      <InstallAppCard />

      <Card className="max-w-lg">
        <form onSubmit={emailForm.handleSubmit((d) => changeEmailMutation.mutate(d))}>
          <CardHeader>
            <CardTitle>Change email</CardTitle>
            <CardDescription>You'll be signed out everywhere and need to sign back in.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field data-invalid={emailForm.formState.errors.newEmail ? true : undefined}>
              <FieldLabel htmlFor="newEmail">New email</FieldLabel>
              <Input id="newEmail" type="email" autoComplete="email" {...emailForm.register("newEmail")} />
              {emailForm.formState.errors.newEmail && (
                <FieldError>{emailForm.formState.errors.newEmail.message}</FieldError>
              )}
            </Field>
            <Field data-invalid={emailForm.formState.errors.currentPassword ? true : undefined}>
              <FieldLabel htmlFor="emailCurrentPassword">Current password</FieldLabel>
              <Input
                id="emailCurrentPassword"
                type="password"
                autoComplete="current-password"
                {...emailForm.register("currentPassword")}
              />
              {emailForm.formState.errors.currentPassword && (
                <FieldError>{emailForm.formState.errors.currentPassword.message}</FieldError>
              )}
            </Field>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => setRequestEmailOpen(true)}
            >
              Don't know your password?
            </button>
            <Button type="submit" disabled={changeEmailMutation.isPending}>
              {changeEmailMutation.isPending && <Spinner data-icon="inline-start" />}
              Change email
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="max-w-lg">
        <form onSubmit={passwordForm.handleSubmit((d) => changePasswordMutation.mutate(d))}>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>You'll be signed out everywhere and need to sign back in.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field data-invalid={passwordForm.formState.errors.currentPassword ? true : undefined}>
              <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...passwordForm.register("currentPassword")}
              />
              {passwordForm.formState.errors.currentPassword && (
                <FieldError>{passwordForm.formState.errors.currentPassword.message}</FieldError>
              )}
            </Field>
            <Field data-invalid={passwordForm.formState.errors.newPassword ? true : undefined}>
              <FieldLabel htmlFor="newPassword">New password</FieldLabel>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register("newPassword")}
              />
              {passwordForm.formState.errors.newPassword && (
                <FieldError>{passwordForm.formState.errors.newPassword.message}</FieldError>
              )}
            </Field>
            <Field data-invalid={passwordForm.formState.errors.confirmPassword ? true : undefined}>
              <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register("confirmPassword")}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <FieldError>{passwordForm.formState.errors.confirmPassword.message}</FieldError>
              )}
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

      <Dialog open={requestEmailOpen} onOpenChange={setRequestEmailOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={requestEmailForm.handleSubmit((d) => requestEmailChangeMutation.mutate(d))}>
            <DialogHeader>
              <DialogTitle>Ask an admin to change it for you</DialogTitle>
              <DialogDescription>
                A tenant admin or super admin will review this and update your email — no password needed.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <Field data-invalid={requestEmailForm.formState.errors.requestedEmail ? true : undefined}>
                <FieldLabel htmlFor="requestedEmail">New email</FieldLabel>
                <Input id="requestedEmail" type="email" autoFocus {...requestEmailForm.register("requestedEmail")} />
                {requestEmailForm.formState.errors.requestedEmail && (
                  <FieldError>{requestEmailForm.formState.errors.requestedEmail.message}</FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="note">Note (optional)</FieldLabel>
                <Input id="note" placeholder="Anything that helps them verify it's you" {...requestEmailForm.register("note")} />
              </Field>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={requestEmailChangeMutation.isPending}>
                {requestEmailChangeMutation.isPending && <Spinner data-icon="inline-start" />}
                Send request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
