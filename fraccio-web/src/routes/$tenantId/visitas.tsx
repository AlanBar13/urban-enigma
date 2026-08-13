import { createFileRoute, redirect } from '@tanstack/react-router'
import { isFeatureEnabled } from '@/lib/tenants'
import { isAdmin, isGuard } from '@/lib/auth'
import { getPreferredVisitorsFn, getVisitsFn } from '@/lib/visitas/functions'
import VisitasContainer from '@/components/visitas/VisitasContainer'
import { PageHeader } from '@/components/layouts'

export const Route = createFileRoute('/$tenantId/visitas')({
  beforeLoad: ({ context }) => {
    if (!isFeatureEnabled(context.tenant.features, 'visitors')) {
      throw redirect({
        to: '/$tenantId',
        params: { tenantId: context.tenant.path },
      })
    }
    // Staff get the gate view instead — one staff surface, not two
    if (isAdmin(context.user) || isGuard(context.user)) {
      throw redirect({
        to: '/$tenantId/admin-visitas',
        params: { tenantId: context.tenant.path },
      })
    }
  },
  loader: async ({ context }) => {
    const [visits, preferred] = await Promise.all([
      getVisitsFn({ data: { tenantId: context.tenant.id } }),
      getPreferredVisitorsFn({ data: { tenantId: context.tenant.id } }),
    ])
    return { visits, preferred }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { tenant } = Route.useRouteContext()
  const { visits, preferred } = Route.useLoaderData()

  return (
    <div>
      <PageHeader
        title="Visitas"
        description="Avisa a caseta quién te visita para que la entrada sea más ágil."
      />
      <VisitasContainer
        tenantId={tenant.id}
        isStaff={false}
        visits={visits}
        preferred={preferred}
      />
    </div>
  )
}
