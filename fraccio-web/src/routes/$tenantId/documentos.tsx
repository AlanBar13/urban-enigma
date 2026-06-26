import { createFileRoute } from '@tanstack/react-router'
import { getDocumentsFn } from '@/lib/documents'
import { Card } from '@/components/ui/card'
import { FileText, Image, Download } from 'lucide-react'

export const Route = createFileRoute('/$tenantId/documentos')({
  loader: async ({ context }) => {
    const documents = await getDocumentsFn({ data: { tenantId: context.tenant.id, user: context.user } })
    return { documents }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { documents } = Route.useLoaderData()

  const getVisibilityBadge = (ownerOnly: boolean | null) => {
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded ${
          ownerOnly ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
        }`}
      >
        {ownerOnly ? 'Solo Propietarios' : 'Todos los Residentes'}
      </span>
    )
  }

  const getFileTypeIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileText className="w-5 h-5 text-gray-400" />
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />
    if (mimeType === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />
    return <FileText className="w-5 h-5 text-gray-400" />
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Documentos</h1>
        <p className="text-gray-600 mt-1">
          Accede a los documentos y archivos del fraccionamiento
        </p>
      </div>

      {documents.length === 0 ? (
        <Card className="p-8">
          <p className="text-gray-600 text-center">No hay documentos disponibles</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <Card key={document.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  {getFileTypeIcon(document.mime_type)}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{document.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getVisibilityBadge(document.owner_only)}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-500 space-y-1">
                  <p>Tamaño: {formatFileSize(document.file_size)}</p>
                  <p>
                    Subido: {new Date(document.created_at).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                {document.url && (
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Ver / Descargar
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
