import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAdminDocumentsFn } from '@/lib/documents'
import DocumentsContainer from '@/components/admin/DocumentsContainer'

export const Route = createFileRoute('/$tenantId/admin-documentos')({
  beforeLoad: ({ context }) => {
    // Check if user is admin or superadmin
    if (context.user.role !== 'admin' && context.user.role !== 'superadmin') {
      throw redirect({ to: `/$tenantId/documentos`, params: { tenantId: context.tenant.path } })
    }
  },
  loader: async ({ context }) => {
    const documents = await getAdminDocumentsFn({ data: { tenantId: context.tenant.id, user: context.user } })
    return { documents }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { tenant } = Route.useRouteContext()
  const { documents } = Route.useLoaderData()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Administrar Documentos</h1>
        <p className="text-gray-600 mt-1">
          Gestiona los documentos del fraccionamiento y controla su visibilidad
        </p>
      </div>

      <div>
        <DocumentsContainer tenantId={tenant.id} tenantPath={tenant.path} documents={documents} />
      </div>
    </div>
  )
}
