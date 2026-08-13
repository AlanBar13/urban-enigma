import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useRouter } from '@tanstack/react-router'
import { Input } from '../ui/input'
import { DataTable } from '../shared'
import type { PreferredVisitorRow, VisitRow } from '@/lib/visitas/queries'
import { useToast } from '@/components/notifications'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, FormModal } from '@/components/modals'
import { FormField, Select } from '@/components/forms'
import {
  cancelVisitFn,
  checkInPreferredFn,
  checkInVisitFn,
  createPreferredVisitorFn,
  createVisitFn,
  deletePreferredVisitorFn,
} from '@/lib/visitas/functions'
import { logger } from '@/utils/logger'

interface Props {
  tenantId: string
  /** Guards and admins see every house and register arrivals at the gate. */
  isStaff: boolean
  visits: Array<VisitRow>
  preferred: Array<PreferredVisitorRow>
}

/** What the check-in modal is about to record an arrival for. */
interface CheckInTarget {
  kind: 'visit' | 'preferred'
  id: string
  name: string
  plate: string | null
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

/** `datetime-local` gives a local wall-clock string; the API wants UTC ISO. */
const toIso = (localValue: string) => new Date(localValue).toISOString()

/**
 * The `YYYY-MM-DD` an instant falls on *in the viewer's timezone* — comparing
 * the raw ISO string would put an 8pm visit on the next UTC day.
 */
const localDay = (value: string | Date) => {
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function VisitasContainer({
  tenantId,
  isStaff,
  visits,
  preferred,
}: Props) {
  const { addToast } = useToast()
  const router = useRouter()

  const [visitOpen, setVisitOpen] = useState(false)
  const [visitorName, setVisitorName] = useState('')
  const [preferredId, setPreferredId] = useState('')
  const [expectedAt, setExpectedAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const [preferredOpen, setPreferredOpen] = useState(false)
  const [preferredName, setPreferredName] = useState('')
  const [preferredPlate, setPreferredPlate] = useState('')

  const [checkIn, setCheckIn] = useState<CheckInTarget | null>(null)
  const [plate, setPlate] = useState('')
  const [idVerified, setIdVerified] = useState(true)

  const [cancelling, setCancelling] = useState<VisitRow | null>(null)
  const [removing, setRemoving] = useState<PreferredVisitorRow | null>(null)

  // The gate cares about today; residents see their whole list.
  const [day, setDay] = useState(isStaff ? localDay(new Date()) : '')
  const shownVisits = day
    ? visits.filter((v) => localDay(v.expected_at) === day)
    : visits

  const createVisit = useServerFn(createVisitFn)
  const cancelVisit = useServerFn(cancelVisitFn)
  const checkInVisit = useServerFn(checkInVisitFn)
  const createPreferred = useServerFn(createPreferredVisitorFn)
  const deletePreferred = useServerFn(deletePreferredVisitorFn)
  const checkInPreferred = useServerFn(checkInPreferredFn)

  const fail = (error: any, fallback: string) => {
    logger('error', fallback, { error })
    addToast({
      type: 'error',
      description: error?.message || fallback,
      duration: 10000,
    })
  }

  const done = (description: string) => {
    addToast({ type: 'success', description, duration: 5000 })
    router.invalidate()
  }

  const onCreateVisit = async () => {
    const name =
      preferred.find((p) => p.id === preferredId)?.name ?? visitorName.trim()

    if (!name) {
      addToast({
        type: 'error',
        description: 'El nombre del visitante es requerido',
        duration: 5000,
      })
      return
    }
    if (!expectedAt) {
      addToast({
        type: 'error',
        description: 'La hora de llegada es requerida',
        duration: 5000,
      })
      return
    }
    if (expiresAt && expiresAt <= expectedAt) {
      addToast({
        type: 'error',
        description: 'La hora de fin debe ser posterior a la de llegada',
        duration: 5000,
      })
      return
    }

    try {
      await createVisit({
        data: {
          tenantId,
          visitorName: name,
          expectedAt: toIso(expectedAt),
          ...(expiresAt ? { expiresAt: toIso(expiresAt) } : {}),
          ...(preferredId ? { preferredVisitorId: preferredId } : {}),
        },
      })
      done(`Visita de "${name}" registrada`)
    } catch (error: any) {
      fail(error, 'Error al registrar la visita')
    } finally {
      setVisitorName('')
      setPreferredId('')
      setExpectedAt('')
      setExpiresAt('')
      setVisitOpen(false)
    }
  }

  const onCreatePreferred = async () => {
    if (!preferredName.trim()) {
      addToast({
        type: 'error',
        description: 'El nombre es requerido',
        duration: 5000,
      })
      return
    }
    try {
      await createPreferred({
        data: {
          tenantId,
          name: preferredName.trim(),
          ...(preferredPlate.trim() ? { plate: preferredPlate.trim() } : {}),
        },
      })
      done(`"${preferredName.trim()}" agregado a visitantes frecuentes`)
    } catch (error: any) {
      fail(error, 'Error al agregar el visitante frecuente')
    } finally {
      setPreferredName('')
      setPreferredPlate('')
      setPreferredOpen(false)
    }
  }

  const onCheckIn = async () => {
    if (!checkIn) return
    try {
      const payload = {
        idVerified,
        ...(plate.trim() ? { plate: plate.trim() } : {}),
      }
      if (checkIn.kind === 'visit') {
        await checkInVisit({ data: { visitId: checkIn.id, ...payload } })
      } else {
        await checkInPreferred({
          data: { preferredVisitorId: checkIn.id, ...payload },
        })
      }
      done(`Entrada de "${checkIn.name}" registrada`)
    } catch (error: any) {
      fail(error, 'Error al registrar la entrada')
    } finally {
      setCheckIn(null)
      setPlate('')
      setIdVerified(true)
    }
  }

  const onCancelVisit = async () => {
    if (!cancelling) return
    try {
      await cancelVisit({ data: { visitId: cancelling.id } })
      done(`Visita de "${cancelling.visitor_name}" cancelada`)
    } catch (error: any) {
      fail(error, 'Error al cancelar la visita')
    }
  }

  const onRemovePreferred = async () => {
    if (!removing) return
    try {
      await deletePreferred({ data: { preferredVisitorId: removing.id } })
      done(`"${removing.name}" eliminado de visitantes frecuentes`)
    } catch (error: any) {
      fail(error, 'Error al eliminar el visitante frecuente')
    }
  }

  const openCheckIn = (target: CheckInTarget) => {
    setPlate(target.plate ?? '')
    setIdVerified(true)
    setCheckIn(target)
  }

  const statusBadge = (visit: VisitRow) => {
    const expired =
      !visit.checked_in_at &&
      !!visit.expires_at &&
      new Date(visit.expires_at) < new Date()
    const [label, classes] = visit.checked_in_at
      ? ['Entró', 'bg-green-100 text-green-800']
      : expired
        ? ['Expirada', 'bg-gray-100 text-gray-800']
        : ['Pendiente', 'bg-amber-100 text-amber-800']

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${classes}`}>
        {label}
      </span>
    )
  }

  const houseColumn = {
    key: 'house_id' as const,
    label: 'Casa',
    render: (_: unknown, row: { houses: { name: string } | null }) =>
      row.houses?.name ?? '-',
  }

  const visitColumns = [
    { key: 'visitor_name' as const, label: 'Visitante' },
    ...(isStaff ? [houseColumn] : []),
    {
      key: 'expected_at' as const,
      label: 'Llegada',
      render: (value: string) => formatDateTime(value),
    },
    {
      key: 'expires_at' as const,
      label: 'Hasta',
      render: (value: string | null) => (value ? formatDateTime(value) : '-'),
    },
    {
      key: 'plate' as const,
      label: 'Placa',
      render: (value: string | null) => value || '-',
    },
    {
      key: 'id_verified' as const,
      label: 'Identidad',
      render: (value: boolean, row: VisitRow) =>
        row.checked_in_at ? (value ? 'Verificada' : 'Sin verificar') : '-',
    },
    {
      key: 'checked_in_at' as const,
      label: 'Estado',
      render: (_: unknown, row: VisitRow) => statusBadge(row),
    },
    ...(isStaff
      ? [
          {
            key: 'id' as const,
            label: '',
            render: (_: unknown, row: VisitRow) =>
              row.checked_in_at ? null : (
                <Button
                  size="sm"
                  onClick={() =>
                    openCheckIn({
                      kind: 'visit',
                      id: row.id,
                      name: row.visitor_name,
                      plate: row.plate,
                    })
                  }
                >
                  Registrar entrada
                </Button>
              ),
          },
        ]
      : []),
  ]

  const preferredColumns = [
    { key: 'name' as const, label: 'Visitante' },
    ...(isStaff ? [houseColumn] : []),
    {
      key: 'plate' as const,
      label: 'Placa',
      render: (value: string | null) => value || '-',
    },
    ...(isStaff
      ? [
          {
            key: 'id' as const,
            label: '',
            render: (_: unknown, row: PreferredVisitorRow) => (
              <Button
                size="sm"
                onClick={() =>
                  openCheckIn({
                    kind: 'preferred',
                    id: row.id,
                    name: row.name,
                    plate: row.plate,
                  })
                }
              >
                Registrar entrada
              </Button>
            ),
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-10">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {isStaff ? 'Visitas registradas' : 'Mis visitas'}
          </h2>
          {isStaff ? (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                aria-label="Filtrar por día"
                className="w-auto"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDay(localDay(new Date()))}
              >
                Hoy
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDay('')}>
                Todas
              </Button>
            </div>
          ) : (
            <Button onClick={() => setVisitOpen(true)}>Registrar visita</Button>
          )}
        </div>
        <div className="mt-4">
          <DataTable
            data={shownVisits}
            columns={visitColumns}
            striped
            {...(isStaff
              ? {}
              : {
                  actions: true,
                  onDelete: (row: VisitRow) => setCancelling(row),
                })}
          />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Visitantes frecuentes</h2>
          {!isStaff && (
            <Button variant="outline" onClick={() => setPreferredOpen(true)}>
              Agregar visitante frecuente
            </Button>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Personas de confianza que pueden entrar sin registrar una visita
          nueva.
        </p>
        <div className="mt-4">
          <DataTable
            data={preferred}
            columns={preferredColumns}
            striped
            {...(isStaff
              ? {}
              : {
                  actions: true,
                  onDelete: (row: PreferredVisitorRow) => setRemoving(row),
                })}
          />
        </div>
      </section>

      <FormModal
        open={visitOpen}
        onOpenChange={setVisitOpen}
        title="Registrar visita"
        submitText="Registrar"
        cancelText="Cancelar"
        onSubmit={onCreateVisit}
      >
        {preferred.length > 0 && (
          <FormField label="Visitante frecuente (opcional)">
            <Select
              value={preferredId}
              onChange={(e) => setPreferredId(e.target.value)}
            >
              <option value="">Otro visitante</option>
              {preferred.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        {!preferredId && (
          <FormField label="Nombre del visitante">
            <Input
              placeholder="Ej: Juan Pérez"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              required
            />
          </FormField>
        )}

        <FormField label="Hora de llegada">
          <Input
            type="datetime-local"
            value={expectedAt}
            onChange={(e) => setExpectedAt(e.target.value)}
            required
          />
        </FormField>

        <FormField label="Hora de fin (opcional)">
          <Input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </FormField>
      </FormModal>

      <FormModal
        open={preferredOpen}
        onOpenChange={setPreferredOpen}
        title="Agregar visitante frecuente"
        description="Podrá entrar sin que registres una visita cada vez."
        submitText="Agregar"
        cancelText="Cancelar"
        onSubmit={onCreatePreferred}
      >
        <FormField label="Nombre">
          <Input
            placeholder="Ej: María López"
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Placa del auto (opcional)">
          <Input
            placeholder="Ej: ABC-1234"
            value={preferredPlate}
            onChange={(e) => setPreferredPlate(e.target.value)}
          />
        </FormField>
      </FormModal>

      <FormModal
        open={checkIn !== null}
        onOpenChange={(modalOpen) => !modalOpen && setCheckIn(null)}
        title={`Registrar entrada — ${checkIn?.name ?? ''}`}
        submitText="Registrar entrada"
        cancelText="Cancelar"
        onSubmit={onCheckIn}
      >
        <FormField label="Placa del auto (opcional)">
          <Input
            placeholder="Ej: ABC-1234"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
          />
        </FormField>
        <label className="flex items-center gap-3 text-sm cursor-pointer mt-3">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={idVerified}
            onChange={(e) => setIdVerified(e.target.checked)}
          />
          <span>Identificación verificada</span>
        </label>
      </FormModal>

      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(modalOpen) => !modalOpen && setCancelling(null)}
        title="Cancelar visita"
        description={`La visita de "${cancelling?.visitor_name ?? ''}" dejará de aparecer en caseta.`}
        confirmText="Cancelar visita"
        cancelText="Volver"
        variant="destructive"
        onConfirm={onCancelVisit}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(modalOpen) => !modalOpen && setRemoving(null)}
        title="Eliminar visitante frecuente"
        description={`"${removing?.name ?? ''}" ya no podrá entrar sin registrar una visita.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={onRemovePreferred}
      />
    </div>
  )
}
