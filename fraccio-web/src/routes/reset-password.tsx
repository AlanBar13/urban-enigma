import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { AlertCircle, ArrowRight, Home, Loader2, Lock } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/notifications'
import { resetPasswordFn } from '@/lib/user'
import { logger } from '@/utils/logger'

const searchSchema = z.object({
  token_hash: z.string().optional(),
})

export const Route = createFileRoute('/reset-password')({
  validateSearch: searchSchema,
  component: ResetPasswordComp,
  head: () => ({
    meta: [
      {
        title: 'Nueva Contraseña | Fraccio',
      },
    ],
  }),
})

function ResetPasswordComp() {
  const router = useRouter()
  const { token_hash: tokenHash } = Route.useSearch()
  const { addToast } = useToast()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const resetPassword = useServerFn(resetPasswordFn)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!tokenHash) return

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    try {
      setIsLoading(true)
      const { error: resetError, message } = await resetPassword({
        data: { tokenHash, password },
      })

      if (resetError) {
        setError(message)
        return
      }

      addToast({
        type: 'success',
        description: 'Contraseña actualizada. Inicia sesión.',
        duration: 5000,
      })
      router.navigate({ to: '/login' })
    } catch (error) {
      logger('error', 'Password reset error:', { error })
      setError('Ocurrió un error al actualizar la contraseña')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--surface-container)] p-4">
      <div className="w-full max-w-md">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 mb-4"
          >
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Home className="h-7 w-7 text-primary-foreground" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Nueva Contraseña</h1>
          <p className="text-muted-foreground">
            Elige una contraseña para tu cuenta
          </p>
        </div>

        <Card className="bg-white/80 backdrop-blur-[12px]">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold">
              {tokenHash ? 'Restablecer Contraseña' : 'Enlace inválido'}
            </CardTitle>
            <CardDescription>
              {tokenHash
                ? 'La contraseña debe tener al menos 6 caracteres'
                : 'Este enlace no es válido o ya expiró. Solicita uno nuevo.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tokenHash ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-11"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 h-11"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-11 text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      Guardar Contraseña
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <Button asChild className="w-full h-11 text-base">
                <Link to="/forgot-password">Solicitar nuevo enlace</Link>
              </Button>
            )}
          </CardContent>
          <CardFooter>
            <p className="w-full text-center text-sm text-muted-foreground">
              <Link
                to="/login"
                className="text-primary hover:underline font-medium"
              >
                Volver a iniciar sesión
              </Link>
            </p>
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Fraccio. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
