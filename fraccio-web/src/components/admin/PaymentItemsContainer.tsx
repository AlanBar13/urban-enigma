import { useState } from 'react'
import { useToast } from '@/components/notifications'
import { useServerFn } from '@tanstack/react-start'
import { createPaymentItemFn } from '@/lib/stripe'
import { Button } from '@/components/ui/button'
import { FormModal } from '@/components/modals'
import { FormField, Select } from '@/components/forms'
import { Input } from '../ui/input'
import { logger } from '@/utils/logger'
import { DataTable } from '../shared'
import { useRouter } from '@tanstack/react-router'

interface PaymentItem {
  id: number
  tenant_id: string
  name: string
  description: string | null
  amount: number
  currency: string
  payment_type: string
  is_active: boolean
  created_at: string
}

interface Props {
  tenantId: string
  items: PaymentItem[]
}

export default function PaymentItemsContainer({ tenantId, items }: Props) {
  const { addToast } = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentType, setPaymentType] = useState<'maintenance' | 'assessment' | 'fine'>('maintenance')
  const createPaymentItem = useServerFn(createPaymentItemFn)

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

    try {
      await createPaymentItem({
        data: {
          tenantId,
          name,
          description: description.trim() || undefined,
          amount: amountNum,
          paymentType,
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
      setOpen(false)
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

      <FormModal open={open} onOpenChange={setOpen} title="Crear Concepto de Pago" onSubmit={onSubmit}>
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
            onChange={(e) => setPaymentType(e.target.value as 'maintenance' | 'assessment' | 'fine')}
          >
            <option value="maintenance">Mantenimiento</option>
            <option value="assessment">Cuota Especial</option>
            <option value="fine">Multa</option>
          </Select>
        </FormField>
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
        />
      </div>
    </div>
  )
}
