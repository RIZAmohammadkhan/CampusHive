"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: (
          <span className="size-2 rounded-full bg-sage" />
        ),
        info: (
          <span className="size-2 rounded-full bg-slate" />
        ),
        warning: (
          <span className="size-2 rounded-full bg-terracotta" />
        ),
        error: (
          <span className="size-2 rounded-full bg-terracotta" />
        ),
        loading: (
          <span className="size-2 animate-pulse rounded-full bg-tan/50" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--parchment)",
          "--normal-border": "var(--field)",
          "--border-radius": "999px",
        } as React.CSSProperties
      }
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: "cn-toast",
          icon: "cn-toast__icon",
          title: "cn-toast__title",
          description: "cn-toast__description",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
