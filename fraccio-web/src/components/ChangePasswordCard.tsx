import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { AlertCircle, KeyRound, Loader2 } from 'lucide-react'
import { changePasswordFn } from '@/lib/user'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/notifications'
import { logger } from '@/utils/logger'

export function ChangePasswordCard() {
  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { addToast } = useToast()
  const changePassword = useServerFn(changePasswordFn)

  const close = () => {
    setOpen(false)
    setError('')
    setCurrentPassword('')
    setPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    try {
      setIsLoading(true)
      const { error: changeError, message } = await changePassword({
        data: { currentPassword, password },
      })

      if (changeError) {
        setError(message)
        return
      }

      close()
      addToast({
        type: 'success',
        description: 'Contraseña actualizada',
        duration: 5000,
      })
    } catch (error) {
      logger('error', 'Change password error:', { error })
      setError('Ocurrió un error al actualizar la contraseña')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Contraseña</h2>
            <p className="text-sm text-muted-foreground">
              Cambia la contraseña con la que inicias sesión.
            </p>
          </div>
        </div>

        {open ? (
          <Button variant="outline" onClick={close} disabled={isLoading}>
            Cancelar
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setOpen(true)}>
            Cambiar
          </Button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Contraseña Actual</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-11"
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva Contraseña</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">Confirmar Contraseña</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11"
              disabled={isLoading}
              required
            />
          </div>

          <Button type="submit" className="h-11" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Contraseña'
            )}
          </Button>
        </form>
      )}
    </Card>
  )
}
