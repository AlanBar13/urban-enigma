import { Link, createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Home,
  Loader2,
  Mail,
} from 'lucide-react'
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
import { requestPasswordResetFn } from '@/lib/user'
import { logger } from '@/utils/logger'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordComp,
  head: () => ({
    meta: [
      {
        title: 'Recuperar Contraseña | Fraccio',
      },
    ],
  }),
})

function ForgotPasswordComp() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const requestReset = useServerFn(requestPasswordResetFn)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Por favor ingresa tu correo electrónico')
      return
    }

    try {
      setIsLoading(true)
      await requestReset({ data: { email } })
      setSent(true)
    } catch (error) {
      logger('error', 'Password reset request error:', { error })
      setError('Ocurrió un error al enviar el correo')
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
          <h1 className="text-3xl font-bold mb-2">Recuperar Contraseña</h1>
          <p className="text-muted-foreground">
            Te enviaremos un enlace para crear una nueva
          </p>
        </div>

        <Card className="bg-white/80 backdrop-blur-[12px]">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold">
              {sent ? 'Revisa tu correo' : '¿Olvidaste tu contraseña?'}
            </CardTitle>
            <CardDescription>
              {sent
                ? 'El enlace expira en poco tiempo, úsalo pronto.'
                : 'Ingresa el correo con el que te registraste'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
                <p className="text-sm">
                  Si el correo está registrado, te enviamos un enlace para
                  restablecer tu contraseña.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar Enlace
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
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
