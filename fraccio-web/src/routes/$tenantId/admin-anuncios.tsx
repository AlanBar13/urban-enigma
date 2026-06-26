import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAdminAnunciosFn } from '@/lib/anuncios'
import AnunciosContainer from '@/components/admin/AnunciosContainer'

export const Route = createFileRoute('/$tenantId/admin-anuncios')({
  beforeLoad: ({ context }) => {
    // Check if user is admin or superadmin
    if (context.user.role !== 'admin' && context.user.role !== 'superadmin') {
      throw redirect({ to: `/$tenantId/anuncios`, params: { tenantId: context.tenant.path } })
    }
  },
  loader: async ({ context }) => {
    const announcements = await getAdminAnunciosFn({ data: { tenantId: context.tenant.id } })
    return { announcements }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { tenant } = Route.useRouteContext()
  const { announcements } = Route.useLoaderData()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Administrar Anuncios</h1>
        <p className="text-gray-600 mt-1">
          Gestiona los anuncios del fraccionamiento y controla su visibilidad
        </p>
      </div>

      <div>
        <AnunciosContainer tenantId={tenant.id} announcements={announcements} />
      </div>
    </div>
  )
}
