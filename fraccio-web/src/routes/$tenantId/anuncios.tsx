import { createFileRoute } from '@tanstack/react-router'
import { getAnunciosFn } from '@/lib/anuncios'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/$tenantId/anuncios')({
  loader: async ({ context }) => {
    const announcements = await getAnunciosFn({ data: { tenantId: context.tenant.id } })
    return { announcements }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { announcements } = Route.useLoaderData()

  const getVisibilityBadge = (ownersOnly: boolean) => {
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded ${
          ownersOnly ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
        }`}
      >
        {ownersOnly ? 'Solo Propietarios' : 'Todos los Residentes'}
      </span>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Anuncios</h1>
        <p className="text-gray-600 mt-1">
          Mantente informado sobre las novedades del fraccionamiento
        </p>
      </div>

      {announcements.length === 0 ? (
        <Card className="p-8">
          <p className="text-gray-600 text-center">No hay anuncios disponibles</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="p-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-semibold">{announcement.title}</h2>
                  {getVisibilityBadge(announcement.owners_only)}
                </div>

                {announcement.description && (
                  <p className="text-gray-700">{announcement.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>
                    {new Date(announcement.created_at).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  <span>•</span>
                  <span>{announcement.interactions} interacciones</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
