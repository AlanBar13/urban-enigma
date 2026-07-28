import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { CheckboxGroup } from '../forms'
import { FormModal } from '../modals'
import { useToast } from '../notifications'
import { Button } from '../ui/button'
import type { Database } from '@/database.types'
import type { AdminUser } from '@/lib/admin-users'
import { setTenantAdminsFn } from '@/lib/admin-users'
import { logger } from '@/utils/logger'

interface Props {
  user: AdminUser
  tenants: Array<Database['public']['Tables']['tenants']['Row']>
}

/** Grants a tenant admin access to fraccionamientos beyond their home one. */
export default function SAUserTenantsModal({ user, tenants }: Props) {
  const { addToast } = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(user.extra_tenants.map((t) => t.id))
  const setTenantAdmins = useServerFn(setTenantAdminsFn)

  const onSubmit = async () => {
    try {
      await setTenantAdmins({
        data: { userId: user.id, tenantIds: selected },
      })
      addToast({
        type: 'success',
        description: `Fraccionamientos actualizados para ${user.full_name}`,
        duration: 5000,
      })
      await router.invalidate()
    } catch (error) {
      logger('error', 'Error setting tenant admins:', { error })
      addToast({
        type: 'error',
        description: 'Error al actualizar los fraccionamientos',
        duration: 10000,
      })
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Gestionar
      </Button>
      <FormModal
        open={open}
        onOpenChange={setOpen}
        title={`Fraccionamientos de ${user.full_name}`}
        description="El fraccionamiento principal siempre está incluido."
        onSubmit={onSubmit}
        submitText="Guardar"
        cancelText="Cancelar"
      >
        <CheckboxGroup
          label="Fraccionamientos adicionales"
          value={selected}
          onChange={setSelected}
          options={tenants
            .filter((t) => t.id !== user.tenant_id)
            .map((t) => ({ label: t.name, value: t.id }))}
        />
      </FormModal>
    </>
  )
}
