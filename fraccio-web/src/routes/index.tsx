import { createFileRoute } from '@tanstack/react-router'
import NotFound from '@/components/ui/NotFound'
import LandingContainer from '@/components/landing/LandingContainer'

export const Route = createFileRoute('/')({
  component: App,
  notFoundComponent: () => <NotFound />,
})

function App() {
  return <LandingContainer />
}
