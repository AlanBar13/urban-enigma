import { useState, useRef } from 'react'
import { useToast } from '@/components/notifications'
import { useServerFn } from '@tanstack/react-start'
import { deleteDocumentFn, type Document } from '@/lib/documents'
import { Button } from '@/components/ui/button'
import { FormModal } from '@/components/modals'
import { FormField } from '@/components/forms'
import { Input } from '../ui/input'
import { logger } from '@/utils/logger'
import { DataTable } from '../shared'
import { useRouter } from '@tanstack/react-router'
import { FileText, Image, Trash2 } from 'lucide-react'

interface DocumentWithUrl extends Document {
  url: string | null
}

interface Props {
  tenantId: string
  tenantPath: string
  documents: DocumentWithUrl[]
}

export default function DocumentsContainer({ tenantId, tenantPath, documents }: Props) {
  const { addToast } = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const deleteDocument = useServerFn(deleteDocumentFn)

  const onSubmit = async () => {
    if (!formRef.current) return

    const formData = new FormData(formRef.current)
    const name = formData.get('name') as string
    const file = formData.get('file') as File
    const ownerOnly = formData.get('ownerOnly') === 'on'

    if (!name?.trim()) {
      addToast({
        type: 'error',
        description: 'El nombre del documento es requerido',
        duration: 5000,
      })
      return
    }

    if (!file || !file.size) {
      addToast({
        type: 'error',
        description: 'Debes seleccionar un archivo',
        duration: 5000,
      })
      return
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      addToast({
        type: 'error',
        description: 'Solo se permiten archivos PDF e imágenes (JPEG, PNG, GIF, WebP)',
        duration: 5000,
      })
      return
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      addToast({
        type: 'error',
        description: 'El archivo no debe exceder 5MB',
        duration: 5000,
      })
      return
    }

    setUploading(true)

    try {
      // Add tenantId to formData
      formData.append('tenantId', tenantId)
      formData.set('tenantPath', tenantPath)
      formData.set('ownerOnly', ownerOnly.toString())

      console.log('Uploading document with FormData:', {
        tenantId,
        name,
        fileName: file.name,
        fileSize: file.size,
        ownerOnly
      })

      const response = await fetch('/api/upload/document', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al subir el documento')
      }

      addToast({
        type: 'success',
        description: `Documento "${name}" subido correctamente`,
        duration: 5000,
      })

      // Refresh the page to show the new document
      router.invalidate()
      formRef.current.reset()
      setOpen(false)
    } catch (error: any) {
      logger('error', 'Error uploading document:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al subir el documento',
        duration: 10000,
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (documentId: string, s3Key: string, documentName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el documento "${documentName}"?`)) {
      return
    }

    try {
      await deleteDocument({
        data: {
          documentId,
          s3Key,
        },
      })

      addToast({
        type: 'success',
        description: `Documento "${documentName}" eliminado correctamente`,
        duration: 5000,
      })

      // Refresh the page
      router.invalidate()
    } catch (error: any) {
      logger('error', 'Error deleting document:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al eliminar el documento',
        duration: 10000,
      })
    }
  }

  const getVisibilityBadge = (ownerOnly: boolean | null) => {
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded ${ownerOnly ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
          }`}
      >
        {ownerOnly ? 'Solo Propietarios' : 'Todos los Residentes'}
      </span>
    )
  }

  const getFileTypeIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileText className="w-4 h-4" />
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4" />
    if (mimeType === 'application/pdf') return <FileText className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div>
      <Button className="mt-4" onClick={() => setOpen(true)}>
        Subir Documento
      </Button>

      <FormModal open={open} onOpenChange={setOpen} title="Subir Documento" onSubmit={onSubmit} isLoading={uploading}>
        <form ref={formRef}>
          <FormField label="Nombre del documento">
            <Input
              name="name"
              placeholder="Ej: Reglamento interno"
              required
            />
          </FormField>

          <FormField label="Archivo">
            <Input
              name="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Solo archivos PDF e imágenes. Máximo 5MB.
            </p>
          </FormField>

          <FormField label="">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ownerOnly"
                name="ownerOnly"
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="ownerOnly" className="text-sm text-gray-700">
                Solo para propietarios
              </label>
            </div>
          </FormField>
        </form>
      </FormModal>

      <div className="mt-6">
        <DataTable
          data={documents}
          columns={[
            {
              key: 'mime_type',
              label: '',
              render: (value: string | null) => getFileTypeIcon(value),
            },
            { key: 'name', label: 'Nombre' },
            {
              key: 'owner_only',
              label: 'Visibilidad',
              render: (value: boolean | null) => getVisibilityBadge(value),
            },
            {
              key: 'file_size',
              label: 'Tamaño',
              render: (value: number | null) => formatFileSize(value),
            },
            {
              key: 'created_at',
              label: 'Fecha de Subida',
              render: (value: string) =>
                new Date(value).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }),
            },
            {
              key: 'url',
              label: 'Acciones',
              render: (value: string | null, row: DocumentWithUrl) => (
                <div className="flex items-center gap-2">
                  {value && (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Ver
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(row.id, row.s3_key, row.name)}
                    className="text-red-600 hover:text-red-800"
                    title="Eliminar documento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ),
            },
          ]}
          striped
        />
      </div>
    </div>
  )
}
