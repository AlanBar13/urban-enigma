import { createFileRoute } from '@tanstack/react-router'
import { Mail, User } from 'lucide-react'
import { PushToggle } from '@/components/PushToggle'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/$tenantId/perfil')({
  component: RouteComponent,
})

const roleLabels: Partial<Record<string, string>> = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  user: 'Residente',
  guard: 'Vigilante',
}

function RouteComponent() {
  const { tenant, user } = Route.useRouteContext()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Mi Perfil</h1>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold truncate">
              {user.full_name || 'Sin nombre'}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 min-w-0">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{user.email}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Fraccionamiento</p>
            <p className="font-medium">{tenant.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rol</p>
            <p className="font-medium">{roleLabels[user.role] ?? user.role}</p>
          </div>
        </div>
      </Card>

      <PushToggle tenantId={tenant.id} />
    </div>
  )
}
