import { useState } from "react"
import { useNavigate, Navigate } from "react-router-dom"
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
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"

const schema = z.object({
  slug: z.string().optional(),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})
type LoginForm = z.infer<typeof schema>

export function AdminLoginPage() {
  const navigate = useNavigate()
  const authenticated = useAuthStore((s) => !!s.accessToken)
  const setAuth = useAuthStore((s) => s.setAuth)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { slug: "", email: "", password: "" },
  })

  if (authenticated) return <Navigate to="/" replace />

  const onSubmit = async (data: LoginForm) => {
    setSubmitting(true)
    try {
      const res = await authApi.login(data.email, data.password, data.slug)
      const isOverview = !data.slug?.trim()
      setAuth(res.accessToken, res.refreshToken, res.user, isOverview)
      toast.success(`Welcome, ${res.user.firstName ?? res.user.email} · ${res.user.tenantName}`)
      navigate(isOverview ? "/admin/overview" : "/", { replace: true })
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Login failed"
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
          <CardTitle>Admin sign in</CardTitle>
          <CardDescription>
            Leave Organisation blank to see the platform overview, or enter a client slug to manage their dashboard.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <Field data-invalid={errors.slug ? true : undefined}>
              <FieldLabel htmlFor="slug">Organisation <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
              <Input id="slug" placeholder="e.g. chandrama" autoComplete="organization" autoFocus {...register("slug")} />
              <FieldDescription>Leave blank for the platform overview across all clients.</FieldDescription>
            </Field>
            <Field data-invalid={errors.email ? true : undefined}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && <FieldError>{errors.email.message}</FieldError>}
            </Field>
            <Field data-invalid={errors.password ? true : undefined}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              {errors.password && <FieldError>{errors.password.message}</FieldError>}
            </Field>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              Sign in
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
