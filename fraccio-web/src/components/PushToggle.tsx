import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Bell, BellOff, Share } from 'lucide-react'
import { deletePushSubscriptionFn, savePushSubscriptionFn } from '@/lib/push'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/notifications'
import { logger } from '@/utils/logger'

/** Push services want the VAPID key as raw bytes, not base64url */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPadOS 13+ reports itself as a Mac
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

type Status = 'loading' | 'unsupported' | 'needs-install' | 'off' | 'on'

export function PushToggle({ tenantId }: { tenantId: string }) {
  const [status, setStatus] = useState<Status>('loading')
  const [busy, setBusy] = useState(false)
  const { addToast } = useToast()
  const saveSubscription = useServerFn(savePushSubscriptionFn)
  const deleteSubscription = useServerFn(deletePushSubscriptionFn)

  useEffect(() => {
    const check = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        // iOS only exposes PushManager once the app runs from the Home Screen
        setStatus(isIOS() && !isStandalone() ? 'needs-install' : 'unsupported')
        return
      }
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setStatus(subscription ? 'on' : 'off')
    }
    check().catch((error) => {
      logger('error', 'Error checking push subscription', { error })
      setStatus('unsupported')
    })
  }, [])

  // Safari requires subscribe() to run inside the click handler, so no async work before it
  const enable = async () => {
    setBusy(true)
    try {
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      // Inlined at build time — if the env var was missing when this bundle was
      // built, it is undefined here no matter what the server has now.
      if (!vapidKey) {
        throw new Error(
          'VITE_VAPID_PUBLIC_KEY missing from this build — set it and redeploy',
        )
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const { endpoint, keys } = subscription.toJSON()
      await saveSubscription({
        data: {
          tenantId,
          endpoint: endpoint!,
          p256dh: keys!.p256dh,
          auth: keys!.auth,
        },
      })

      setStatus('on')
      addToast({
        type: 'success',
        description: 'Notificaciones activadas',
        duration: 5000,
      })
    } catch (error) {
      logger('error', 'Error enabling push notifications', { error })
      const detail =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error)
      addToast({
        type: 'error',
        description:
          Notification.permission === 'denied'
            ? 'Las notificaciones están bloqueadas en la configuración de tu dispositivo'
            : `No se pudieron activar las notificaciones (${detail})`,
        duration: 15000,
      })
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await deleteSubscription({ data: { endpoint: subscription.endpoint } })
        await subscription.unsubscribe()
      }
      setStatus('off')
      addToast({
        type: 'success',
        description: 'Notificaciones desactivadas',
        duration: 5000,
      })
    } catch (error) {
      logger('error', 'Error disabling push notifications', { error })
      addToast({
        type: 'error',
        description: 'No se pudieron desactivar las notificaciones',
        duration: 10000,
      })
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading') return null

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
            {status === 'on' ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Notificaciones</h2>
            <p className="text-sm text-muted-foreground">
              Recibe avisos de nuevos anuncios y conceptos de pago en este
              dispositivo.
            </p>
          </div>
        </div>

        {status === 'on' && (
          <Button variant="outline" onClick={disable} disabled={busy}>
            {busy ? 'Desactivando...' : 'Desactivar'}
          </Button>
        )}
        {status === 'off' && (
          <Button onClick={enable} disabled={busy}>
            {busy ? 'Activando...' : 'Activar'}
          </Button>
        )}
      </div>

      {status === 'needs-install' && (
        <div className="mt-4 rounded-lg bg-[var(--surface-container-highest)] p-4 text-sm">
          <p className="font-medium mb-2 flex items-center gap-2">
            <Share className="h-4 w-4 shrink-0" />
            Instala Fraccio para recibir notificaciones
          </p>
          <p className="text-muted-foreground">
            En iPhone o iPad, toca el botón Compartir en Safari y elige{' '}
            <strong>Añadir a pantalla de inicio</strong>. Abre Fraccio desde ahí
            y vuelve a esta pantalla.
          </p>
        </div>
      )}

      {status === 'unsupported' && (
        <p className="mt-4 text-sm text-muted-foreground">
          Este navegador no soporta notificaciones push.
        </p>
      )}
    </Card>
  )
}
