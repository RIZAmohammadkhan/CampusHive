import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-field px-3 py-2 font-sans text-[13px] text-parchment shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-[border-color,box-shadow,background-color] duration-150 ease-out outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-parchment placeholder:text-tan focus-visible:border-[rgba(201,132,122,0.5)] focus-visible:ring-3 focus-visible:ring-[rgba(201,132,122,0.18)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
