import { createFileRoute, redirect } from '@tanstack/react-router'
import UsersContainer from '@/components/admin/UsersContainer'
import { getHousesFn } from '@/lib/houses'
import { getTenantUsersFn } from '@/lib/user'
import { getTenantInvitesFn } from '@/lib/invites/functions'

export const Route = createFileRoute('/$tenantId/usuarios')({
  beforeLoad: ({ context }) => {
    if (context.user.role !== 'admin' && context.user.role !== 'superadmin') {
      throw redirect({
        to: '/$tenantId',
        params: { tenantId: context.tenant.path },
      })
    }
  },
  loader: async ({ context }) => {
    const housesReq = getHousesFn({ data: { tenantId: context.tenant.id } })
    const usersReq = getTenantUsersFn({ data: { tenantId: context.tenant.id } })
    const invitesReq = getTenantInvitesFn({
      data: { tenantId: context.tenant.id },
    })

    const [houses, users, invites] = await Promise.all([
      housesReq,
      usersReq,
      invitesReq,
    ])
    return { houses, users, invites }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { tenant } = Route.useRouteContext()
  const { houses, users, invites } = Route.useLoaderData()
  return (
    <div>
      <h1 className="text-2xl font-bold">Administrar Usuarios</h1>
      <UsersContainer
        tenantId={tenant.id}
        houses={houses}
        users={users}
        invites={invites}
      />
    </div>
  )
}
