import { createFileRoute, Link } from '@tanstack/react-router'
import { getDashboardStatsFn } from '@/lib/admin'
import { Building, Users, Home, Bell, TrendingUp, Activity, Plus, ArrowRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/admin/')({
  loader: async () => {
    const stats = await getDashboardStatsFn()
    return { stats }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { stats } = Route.useLoaderData()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date)
  }

  const statCards = [
    {
      title: 'Fraccionamientos',
      value: stats.totalTenants,
      icon: Building,
      color: 'bg-primary/10 text-primary',
      link: '/admin/fraccionamientos'
    },
    {
      title: 'Usuarios',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-accent/10 text-accent',
      link: '/admin/usuarios'
    },
    {
      title: 'Casas',
      value: stats.totalHouses,
      icon: Home,
      color: 'bg-chart-2/10 text-chart-2',
      link: '#'
    },
    {
      title: 'Anuncios',
      value: stats.totalAnnouncements,
      icon: Bell,
      color: 'bg-chart-4/10 text-chart-4',
      link: '#'
    }
  ]

  const quickActions = [
    {
      title: 'Nuevo Fraccionamiento',
      description: 'Crear un nuevo fraccionamiento en el sistema',
      icon: Building,
      link: '/admin/fraccionamientos',
      color: 'bg-primary'
    },
    {
      title: 'Invitar Usuario',
      description: 'Enviar invitación a un nuevo usuario',
      icon: Users,
      link: '/admin/usuarios',
      color: 'bg-accent'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Panel de Administración</h1>
        <p className="text-muted-foreground">
          Bienvenido al panel de control de Fraccio
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Link
              key={index}
              to={stat.link}
              className="block group"
            >
              <div className="bg-card border rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-primary/50">
                <div className="flex items-start justify-between mb-4">
                  <div className={`h-12 w-12 rounded-lg ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Acciones Rápidas</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Link key={index} to={action.link}>
                <div className="group border rounded-lg p-4 hover:border-primary/50 transition-all cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-lg ${action.color} text-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                    <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Tenants */}
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Fraccionamientos Recientes</h2>
            </div>
            <Link to="/admin/fraccionamientos">
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="space-y-4">
            {stats.recentTenants.length > 0 ? (
              stats.recentTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground">/{tenant.path}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(tenant.created_at)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No hay fraccionamientos registrados</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              <h2 className="text-xl font-semibold">Usuarios Recientes</h2>
            </div>
            <Link to="/admin/usuarios">
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="space-y-4">
            {stats.recentUsers.length > 0 ? (
              stats.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(user.created_at)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No hay usuarios registrados</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-muted/50 border rounded-xl p-6">
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Estado del Sistema</p>
            <div className="flex items-center justify-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <p className="font-semibold">Operativo</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Versión</p>
            <p className="font-semibold">Fraccio v1.0.0</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Base de Datos</p>
            <div className="flex items-center justify-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <p className="font-semibold">Conectado</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
