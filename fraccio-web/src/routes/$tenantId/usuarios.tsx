import UsersContainer from '@/components/admin/UsersContainer'
import { getHousesFn } from '@/lib/houses'
import { getTenantUsersFn } from '@/lib/user'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/$tenantId/usuarios')({
  loader: async ({ context }) => {
    const housesReq = getHousesFn({ data: { tenantId: context.tenant.id } })
    const usersReq = getTenantUsersFn({ data: { tenantId: context.tenant.id } })

    const [houses, users] = await Promise.all([housesReq, usersReq])
    return { houses, users }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { tenant } = Route.useRouteContext()
  const { houses, users } = Route.useLoaderData()
  return (
    <div>
      <h1 className="text-2xl font-bold">Administrar Usuarios</h1>
      <UsersContainer tenantId={tenant.id} houses={houses} users={users} />
    </div>
  )
}
