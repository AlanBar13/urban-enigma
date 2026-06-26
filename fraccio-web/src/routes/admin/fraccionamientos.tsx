import { createFileRoute, Link } from '@tanstack/react-router'
import { getTenantsWithStatsFn } from '@/lib/admin-tenants'
import { Building, Users, Home, Plus, MapPin, Calendar, ExternalLink, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { FormModal } from '@/components/modals'
import { FormField } from '@/components/forms'
import { Input } from '@/components/ui/input'
import { useServerFn } from '@tanstack/react-start'
import { createTenantFn } from '@/lib/tenants'
import { useToast } from '@/components/notifications'
import { logger } from '@/utils/logger'

const slugify = (value: string) => {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const Route = createFileRoute('/admin/fraccionamientos')({
  loader: async () => {
    const tenants = await getTenantsWithStatsFn()
    return { tenants }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { tenants } = Route.useLoaderData()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [address, setAddress] = useState('')
  const createTenant = useServerFn(createTenantFn)
  const { addToast } = useToast()

  const onSubmit = async () => {
    try {
      await createTenant({ data: { name, subdomain } })
      addToast({
        type: 'success',
        description: 'Fraccionamiento creado exitosamente',
        duration: 5000
      })
      setOpen(false)
      setName('')
      setSubdomain('')
      setAddress('')
      // Reload the page to show new tenant
      window.location.reload()
    } catch (error) {
      logger('error', 'Error creating tenant:', { error })
      addToast({
        type: 'error',
        description: 'Error al crear el fraccionamiento',
        duration: 10000
      })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date)
  }

  const totalUsers = tenants.reduce((sum, t) => sum + t.users_count, 0)
  const totalHouses = tenants.reduce((sum, t) => sum + t.houses_count, 0)
  const avgUsersPerTenant = tenants.length > 0 ? Math.round(totalUsers / tenants.length) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Fraccionamientos</h1>
          <p className="text-muted-foreground">
            Gestiona todos los fraccionamientos del sistema
          </p>
        </div>
        <Button size="lg" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Fraccionamiento
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{tenants.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Usuarios</p>
              <p className="text-2xl font-bold">{totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
              <Home className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Casas</p>
              <p className="text-2xl font-bold">{totalHouses}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Promedio Usuarios</p>
              <p className="text-2xl font-bold">{avgUsersPerTenant}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tenants Grid */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            Todos los Fraccionamientos ({tenants.length})
          </h2>
        </div>

        {tenants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((tenant) => (
              <div
                key={tenant.id}
                className="group border rounded-xl p-5 hover:shadow-lg hover:border-primary/50 transition-all duration-300 bg-card"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Building className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {tenant.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <ExternalLink className="h-3 w-3" />
                        <span>/{tenant.path}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address */}
                {tenant.address && (
                  <div className="flex items-start gap-2 mb-4 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{tenant.address}</span>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-accent" />
                      <span className="text-xs text-muted-foreground">Usuarios</span>
                    </div>
                    <p className="text-xl font-bold">{tenant.users_count}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Home className="h-4 w-4 text-chart-2" />
                      <span className="text-xs text-muted-foreground">Casas</span>
                    </div>
                    <p className="text-xl font-bold">{tenant.houses_count}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(tenant.created_at)}</span>
                  </div>
                  <Link to={`/$tenantId`} params={{ tenantId: tenant.path }}>
                    <Button size="sm" variant="ghost">
                      Ver detalles
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Building className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <h3 className="text-lg font-semibold mb-2">No hay fraccionamientos</h3>
            <p className="text-muted-foreground mb-6">
              Comienza creando tu primer fraccionamiento
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Fraccionamiento
            </Button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <FormModal
        open={open}
        onOpenChange={setOpen}
        title="Nuevo Fraccionamiento"
        onSubmit={onSubmit}
      >
        <div className="space-y-4">
          <FormField label="Nombre del Fraccionamiento">
            <Input
              placeholder="Ej: Residencial Las Palmas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={(e) => setSubdomain(slugify(e.target.value))}
            />
          </FormField>

          <FormField label="Subdominio">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/</span>
              <Input
                placeholder="las-palmas"
                value={subdomain}
                onChange={(e) => setSubdomain(slugify(e.target.value))}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              URL de acceso: /{subdomain || 'tu-subdominio'}
            </p>
          </FormField>

          <FormField label="Dirección (Opcional)">
            <Input
              placeholder="Av. Principal #123, Colonia Centro"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </FormField>
        </div>
      </FormModal>
    </div>
  )
}
