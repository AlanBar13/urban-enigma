import Signup from '@/components/Signup'
import { getInviteFn, removeInviteFn } from '@/lib/invites/functions'
import { logger } from '@/utils/logger'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Home, AlertTriangle, Clock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/accept-invite')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || '',
    }
  },
  loaderDeps: ({ search: { token } }) => ({ token }),
  loader: async ({ deps: { token } }) => {
    const invite = await getInviteFn({ data: { token } })
    if (invite?.expires_at && new Date(invite.expires_at) < new Date()) {
      logger('warn', 'Invite expired:', { token })
      await removeInviteFn({ data: { token } })
      return { invite: null, expired: true }
    }
    return { invite, expired: false }
  },
  head: () => ({
    meta: [
      {
        title: 'Aceptar Invitación | Fraccio'
      }
    ]
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { invite, expired } = Route.useLoaderData()

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4">
      {invite ? (
        <Signup invite={invite} />
      ) : (
        <div className="w-full max-w-md">
          {/* Error State */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center gap-2 mb-4">
              <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                {expired ? (
                  <Clock className="h-7 w-7 text-destructive" />
                ) : (
                  <AlertTriangle className="h-7 w-7 text-destructive" />
                )}
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {expired ? 'Invitación Expirada' : 'Invitación No Válida'}
            </h1>
            <p className="text-muted-foreground">
              {expired
                ? 'Esta invitación ha caducado y ya no es válida'
                : 'El enlace de invitación no es válido o ya fue utilizado'
              }
            </p>
          </div>

          <div className="bg-card border-2 rounded-xl p-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">¿Qué puedes hacer?</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Solicita una nueva invitación al administrador de tu fraccionamiento</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Verifica que el enlace esté completo y no haya sido alterado</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Si ya tienes cuenta, simplemente inicia sesión</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <Link to="/login" className="block">
                  <Button className="w-full" size="lg">
                    Ir a Iniciar Sesión
                  </Button>
                </Link>
                <Link to="/" className="block">
                  <Button variant="outline" className="w-full" size="lg">
                    <Home className="h-4 w-4 mr-2" />
                    Volver al Inicio
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Fraccio. Todos los derechos reservados.</p>
          </div>
        </div>
      )}
    </div>
  )
}
