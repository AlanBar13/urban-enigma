import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useRouter } from '@tanstack/react-router'
import { Input } from '../ui/input'
import { DataTable } from '../shared'
import type { Database } from '@/database.types'
import type { GetTenantUsersQueryResult } from '@/lib/profiles/queries'
import { useToast } from '@/components/notifications'
import { inviteUserFn, setUserActiveFn } from '@/lib/user'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, FormModal } from '@/components/modals'
import { FormField, Select } from '@/components/forms'
import { logger } from '@/utils/logger'

interface Props {
  tenantId: string
  houses: Array<Database['public']['Tables']['houses']['Row']>
  users: GetTenantUsersQueryResult
}

export default function UsersContainer({ tenantId, houses, users }: Props) {
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [houseId, setHouseId] = useState<number>(0)
  const [owner, setOwner] = useState<boolean>(false)
  const [role, setRole] = useState<'user' | 'guard'>('user')
  const [pendingToggle, setPendingToggle] = useState<
    GetTenantUsersQueryResult[number] | null
  >(null)
  const inviteUser = useServerFn(inviteUserFn)
  const setUserActive = useServerFn(setUserActiveFn)
  const router = useRouter()

  const isGuardInvite = role === 'guard'

  const onSubmit = async () => {
    try {
      await inviteUser({
        data: {
          email,
          name,
          tenantId,
          role,
          // Guards are staff — no house, no ownership.
          house_id: isGuardInvite ? undefined : houseId,
          house_owner: isGuardInvite ? false : owner,
        },
      })
      addToast({
        type: 'success',
        description: `Invitación enviada a ${email} correctamente`,
        duration: 5000,
      })
    } catch (error) {
      logger('error', 'Error inviting user:', { error })
      addToast({
        type: 'error',
        description: 'Error al invitar al usuario',
        duration: 10000,
      })
    } finally {
      setName('')
      setEmail('')
      setHouseId(0)
      setOwner(false)
      setRole('user')
      setOpen(false)
    }
  }

  const onConfirmToggle = async () => {
    if (!pendingToggle) return
    const activating = !pendingToggle.is_active
    try {
      await setUserActive({
        data: { tenantId, userId: pendingToggle.id, active: activating },
      })
      addToast({
        type: 'success',
        description: `Usuario ${activating ? 'reactivado' : 'desactivado'} correctamente`,
        duration: 5000,
      })
      router.invalidate()
    } catch (error: any) {
      logger('error', 'Error updating user active state:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al actualizar el usuario',
        duration: 10000,
      })
    }
  }

  return (
    <div>
      <Button className="mt-4" onClick={() => setOpen(true)}>
        Invitar usuario
      </Button>
      <FormModal
        open={open}
        onOpenChange={setOpen}
        title="Invitar Usuario"
        onSubmit={onSubmit}
      >
        <FormField label="Tipo de usuario">
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as 'user' | 'guard')}
          >
            <option value="user">Residente</option>
            <option value="guard">Vigilante</option>
          </Select>
        </FormField>
        <FormField label="Nombre del colono">
          <Input
            placeholder="Juan Perez"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <FormField label="Email del colono">
          <Input
            placeholder="juan@fraccio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>
        {!isGuardInvite && (
          <>
            <FormField label="Casa del colono">
              <Select
                value={houseId}
                onChange={(e) => setHouseId(Number(e.target.value))}
              >
                {houses.map((house) => (
                  <option key={house.id} value={house.id}>
                    {house.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Es dueño de la casa?">
              <input
                type="checkbox"
                id="house_owner"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={owner}
                onChange={(e) => setOwner(e.target.checked)}
              />
            </FormField>
          </>
        )}
      </FormModal>
      <div className="mt-6">
        <DataTable
          data={users}
          columns={[
            { key: 'full_name', label: 'Nombre' },
            { key: 'email', label: 'Email' },
            {
              key: 'house_users',
              label: 'Casa',
              render: (value: Array<any>) => {
                if (value.length === 0) return '-'
                return value[0]?.houses?.name || '-'
              },
            },
            { key: 'house_owner', label: 'Es dueño de la casa' },
            {
              key: 'is_active',
              label: 'Estado',
              render: (value: boolean) => (value ? 'Activo' : 'Desactivado'),
            },
          ]}
          striped
          actions
          onDelete={setPendingToggle}
        />
      </div>
      <ConfirmDialog
        open={!!pendingToggle}
        onOpenChange={(o) => !o && setPendingToggle(null)}
        title={
          pendingToggle?.is_active ? 'Desactivar usuario' : 'Reactivar usuario'
        }
        description={
          pendingToggle?.is_active
            ? `${pendingToggle.full_name || pendingToggle.email} no podrá iniciar sesión. Su historial y sus pagos se conservan.`
            : `${pendingToggle?.full_name || pendingToggle?.email} podrá volver a iniciar sesión.`
        }
        confirmText={pendingToggle?.is_active ? 'Desactivar' : 'Reactivar'}
        cancelText="Cancelar"
        variant={pendingToggle?.is_active ? 'destructive' : 'default'}
        onConfirm={onConfirmToggle}
      />
    </div>
  )
}
