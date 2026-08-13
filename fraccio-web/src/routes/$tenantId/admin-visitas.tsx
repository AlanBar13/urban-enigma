import { createFileRoute, redirect } from '@tanstack/react-router'
import { isFeatureEnabled } from '@/lib/tenants'
import { isAdmin, isGuard } from '@/lib/auth'
import { getPreferredVisitorsFn, getVisitsFn } from '@/lib/visitas/functions'
import VisitasContainer from '@/components/visitas/VisitasContainer'
import { PageHeader } from '@/components/layouts'

export const Route = createFileRoute('/$tenantId/admin-visitas')({
  beforeLoad: ({ context }) => {
    // Before the role check — its /visitas redirect would loop when off
    if (!isFeatureEnabled(context.tenant.features, 'visitors')) {
      throw redirect({
        to: '/$tenantId',
        params: { tenantId: context.tenant.path },
      })
    }
    if (!isAdmin(context.user) && !isGuard(context.user)) {
      throw redirect({
        to: '/$tenantId/visitas',
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
        title="Visitas — Caseta"
        description="Visitantes esperados en todo el fraccionamiento. Verifica la identidad y registra la entrada."
      />
      <VisitasContainer
        tenantId={tenant.id}
        isStaff
        visits={visits}
        preferred={preferred}
      />
    </div>
  )
}
