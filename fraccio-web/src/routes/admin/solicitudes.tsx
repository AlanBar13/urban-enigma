import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { Mail } from 'lucide-react'
import { DataTable } from '@/components/shared'
import { ConfirmDialog } from '@/components/modals'
import { useToast } from '@/components/notifications'
import { deleteContactRequestFn, getContactRequestsFn } from '@/lib/contact'
import { logger } from '@/utils/logger'

export const Route = createFileRoute('/admin/solicitudes')({
  loader: async () => {
    const requests = await getContactRequestsFn()
    return { requests }
  },
  component: RouteComponent,
})

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

type ContactRequest = (typeof Route)['types']['loaderData']['requests'][number]

function RouteComponent() {
  const { requests } = Route.useLoaderData()
  const { addToast } = useToast()
  const router = useRouter()
  const deleteContactRequest = useServerFn(deleteContactRequestFn)
  const [pendingDelete, setPendingDelete] = useState<ContactRequest | null>(
    null,
  )

  const onConfirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteContactRequest({ data: { id: pendingDelete.id } })
      addToast({
        type: 'success',
        description: 'Solicitud eliminada correctamente',
        duration: 5000,
      })
      router.invalidate()
    } catch (error: any) {
      logger('error', 'Error deleting contact request:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al eliminar la solicitud',
        duration: 10000,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Solicitudes de Información
          </h1>
          <p className="text-muted-foreground">
            {requests.length} solicitud{requests.length === 1 ? '' : 'es'}{' '}
            pendiente{requests.length === 1 ? '' : 's'} de atender
          </p>
        </div>
        <div className="h-12 w-12 rounded-lg bg-chart-3/10 text-chart-3 flex items-center justify-center">
          <Mail className="h-6 w-6" />
        </div>
      </div>

      {requests.length > 0 ? (
        <DataTable
          columns={[
            { key: 'name', label: 'Nombre', sortable: false },
            {
              key: 'email',
              label: 'Email',
              render: (value: string) => (
                <a className="hover:underline" href={`mailto:${value}`}>
                  {value}
                </a>
              ),
            },
            {
              key: 'phone',
              label: 'Teléfono',
              render: (value: string | null) =>
                value ? (
                  <a className="hover:underline" href={`tel:${value}`}>
                    {value}
                  </a>
                ) : (
                  '—'
                ),
            },
            { key: 'fraccionamiento', label: 'Fraccionamiento' },
            {
              key: 'created_at',
              label: 'Recibida',
              render: (value: string) => formatDate(value),
            },
          ]}
          data={requests}
          actions
          onDelete={setPendingDelete}
        />
      ) : (
        <div className="bg-card border rounded-xl text-center py-12 text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No hay solicitudes pendientes</p>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Eliminar solicitud"
        description={`Se eliminará la solicitud de ${pendingDelete?.name}. Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}
