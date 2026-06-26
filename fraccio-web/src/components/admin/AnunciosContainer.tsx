import { useState } from 'react'
import { useToast } from '@/components/notifications'
import { useServerFn } from '@tanstack/react-start'
import { createAnuncioFn } from '@/lib/anuncios'
import { Button } from '@/components/ui/button'
import { FormModal } from '@/components/modals'
import { FormField } from '@/components/forms'
import { Input } from '../ui/input'
import { logger } from '@/utils/logger'
import { DataTable } from '../shared'
import { useRouter } from '@tanstack/react-router'

interface Announcement {
  id: number
  tenant_id: string
  title: string
  description: string | null
  owners_only: boolean
  interactions: number
  created_at: string
}

interface Props {
  tenantId: string
  announcements: Announcement[]
}

export default function AnunciosContainer({ tenantId, announcements }: Props) {
  const { addToast } = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ownersOnly, setOwnersOnly] = useState(false)
  const createAnuncio = useServerFn(createAnuncioFn)

  const onSubmit = async () => {
    if (!title.trim() || title.trim().length < 3) {
      addToast({
        type: 'error',
        description: 'El título debe tener al menos 3 caracteres',
        duration: 5000,
      })
      return
    }

    try {
      await createAnuncio({
        data: {
          tenantId,
          title: title.trim(),
          description: description.trim() || undefined,
          ownersOnly,
        },
      })

      addToast({
        type: 'success',
        description: `Anuncio "${title}" creado correctamente`,
        duration: 5000,
      })

      // Refresh the page to show the new announcement
      router.invalidate()
    } catch (error: any) {
      logger('error', 'Error creating announcement:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al crear el anuncio',
        duration: 10000,
      })
    } finally {
      setTitle('')
      setDescription('')
      setOwnersOnly(false)
      setOpen(false)
    }
  }

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
    <div>
      <Button className="mt-4" onClick={() => setOpen(true)}>
        Crear Anuncio
      </Button>

      <FormModal open={open} onOpenChange={setOpen} title="Crear Anuncio" onSubmit={onSubmit}>
        <FormField label="Título del anuncio">
          <Input
            placeholder="Ej: Mantenimiento del área común"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </FormField>

        <FormField label="Descripción (opcional)">
          <Input
            placeholder="Ej: Se realizará mantenimiento este sábado de 8am a 12pm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>

        <FormField label="">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ownersOnly"
              checked={ownersOnly}
              onChange={(e) => setOwnersOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="ownersOnly" className="text-sm text-gray-700">
              Solo para propietarios
            </label>
          </div>
        </FormField>
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
