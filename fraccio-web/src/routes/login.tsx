import { createFileRoute, redirect } from '@tanstack/react-router'
import Login from '../components/Login'
import { getTenantByIdFn } from '@/lib/tenants'
import { getUser } from '@/lib/user'

export const Route = createFileRoute('/login')({
  // Already signed in? Skip the form — the PWA's start_url points here.
  beforeLoad: async () => {
    let user
    try {
      user = await getUser()
    } catch {
      return // not signed in → show the form
    }

    if (user.role === 'superadmin') throw redirect({ to: '/admin' })
    if (!user.tenantId) return

    const tenant = await getTenantByIdFn({ data: { id: user.tenantId } })
    if (tenant) {
      throw redirect({ to: '/$tenantId', params: { tenantId: tenant.path } })
    }
  },
  component: LoginComp,
  head: () => ({
    meta: [
      {
        title: 'Iniciar Sesión | Fraccio',
      },
    ],
  }),
})

function LoginComp() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--surface-container)] p-4">
      <Login />
    </div>
  )
}
