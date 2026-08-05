import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useRouter } from '@tanstack/react-router'
import { Input } from '../ui/input'
import { DataTable } from '../shared'
import { useToast } from '@/components/notifications'
import {
  createPaymentItemFn,
  setPaymentItemActiveFn,
  setPaymentItemAssigneesFn,
} from '@/lib/stripe'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, FormModal } from '@/components/modals'
import { CheckboxGroup, FormField, Select } from '@/components/forms'
import { logger } from '@/utils/logger'

interface PaymentItem {
  id: number
  tenant_id: string
  name: string
  description: string | null
  amount: number
  currency: string
  payment_type: string
  is_active: boolean
  /** null = visible to the whole tenant; otherwise only these profile ids */
  assigned_user_ids: Array<string> | null
  created_at: string
}

interface TenantUser {
  id: string
  full_name: string | null
  is_active: boolean | null
}

interface Props {
  tenantId: string
  items: Array<PaymentItem>
  users: Array<TenantUser>
}

export default function PaymentItemsContainer({
  tenantId,
  items,
  users,
}: Props) {
  const { addToast } = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentType, setPaymentType] = useState<
    'maintenance' | 'assessment' | 'fine'
  >('maintenance')
  const [scope, setScope] = useState<'all' | 'specific'>('all')
  const [assignedIds, setAssignedIds] = useState<Array<string>>([])
  const [pendingToggle, setPendingToggle] = useState<PaymentItem | null>(null)
  const [editing, setEditing] = useState<PaymentItem | null>(null)
  const [editingIds, setEditingIds] = useState<Array<string>>([])
  const createPaymentItem = useServerFn(createPaymentItemFn)
  const setPaymentItemActive = useServerFn(setPaymentItemActiveFn)
  const setPaymentItemAssignees = useServerFn(setPaymentItemAssigneesFn)

  // Deactivated users can't log in, so offering them as targets is a dead end
  const selectableUsers = users.filter((u) => u.is_active !== false)
  const userOptions = selectableUsers.map((u) => ({
    label: u.full_name || u.id,
    value: u.id,
  }))
  const namesById = new Map(
    users.map((u) => [u.id, u.full_name || 'Usuario sin nombre']),
  )

  const onSubmit = async () => {
    if (!name.trim()) {
      addToast({
        type: 'error',
        description: 'El nombre es requerido',
        duration: 5000,
      })
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      addToast({
        type: 'error',
        description: 'El monto debe ser un número positivo',
        duration: 5000,
      })
      return
    }

    // Falling back to "todos" here would silently bill the whole fraccionamiento
    if (scope === 'specific' && assignedIds.length === 0) {
      addToast({
        type: 'error',
        description: 'Selecciona al menos un usuario',
        duration: 5000,
      })
      return
    }

    try {
      await createPaymentItem({
        data: {
          tenantId,
          name,
          description: description.trim() || undefined,
          amount: amountNum,
          paymentType,
          assignedUserIds: scope === 'specific' ? assignedIds : undefined,
        },
      })

      addToast({
        type: 'success',
        description: `Concepto de pago "${name}" creado correctamente`,
        duration: 5000,
      })

      // Refresh the page to show the new item
      router.invalidate()
    } catch (error: any) {
      logger('error', 'Error creating payment item:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al crear el concepto de pago',
        duration: 10000,
      })
    } finally {
      setName('')
      setDescription('')
      setAmount('')
      setPaymentType('maintenance')
      setScope('all')
      setAssignedIds([])
      setOpen(false)
    }
  }

  const onSaveAssignees = async () => {
    if (!editing) return
    try {
      await setPaymentItemAssignees({
        data: { tenantId, itemId: editing.id, assignedUserIds: editingIds },
      })
      addToast({
        type: 'success',
        description: `Visibilidad de "${editing.name}" actualizada`,
        duration: 5000,
      })
      router.invalidate()
    } catch (error: any) {
      logger('error', 'Error updating payment item assignees:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al actualizar la visibilidad',
        duration: 10000,
      })
    } finally {
      setEditing(null)
    }
  }

  const onConfirmToggle = async () => {
    if (!pendingToggle) return
    const activating = !pendingToggle.is_active
    try {
      await setPaymentItemActive({
        data: { tenantId, itemId: pendingToggle.id, active: activating },
      })
      addToast({
        type: 'success',
        description: `Concepto "${pendingToggle.name}" ${activating ? 'activado' : 'desactivado'} correctamente`,
        duration: 5000,
      })
      router.invalidate()
    } catch (error: any) {
      logger('error', 'Error updating payment item state:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al actualizar el concepto de pago',
        duration: 10000,
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount)
  }

  const getPaymentTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      maintenance: 'Mantenimiento',
      assessment: 'Cuota Especial',
      fine: 'Multa',
    }
    return typeMap[type] || type
  }

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded ${
          isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}
      >
        {isActive ? 'Activo' : 'Inactivo'}
      </span>
    )
  }

  return (
    <div>
      <Button className="mt-4" onClick={() => setOpen(true)}>
        Crear Concepto de Pago
      </Button>

      <FormModal
        open={open}
        onOpenChange={setOpen}
        title="Crear Concepto de Pago"
        onSubmit={onSubmit}
      >
        <FormField label="Nombre del concepto">
          <Input
            placeholder="Ej: Cuota Mensual Febrero 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </FormField>

        <FormField label="Descripción (opcional)">
          <Input
            placeholder="Ej: Pago de mantenimiento del mes de febrero"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>

        <FormField label="Monto (MXN)">
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Ej: 1500.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </FormField>

        <FormField label="Tipo de pago">
          <Select
            value={paymentType}
            onChange={(e) =>
              setPaymentType(
                e.target.value as 'maintenance' | 'assessment' | 'fine',
              )
            }
          >
            <option value="maintenance">Mantenimiento</option>
            <option value="assessment">Cuota Especial</option>
            <option value="fine">Multa</option>
          </Select>
        </FormField>

        <FormField label="¿Quién puede ver y pagar este concepto?">
          <Select
            value={scope}
            onChange={(e) => setScope(e.target.value as 'all' | 'specific')}
          >
            <option value="all">Todos los residentes</option>
            <option value="specific">Solo usuarios seleccionados</option>
          </Select>
        </FormField>

        {scope === 'specific' && (
          <div className="max-h-64 overflow-y-auto rounded border p-3">
            <CheckboxGroup
              options={userOptions}
              value={assignedIds}
              onChange={setAssignedIds}
            />
          </div>
        )}
      </FormModal>

      <FormModal
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={`Visibilidad de "${editing?.name ?? ''}"`}
        description="Sin usuarios seleccionados, el concepto es visible para todos los residentes."
        onSubmit={onSaveAssignees}
      >
        <div className="max-h-64 overflow-y-auto rounded border p-3">
          <CheckboxGroup
            options={userOptions}
            value={editingIds}
            onChange={setEditingIds}
          />
        </div>
      </FormModal>

      <div className="mt-6">
        <DataTable
          data={items}
          columns={[
            { key: 'name', label: 'Nombre' },
            {
              key: 'description',
              label: 'Descripción',
              render: (value: string | null) => value || '-',
            },
            {
              key: 'payment_type',
              label: 'Tipo',
              render: (value: string) => getPaymentTypeLabel(value),
            },
            {
              key: 'amount',
              label: 'Monto',
              render: (value: number) => formatCurrency(value),
            },
            {
              key: 'assigned_user_ids',
              label: 'Visible para',
              render: (value: Array<string> | null) => {
                if (!value || value.length === 0) return 'Todos'
                if (value.length <= 3)
                  return value.map((id) => namesById.get(id) || id).join(', ')
                return `${value.length} usuarios`
              },
            },
            {
              key: 'is_active',
              label: 'Estado',
              render: (value: boolean) => getStatusBadge(value),
            },
            {
              key: 'created_at',
              label: 'Fecha de creación',
              render: (value: string) =>
                new Date(value).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }),
            },
          ]}
          striped
          actions
          onEdit={(item: PaymentItem) => {
            setEditingIds(item.assigned_user_ids ?? [])
            setEditing(item)
          }}
          onDelete={setPendingToggle}
        />
      </div>
      <ConfirmDialog
        open={!!pendingToggle}
        onOpenChange={(o) => !o && setPendingToggle(null)}
        title={
          pendingToggle?.is_active
            ? 'Desactivar concepto de pago'
            : 'Activar concepto de pago'
        }
        description={
          pendingToggle?.is_active
            ? `"${pendingToggle.name}" dejará de aparecer para los residentes. Los pagos ya realizados no se modifican.`
            : `"${pendingToggle?.name}" volverá a aparecer para los residentes.`
        }
        confirmText={pendingToggle?.is_active ? 'Desactivar' : 'Activar'}
        cancelText="Cancelar"
        variant={pendingToggle?.is_active ? 'destructive' : 'default'}
        onConfirm={onConfirmToggle}
      />
    </div>
  )
}
