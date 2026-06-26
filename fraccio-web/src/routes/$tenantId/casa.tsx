import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { getUserHouseFn, updateHouseFn, addHouseUserFn, removeHouseUserFn } from '@/lib/casa'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormModal } from '@/components/modals'
import { FormField } from '@/components/forms'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/notifications'
import { logger } from '@/utils/logger'
import { useRouter } from '@tanstack/react-router'
import { Home, Users, Edit, UserPlus, Trash2 } from 'lucide-react'

export const Route = createFileRoute('/$tenantId/casa')({
  loader: async ({ context }) => {
    const houseData = await getUserHouseFn({ data: { tenantId: context.tenant.id } })
    return { houseData }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { houseData } = Route.useLoaderData()
  const { tenant, user: ctxUser } = Route.useRouteContext()
  const { addToast } = useToast()
  const router = useRouter()

  // Edit house modal state
  const [editOpen, setEditOpen] = useState(false)
  const [houseName, setHouseName] = useState(houseData.house?.name || '')
  const [houseAddress, setHouseAddress] = useState(houseData.house?.address || '')
  const updateHouse = useServerFn(updateHouseFn)

  // Add user modal state
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const addHouseUser = useServerFn(addHouseUserFn)

  // Remove user
  const removeHouseUser = useServerFn(removeHouseUserFn)

  const onEditHouse = async () => {
    if (!houseData.house) return

    if (!houseName.trim() || !houseAddress.trim()) {
      addToast({
        type: 'error',
        description: 'Nombre y dirección son requeridos',
        duration: 5000,
      })
      return
    }

    try {
      await updateHouse({
        data: {
          houseId: houseData.house.id,
          name: houseName.trim(),
          address: houseAddress.trim(),
        },
      })

      addToast({
        type: 'success',
        description: 'Casa actualizada correctamente',
        duration: 5000,
      })

      router.invalidate()
      setEditOpen(false)
    } catch (error: any) {
      logger('error', 'Error updating house:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al actualizar la casa',
        duration: 10000,
      })
    }
  }

  const onAddUser = async () => {
    if (!houseData.house) return

    if (!newUserEmail.trim() || !newUserName.trim()) {
      addToast({
        type: 'error',
        description: 'Email y nombre son requeridos',
        duration: 5000,
      })
      return
    }

    try {
      await addHouseUser({
        data: {
          houseId: houseData.house.id,
          email: newUserEmail.trim(),
          name: newUserName.trim(),
        },
      })

      addToast({
        type: 'success',
        description: `Invitación enviada a ${newUserEmail}`,
        duration: 5000,
      })

      router.invalidate()
      setNewUserEmail('')
      setNewUserName('')
      setAddUserOpen(false)
    } catch (error: any) {
      logger('error', 'Error adding user:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al agregar usuario',
        duration: 10000,
      })
    }
  }

  const onRemoveUser = async (userId: string, userName: string) => {
    if (!houseData.house) return

    if (!confirm(`¿Estás seguro de remover a ${userName} de la casa?`)) {
      return
    }

    try {
      await removeHouseUser({
        data: {
          houseId: houseData.house.id,
          userId,
        },
      })

      addToast({
        type: 'success',
        description: `${userName} removido de la casa`,
        duration: 5000,
      })

      router.invalidate()
    } catch (error: any) {
      logger('error', 'Error removing user:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al remover usuario',
        duration: 10000,
      })
    }
  }

  // No house assigned
  if (!houseData.house) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Mi Casa</h1>
        </div>

        <Card className="p-8 text-center">
          <Home className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No tienes una casa asignada</h2>
          <p className="text-muted-foreground">
            Contacta al administrador del fraccionamiento para que te asigne a una casa.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Mi Casa</h1>
      </div>

      {/* House Information Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Home className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{houseData.house.name}</h2>
              <p className="text-muted-foreground">{houseData.house.address}</p>
            </div>
          </div>
          {houseData.isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setHouseName(houseData.house!.name)
                setHouseAddress(houseData.house!.address)
                setEditOpen(true)
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Fraccionamiento</p>
            <p className="font-medium">{tenant.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Capacidad</p>
            <p className="font-medium">{houseData.house.max_habitants} habitantes</p>
          </div>
        </div>
      </Card>

      {/* House Users Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Usuarios de la Casa</h3>
              <p className="text-sm text-muted-foreground">
                {houseData.users.length} de 5 usuarios
              </p>
            </div>
          </div>
          {houseData.isOwner && houseData.users.length < 5 && (
            <Button size="sm" onClick={() => setAddUserOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar Usuario
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {houseData.users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{user.full_name || 'Sin nombre'}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    user.role === 'admin'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {user.role === 'admin' ? 'Administrador' : 'Residente'}
                </span>
                {houseData.isOwner && user.id !== ctxUser.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveUser(user.id, user.full_name || user.email)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {houseData.users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No hay usuarios registrados en esta casa
            </div>
          )}
        </div>
      </Card>

      {/* Edit House Modal */}
      <FormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Editar Casa"
        onSubmit={onEditHouse}
      >
        <FormField label="Nombre de la casa">
          <Input
            placeholder="Ej: Casa 123"
            value={houseName}
            onChange={(e) => setHouseName(e.target.value)}
            disabled
            required
          />
        </FormField>

        <FormField label="Dirección">
          <Input
            placeholder="Ej: Calle Principal 123"
            value={houseAddress}
            onChange={(e) => setHouseAddress(e.target.value)}
            required
          />
        </FormField>
      </FormModal>

      {/* Add User Modal */}
      <FormModal
        open={addUserOpen}
        onOpenChange={setAddUserOpen}
        title="Agregar Usuario a la Casa"
        onSubmit={onAddUser}
      >
        <FormField label="Nombre completo">
          <Input
            placeholder="Ej: Juan Pérez"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            required
          />
        </FormField>

        <FormField label="Email">
          <Input
            type="email"
            placeholder="Ej: juan@ejemplo.com"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            required
          />
        </FormField>

        <p className="text-sm text-muted-foreground">
          Se enviará una invitación al usuario para que se una a tu casa. La invitación expirará
          en 7 días.
        </p>
      </FormModal>
    </div>
  )
}
