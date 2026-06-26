import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/$tenantId/perfil')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/$tenantId/perfil"!</div>
}
