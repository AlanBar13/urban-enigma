import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Input } from '../ui/input'
import type { WhatsappSession, WhatsappSessionStatus } from '@/lib/whatsapp'
import { useToast } from '@/components/notifications'
import {
  connectWhatsappFn,
  createGroupFn,
  disconnectWhatsappFn,
  getWhatsappStatusFn,
  sendGroupMessageFn,
} from '@/lib/whatsapp'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, FormModal } from '@/components/modals'
import { FormField, Textarea } from '@/components/forms'
import { logger } from '@/utils/logger'

interface Props {
  tenantId: string
  initialSession: WhatsappSession | null
}

const STATUS_BADGE: Record<
  WhatsappSessionStatus,
  { label: string; className: string }
> = {
  ready: { label: 'Conectado', className: 'bg-green-100 text-green-800' },
  pending_qr: {
    label: 'Escanea el código QR',
    className: 'bg-yellow-100 text-yellow-800',
  },
  connecting: {
    label: 'Conectando...',
    className: 'bg-blue-100 text-blue-800',
  },
  error: { label: 'Error', className: 'bg-red-100 text-red-800' },
  disconnected: {
    label: 'Desconectado',
    className: 'bg-gray-100 text-gray-800',
  },
}

export default function WhatsappContainer({ tenantId, initialSession }: Props) {
  const { addToast } = useToast()
  const [session, setSession] = useState<WhatsappSession | null>(initialSession)
  const [connecting, setConnecting] = useState(false)
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [participants, setParticipants] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const connectWhatsapp = useServerFn(connectWhatsappFn)
  const disconnectWhatsapp = useServerFn(disconnectWhatsappFn)
  const getStatus = useServerFn(getWhatsappStatusFn)
  const createGroup = useServerFn(createGroupFn)
  const sendGroupMessage = useServerFn(sendGroupMessageFn)

  const status = session?.status ?? null
  const isPolling = status === 'connecting' || status === 'pending_qr'

  // ponytail: setInterval polling during the connect flow, no react-query; switch to SSE/realtime if QR latency matters
  useEffect(() => {
    if (!isPolling) return
    const interval = setInterval(async () => {
      try {
        const res = await getStatus({ data: { tenantId } })
        setSession(res.session)
      } catch (error) {
        logger('error', 'Error polling WhatsApp status:', { error })
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [isPolling, tenantId, getStatus])

  const onConnect = async () => {
    setConnecting(true)
    try {
      const res = await connectWhatsapp({ data: { tenantId } })
      setSession(res.session)
      addToast({
        type: 'success',
        description: 'Conexión iniciada, espera el código QR',
        duration: 5000,
      })
    } catch (error: any) {
      logger('error', 'Error connecting WhatsApp:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al conectar WhatsApp',
        duration: 10000,
      })
    } finally {
      setConnecting(false)
    }
  }

  const onDisconnect = async () => {
    try {
      await disconnectWhatsapp({ data: { tenantId } })
      setSession(
        session ? { ...session, status: 'disconnected', qr_code: null } : null,
      )
      addToast({
        type: 'success',
        description: 'Sesión de WhatsApp desconectada',
        duration: 5000,
      })
    } catch (error: any) {
      logger('error', 'Error disconnecting WhatsApp:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al desconectar WhatsApp',
        duration: 10000,
      })
    }
  }

  const onCreateGroup = async () => {
    const name = groupName.trim()
    const phones = participants
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)

    if (name.length < 3) {
      addToast({
        type: 'error',
        description: 'El nombre del grupo debe tener al menos 3 caracteres',
        duration: 5000,
      })
      return
    }

    try {
      await createGroup({
        data: { tenantId, groupName: name, initParticipants: phones },
      })
      addToast({
        type: 'success',
        description: `Grupo "${name}" en creación, aparecerá en unos momentos`,
        duration: 5000,
      })
      setGroupName('')
      setParticipants('')
      setGroupModalOpen(false)
    } catch (error: any) {
      logger('error', 'Error creating WhatsApp group:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al crear el grupo',
        duration: 10000,
      })
    }
  }

  const onSendMessage = async () => {
    if (!message.trim()) {
      addToast({
        type: 'error',
        description: 'Escribe un mensaje',
        duration: 5000,
      })
      return
    }

    setSending(true)
    try {
      await sendGroupMessage({ data: { tenantId, message: message.trim() } })
      addToast({
        type: 'success',
        description: 'Mensaje encolado para envío al grupo',
        duration: 5000,
      })
      setMessage('')
    } catch (error: any) {
      logger('error', 'Error sending WhatsApp message:', { error })
      addToast({
        type: 'error',
        description: error.message || 'Error al enviar el mensaje',
        duration: 10000,
      })
    } finally {
      setSending(false)
    }
  }

  const badge = status ? STATUS_BADGE[status] : STATUS_BADGE.disconnected
  const canConnect = !status || status === 'disconnected' || status === 'error'

  return (
    <div className="space-y-6">
      {/* Session status card */}
      <div className="rounded-lg border border-border bg-background p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Sesión de WhatsApp</h2>
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          {canConnect ? (
            <Button onClick={onConnect} disabled={connecting}>
              {connecting ? 'Conectando...' : 'Conectar WhatsApp'}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setDisconnectOpen(true)}
            >
              Desconectar
            </Button>
          )}
        </div>

        {session?.connected_phone && (
          <p className="text-sm text-gray-600">
            Teléfono conectado:{' '}
            <span className="font-medium">{session.connected_phone}</span>
          </p>
        )}

        {status === 'error' && session?.error_message && (
          <p className="text-sm text-red-600">{session.error_message}</p>
        )}

        {status === 'connecting' && (
          <p className="text-sm text-gray-600">
            Iniciando la sesión, el código QR aparecerá aquí en unos momentos...
          </p>
        )}

        {status === 'pending_qr' && session?.qr_code && (
          <div className="flex flex-col items-center gap-3 py-4">
            <img
              src={session.qr_code}
              alt="Código QR de WhatsApp"
              className="w-64 h-64"
            />
            <p className="text-sm text-gray-600 text-center max-w-md">
              Abre WhatsApp en tu teléfono, ve a Dispositivos vinculados y
              escanea este código. El código se actualiza automáticamente.
            </p>
          </div>
        )}
      </div>

      {/* Messaging section — only when session is ready */}
      {status === 'ready' && (
        <div className="rounded-lg border border-border bg-background p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Grupo del Fraccionamiento</h2>
            {!session?.group_id && (
              <Button onClick={() => setGroupModalOpen(true)}>
                Crear Grupo
              </Button>
            )}
          </div>

          {session?.group_id ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Grupo: <span className="font-medium">{session.group_id}</span>
              </p>
              <FormField label="Mensaje para el grupo">
                <Textarea
                  placeholder="Ej: Recordatorio: junta de vecinos este sábado a las 10am"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </FormField>
              <Button onClick={onSendMessage} disabled={sending}>
                {sending ? 'Enviando...' : 'Enviar Mensaje'}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Aún no hay un grupo para este fraccionamiento. Crea uno para poder
              enviar mensajes.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title="Desconectar WhatsApp"
        description="La sesión se cerrará y tendrás que escanear el código QR de nuevo para reconectar. ¿Continuar?"
        confirmText="Desconectar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={onDisconnect}
      />

      <FormModal
        open={groupModalOpen}
        onOpenChange={setGroupModalOpen}
        title="Crear Grupo de WhatsApp"
        submitText="Crear"
        cancelText="Cancelar"
        onSubmit={onCreateGroup}
      >
        <FormField label="Nombre del grupo">
          <Input
            placeholder="Ej: Vecinos Fraccionamiento Las Palmas"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
        </FormField>

        <FormField label="Participantes (un teléfono por línea, opcional)">
          <Textarea
            placeholder={'5218112345678\n5218187654321'}
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            rows={5}
          />
        </FormField>
      </FormModal>
    </div>
  )
}
