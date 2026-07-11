import { Link, createFileRoute } from '@tanstack/react-router'
import { CheckCircle } from 'lucide-react'
import { z } from 'zod'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const searchSchema = z.object({
  session_id: z.string().optional(),
})

export const Route = createFileRoute('/$tenantId/pagos/success')({
  validateSearch: searchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const { session_id } = Route.useSearch()

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold mb-2">¡Pago Exitoso!</h1>

        <p className="text-gray-600 mb-6">
          Tu pago ha sido procesado correctamente. Recibirás un correo
          electrónico de confirmación en breve.
        </p>

        {session_id && (
          <p className="text-xs text-gray-400 mb-6">
            ID de sesión: {session_id}
          </p>
        )}

        <div className="space-y-2">
          <Link to="/$tenantId/pagos">
            <Button className="w-full">Ver Historial de Pagos</Button>
          </Link>
          <Link to="/$tenantId/casa">
            <Button variant="outline" className="w-full">
              Volver al Inicio
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
