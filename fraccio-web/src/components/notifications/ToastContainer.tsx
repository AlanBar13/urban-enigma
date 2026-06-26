import * as React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToast } from './ToastContext'

const typeConfig = {
  info: {
    bgColor: 'bg-blue-500',
    Icon: Info,
  },
  success: {
    bgColor: 'bg-green-500',
    Icon: CheckCircle,
  },
  warning: {
    bgColor: 'bg-yellow-500',
    Icon: AlertTriangle,
  },
  error: {
    bgColor: 'bg-red-500',
    Icon: AlertCircle,
  },
}

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const config = typeConfig[toast.type]
        const Icon = config.Icon

        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-lg text-white shadow-lg pointer-events-auto animate-in slide-in-from-right-full duration-300',
              config.bgColor
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="font-semibold">{toast.title}</h4>
              )}
              <p className="text-sm">{toast.description}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export { ToastContainer }
