import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useRouter } from '@tanstack/react-router'
import { Button } from '../ui/button'
import { ConfirmDialog, FormModal } from '../modals'
import { FormField } from '../forms'
import { Input } from '../ui/input'
import { DataTable } from '../shared'
import { useToast } from '../notifications'
import type { Database } from '@/database.types'
import { createHouseFn, deleteHouseFn } from '@/lib/houses'
import { logger } from '@/utils/logger'

interface Props {
  houses: Array<Database['public']['Tables']['houses']['Row']>
  tenantId: string
}

type House = Database['public']['Tables']['houses']['Row']

export default function CasasContainer({ houses, tenantId }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [pendingDelete, setPendingDelete] = useState<House | null>(null)
  const createHouse = useServerFn(createHouseFn)
  const deleteHouse = useServerFn(deleteHouseFn)
  const router = useRouter()
  const { addToast } = useToast()

  const onSubmit = async () => {
    try {
      await createHouse({
        data: {
          tenantId,
          name: name,
          address: address,
        },
      })
      addToast({
        type: 'success',
        description: 'Casa creada existosamente',
        duration: 5000,
      })
    } catch (error) {
      logger('error', 'Error creating house:', { error })
      addToast({
        type: 'error',
        description: 'Error al crear la casa',
        duration: 10000,
      })
    } finally {
      setName('')
      setAddress('')
      setOpen(false)
    }
  }

  const onConfirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteHouse({ data: { tenantId, houseId: pendingDelete.id } })
      addToast({
        type: 'success',
        description: `Casa "${pendingDelete.name}" eliminada correctamente`,
        duration: 5000,
      })
      router.invalidate()
    } catch (error: any) {
      logger('error', 'Error deleting house:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al eliminar la casa',
        duration: 10000,
      })
    }
  }

  return (
    <div>
      <Button className="mt-4" onClick={() => setOpen(true)}>
        Crear Casa
      </Button>
      <FormModal
        open={open}
        onOpenChange={setOpen}
        title="Crear Casa"
        onSubmit={() => onSubmit()}
      >
        <FormField label="Nombre">
          <Input
            placeholder="Nombre de la casa"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <FormField label="Dirección">
          <Input
            placeholder="Dirección de la casa"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </FormField>
      </FormModal>
      <div className="mt-6">
        <DataTable
          data={houses}
          columns={[
            { key: 'name', label: 'Nombre' },
            { key: 'address', label: 'Dirección' },
          ]}
          striped
          actions
          onDelete={setPendingDelete}
        />
      </div>
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Eliminar casa"
        description={`Se eliminará la casa "${pendingDelete?.name}" junto con sus habitantes e invitaciones pendientes. Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}
