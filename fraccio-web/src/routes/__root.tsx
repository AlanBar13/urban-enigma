import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import appCss from '../styles.css?url'
import { logger } from '@/utils/logger'
import { ToastContainer, ToastProvider } from '@/components/notifications'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        title: 'Fraccio',
      },
      {
        name: 'theme-color',
        content: '#F97316',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'default',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'Fraccio',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'icon',
        href: '/favicon.svg',
        type: 'image/svg+xml',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // Registered here rather than in the notification toggle so the app stays
  // installable even for users who never opt into push.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker
      .register('/sw.js')
      .catch((error) =>
        logger('error', 'Service worker registration failed', { error }),
      )
  }, [])

  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
        <Analytics />
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
