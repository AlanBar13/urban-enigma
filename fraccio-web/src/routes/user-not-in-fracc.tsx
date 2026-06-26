import { createFileRoute, Link } from '@tanstack/react-router'
import { Home, ShieldAlert, Mail, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/user-not-in-fracc')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center">
              <Home className="h-16 w-16 text-primary" />
            </div>
            <div className="absolute -bottom-2 -right-2 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Acceso No Autorizado
          </h1>
          <p className="text-xl text-muted-foreground">
            No tienes permiso para acceder a este fraccionamiento
          </p>
        </div>

        {/* Main Message */}
        <div className="bg-card border rounded-xl p-6 shadow-lg">
          <div className="flex items-start gap-4 text-left">
            <UserX className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">¿Por qué estoy viendo esto?</h3>
              <p className="text-muted-foreground">
                Tu cuenta de usuario no está asociada con este fraccionamiento.
                Es posible que aún no hayas sido invitado o que tu acceso esté pendiente de aprobación.
              </p>
            </div>
          </div>
        </div>

        {/* What to do */}
        <div className="bg-muted/50 border rounded-xl p-6">
          <h3 className="font-semibold mb-4 text-left">¿Qué puedo hacer?</h3>
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">1</span>
              </div>
              <div>
                <h4 className="font-medium mb-1">Solicita una invitación</h4>
                <p className="text-sm text-muted-foreground">
                  Contacta al administrador de tu fraccionamiento para que te envíe una invitación de acceso.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">2</span>
              </div>
              <div>
                <h4 className="font-medium mb-1">Verifica tu correo electrónico</h4>
                <p className="text-sm text-muted-foreground">
                  Revisa tu bandeja de entrada (y spam) por si tienes una invitación pendiente.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">3</span>
              </div>
              <div>
                <h4 className="font-medium mb-1">Inicia sesión con otra cuenta</h4>
                <p className="text-sm text-muted-foreground">
                  Si tienes múltiples cuentas, asegúrate de estar usando la correcta.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">
          <div className="flex items-center justify-center gap-2 text-primary mb-2">
            <Mail className="h-5 w-5" />
            <h3 className="font-semibold">¿Necesitas ayuda?</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Si crees que esto es un error o necesitas asistencia, contacta al administrador
            de tu fraccionamiento para resolver el problema.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button size="lg" variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Volver al Inicio
            </Button>
          </Link>
          <Button
            size="lg"
            onClick={() => {
              // This would trigger a logout
              window.location.href = '/'
            }}
          >
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  )
}
