import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-9 w-full min-w-0 rounded-md border-0 bg-[var(--surface-container-low)] px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:ring-1 focus-visible:ring-primary focus-visible:shadow-[0_0_0_4px_rgba(0,0,0,0.06)]",
        "aria-invalid:ring-1 aria-invalid:ring-destructive aria-invalid:bg-[var(--error-container)]/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
