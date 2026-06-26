import { createFileRoute } from '@tanstack/react-router'
import { getAllUsersFn } from '@/lib/admin-users'
import { Users, Mail, Shield, Building, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { listTenantsFn } from '@/lib/tenants'
import SAUserForm from '@/components/admin/SAUserForm'

export const Route = createFileRoute('/admin/usuarios')({
  loader: async () => {
    const usersReq = getAllUsersFn()
    const tenantsReq = listTenantsFn()
    const [users, tenants] = await Promise.all([usersReq, tenantsReq])
    return { users, tenants }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { users, tenants } = Route.useLoaderData()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'superadmin':
        return 'destructive'
      case 'admin':
        return 'default'
      case 'user':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'Super Admin'
      case 'admin':
        return 'Administrador'
      case 'user':
        return 'Usuario'
      default:
        return role
    }
  }

  const stats = {
    total: users.length,
    superadmins: users.filter(u => u.role === 'superadmin').length,
    admins: users.filter(u => u.role === 'admin').length,
    users: users.filter(u => u.role === 'user').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Gestión de Usuarios</h1>
        <p className="text-muted-foreground">
          Administra todos los usuarios del sistema
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Super Admins</p>
              <p className="text-2xl font-bold">{stats.superadmins}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold">{stats.admins}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Usuarios</p>
              <p className="text-2xl font-bold">{stats.users}</p>
            </div>
          </div>
        </div>
      </div>

      <SAUserForm tenants={tenants} />

      {/* Users Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Todos los Usuarios</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Usuario</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Correo</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Rol</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Fraccionamiento</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Fecha de Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.tenant_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(user.created_at)}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                    <p className="text-muted-foreground">No hay usuarios registrados</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
