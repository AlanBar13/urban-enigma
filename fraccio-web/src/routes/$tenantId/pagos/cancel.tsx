import { createFileRoute, Link } from '@tanstack/react-router'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'

export const Route = createFileRoute('/$tenantId/pagos/cancel')({
  component: RouteComponent,
})

function RouteComponent() {
  const { tenantId } = Route.useParams()

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <XCircle className="w-16 h-16 text-orange-500" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Pago Cancelado</h1>

        <p className="text-gray-600 mb-6">
          Tu pago ha sido cancelado. No se realizó ningún cargo a tu cuenta.
          Puedes intentar nuevamente cuando estés listo.
        </p>

        <div className="space-y-2">
          <Link to={`/$tenantId/pagos`} params={{ tenantId }}>
            <Button className="w-full">Intentar de Nuevo</Button>
          </Link>
          <Link to={`/$tenantId`} params={{ tenantId }}>
            <Button variant="outline" className="w-full">
              Volver al Inicio
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
