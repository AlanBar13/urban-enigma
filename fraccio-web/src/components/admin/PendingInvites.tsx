import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useRouter } from '@tanstack/react-router'
import { Copy, Send, Trash2 } from 'lucide-react'
import { DataTable } from '../shared'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ConfirmDialog } from '../modals'
import { useToast } from '@/components/notifications'
import { resendInviteFn, revokeInviteFn } from '@/lib/invites/functions'
import { logger } from '@/utils/logger'

/** Shape shared by `getTenantInvitesFn` and `getAllInvitesFn` rows. */
export interface PendingInvite {
  id: string
  email: string
  name: string
  role: string
  is_admin: boolean
  house_owner: boolean | null
  expires_at: string
  created_at: string
  houses?: { name: string } | null
  tenants?: { name: string } | null
}

interface Props {
  invites: Array<PendingInvite>
  /** Superadmin view — adds the fraccionamiento column. */
  showTenant?: boolean
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))

const inviteLabel = (invite: PendingInvite) =>
  invite.is_admin
    ? 'Administrador'
    : invite.role === 'guard'
      ? 'Vigilante'
      : invite.house_owner
        ? 'Propietario'
        : 'Residente'

export default function PendingInvites({ invites, showTenant }: Props) {
  const { addToast } = useToast()
  const router = useRouter()
  const resendInvite = useServerFn(resendInviteFn)
  const revokeInvite = useServerFn(revokeInviteFn)
  const [pendingRevoke, setPendingRevoke] = useState<PendingInvite | null>(null)

  const onCopy = async (invite: PendingInvite) => {
    // The invite row's id *is* the token — same link the backend emails.
    const link = `${window.location.origin}/accept-invite?token=${invite.id}`
    try {
      await navigator.clipboard.writeText(link)
      addToast({
        type: 'success',
        description: 'Liga de invitación copiada',
        duration: 5000,
      })
    } catch (error) {
      logger('error', 'Error copying invite link:', { error })
      addToast({ type: 'error', description: link, duration: 30000 })
    }
  }

  const onResend = async (invite: PendingInvite) => {
    try {
      await resendInvite({ data: { inviteId: invite.id } })
      addToast({
        type: 'success',
        description: `Invitación reenviada a ${invite.email}`,
        duration: 5000,
      })
    } catch (error: any) {
      logger('error', 'Error resending invite:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al reenviar la invitación',
        duration: 10000,
      })
    }
  }

  const onConfirmRevoke = async () => {
    if (!pendingRevoke) return
    try {
      await revokeInvite({ data: { inviteId: pendingRevoke.id } })
      addToast({
        type: 'success',
        description: `Invitación de ${pendingRevoke.email} cancelada`,
        duration: 5000,
      })
      router.invalidate()
    } catch (error: any) {
      logger('error', 'Error revoking invite:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al cancelar la invitación',
        duration: 10000,
      })
    }
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-3">Invitaciones pendientes</h2>
      <DataTable
        data={invites}
        striped
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'email', label: 'Email' },
          {
            key: 'role',
            label: 'Tipo',
            render: (_value: string, row: PendingInvite) => inviteLabel(row),
          },
          {
            key: 'houses',
            label: 'Casa',
            render: (value: { name: string } | null) => value?.name || '-',
          },
          ...(showTenant
            ? [
                {
                  key: 'tenants' as const,
                  label: 'Fraccionamiento',
                  render: (value: { name: string } | null) =>
                    value?.name || '-',
                },
              ]
            : []),
          {
            key: 'expires_at',
            label: 'Estado',
            render: (value: string) =>
              new Date(value) < new Date() ? (
                <Badge variant="destructive">Expirada</Badge>
              ) : (
                <Badge variant="secondary">Expira {formatDate(value)}</Badge>
              ),
          },
          {
            key: 'id',
            label: 'Acciones',
            render: (_value: string, row: PendingInvite) => (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  title="Copiar liga de invitación"
                  onClick={() => onCopy(row)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Reenviar correo"
                  onClick={() => onResend(row)}
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Cancelar invitación"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => setPendingRevoke(row)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
      />
      <ConfirmDialog
        open={!!pendingRevoke}
        onOpenChange={(o) => !o && setPendingRevoke(null)}
        title="Cancelar invitación"
        description={`La liga de ${pendingRevoke?.email} dejará de funcionar. Podrás volver a invitar ese correo después.`}
        confirmText="Cancelar invitación"
        cancelText="Volver"
        variant="destructive"
        onConfirm={onConfirmRevoke}
      />
    </div>
  )
}
