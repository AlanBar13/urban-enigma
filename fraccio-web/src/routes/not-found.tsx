import { createFileRoute } from '@tanstack/react-router'
import NotFound from '@/components/ui/NotFound'

export const Route = createFileRoute('/not-found')({
  component: RouteComponent,
})

function RouteComponent() {
  return <NotFound />
}
