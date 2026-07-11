import { createFileRoute, redirect } from '@tanstack/react-router'
import { getWhatsappStatusFn } from '@/lib/whatsapp'
import WhatsappContainer from '@/components/admin/WhatsappContainer'

export const Route = createFileRoute('/$tenantId/admin-whatsapp')({
  beforeLoad: ({ context }) => {
    // Check if user is admin or superadmin
    if (context.user.role !== 'admin' && context.user.role !== 'superadmin') {
      throw redirect({
        to: `/$tenantId`,
        params: { tenantId: context.tenant.path },
      })
    }
  },
  loader: async ({ context }) => {
    const { session } = await getWhatsappStatusFn({
      data: { tenantId: context.tenant.id },
    })
    return { session }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { tenant } = Route.useRouteContext()
  const { session } = Route.useLoaderData()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">WhatsApp</h1>
        <p className="text-gray-600 mt-1">
          Conecta la sesión de WhatsApp del fraccionamiento y envía mensajes al
          grupo
        </p>
      </div>

      <div>
        <WhatsappContainer tenantId={tenant.id} initialSession={session} />
      </div>
    </div>
  )
}
