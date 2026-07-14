import { useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Input } from '../ui/input'
import { DataTable } from '../shared'
import type { AnnouncementWithUrl } from '@/lib/anuncios'
import { useToast } from '@/components/notifications'
import { Button } from '@/components/ui/button'
import { FormModal } from '@/components/modals'
import { FormField } from '@/components/forms'
import { logger } from '@/utils/logger'

interface Props {
  tenantId: string
  tenantPath: string
  announcements: Array<AnnouncementWithUrl>
}

export default function AnunciosContainer({
  tenantId,
  tenantPath,
  announcements,
}: Props) {
  const { addToast } = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const onSubmit = async () => {
    if (!formRef.current) return

    const formData = new FormData(formRef.current)
    const title = (formData.get('title') as string).trim()
    const file = formData.get('file') as File
    const ownersOnly = formData.get('ownersOnly') === 'on'
    const sendWhatsapp = formData.get('sendWhatsapp') === 'on'

    if (title.length < 3) {
      addToast({
        type: 'error',
        description: 'El título debe tener al menos 3 caracteres',
        duration: 5000,
      })
      return
    }

    if (file.size) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
      ]
      if (!allowedTypes.includes(file.type)) {
        addToast({
          type: 'error',
          description:
            'Solo se permiten archivos PDF e imágenes (JPEG, PNG, GIF, WebP)',
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
    }

    setUploading(true)

    try {
      formData.append('tenantId', tenantId)
      formData.set('tenantPath', tenantPath)
      formData.set('ownersOnly', ownersOnly.toString())
      formData.set('sendWhatsapp', sendWhatsapp.toString())

      const response = await fetch('/api/upload/anuncio', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear el anuncio')
      }

      const result = await response.json()

      addToast({
        type: 'success',
        description: `Anuncio "${title}" creado correctamente`,
        duration: 5000,
      })

      if (result.whatsappError) {
        addToast({
          type: 'error',
          description:
            'El anuncio se guardó pero no se pudo enviar por WhatsApp',
          duration: 10000,
        })
      }

      // Refresh the page to show the new announcement
      router.invalidate()
      formRef.current.reset()
      setOpen(false)
    } catch (error: any) {
      logger('error', 'Error creating announcement:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al crear el anuncio',
        duration: 10000,
      })
    } finally {
      setUploading(false)
    }
  }

  const getVisibilityBadge = (ownersOnly: boolean) => {
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded ${
          ownersOnly
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-green-100 text-green-800'
        }`}
      >
        {ownersOnly ? 'Solo Propietarios' : 'Todos los Residentes'}
      </span>
    )
  }

  return (
    <div>
      <Button className="mt-4" onClick={() => setOpen(true)}>
        Crear Anuncio
      </Button>

      <FormModal
        open={open}
        onOpenChange={setOpen}
        title="Crear Anuncio"
        onSubmit={onSubmit}
        isLoading={uploading}
      >
        <form ref={formRef}>
          <FormField label="Título del anuncio">
            <Input
              name="title"
              placeholder="Ej: Mantenimiento del área común"
              required
            />
          </FormField>

          <FormField label="Descripción (opcional)">
            <Input
              name="description"
              placeholder="Ej: Se realizará mantenimiento este sábado de 8am a 12pm"
            />
          </FormField>

          <FormField label="Adjunto (opcional)">
            <Input
              name="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
            />
            <p className="text-xs text-gray-500 mt-1">
              Solo archivos PDF e imágenes. Máximo 5MB.
            </p>
          </FormField>

          <FormField label="">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ownersOnly"
                name="ownersOnly"
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="ownersOnly" className="text-sm text-gray-700">
                Solo para propietarios
              </label>
            </div>
          </FormField>

          <FormField label="Enviar por">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sendWhatsapp"
                name="sendWhatsapp"
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="sendWhatsapp" className="text-sm text-gray-700">
                WhatsApp
              </label>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                id="sendEmail"
                disabled
                className="w-4 h-4 bg-gray-100 border-gray-300 rounded"
              />
              <label htmlFor="sendEmail" className="text-sm text-gray-400">
                Email (próximamente)
              </label>
            </div>
          </FormField>
        </form>
      </FormModal>

      <div className="mt-6">
        <DataTable
          data={announcements}
          columns={[
            { key: 'title', label: 'Título' },
            {
              key: 'description',
              label: 'Descripción',
              render: (value: string | null) => value || '-',
            },
            {
              key: 'attachment_url',
              label: 'Adjunto',
              render: (value: string | null, row: AnnouncementWithUrl) => {
                if (!value) return '-'
                return (
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {row.attachment_mime_type?.startsWith('image/') ? (
                      <img
                        src={value}
                        alt={row.attachment_name ?? 'Adjunto'}
                        className="h-10 rounded"
                      />
                    ) : (
                      'Ver PDF'
                    )}
                  </a>
                )
              },
            },
            {
              key: 'owners_only',
              label: 'Visibilidad',
              render: (value: boolean) => getVisibilityBadge(value),
            },
            {
              key: 'interactions',
              label: 'Interacciones',
            },
            {
              key: 'created_at',
              label: 'Fecha de Creación',
              render: (value: string) =>
                new Date(value).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }),
            },
          ]}
          striped
        />
      </div>
    </div>
  )
}
