import { createFileRoute, redirect } from '@tanstack/react-router'
import CasasContainer from '@/components/admin/CasasContainer'
import { getHousesFn } from '@/lib/houses'

export const Route = createFileRoute('/$tenantId/adminCasas')({
  beforeLoad: ({ context }) => {
    if (context.user.role !== 'admin' && context.user.role !== 'superadmin') {
      throw redirect({
        to: '/$tenantId',
        params: { tenantId: context.tenant.path },
      })
    }
  },
  loader: async ({ context }) => {
    const houses = await getHousesFn({ data: { tenantId: context.tenant.id } })

    return { houses }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { tenant } = Route.useRouteContext()
  const { houses } = Route.useLoaderData()
  return (
    <div>
      <h1 className="text-2xl font-bold">Administrar Casas</h1>
      <CasasContainer houses={houses} tenantId={tenant.id} />
    </div>
  )
}
