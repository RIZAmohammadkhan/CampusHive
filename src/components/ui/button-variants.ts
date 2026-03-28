import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[8px] border border-transparent bg-clip-padding font-medium whitespace-nowrap tracking-[-0.01em] transition-all duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 text-[13px] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-[rgba(201,132,122,0.18)] bg-[linear-gradient(135deg,var(--rose),var(--gold))] text-[#120f0d] shadow-[0_14px_30px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.14)] hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,var(--rose-hover),var(--gold-hover))] hover:shadow-[0_18px_36px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18)]",
        outline:
          "border-border bg-elevated/92 text-parchment backdrop-blur hover:border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.04)] hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "border-border bg-panel text-secondary-foreground hover:border-[rgba(255,255,255,0.1)] hover:bg-elevated aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-[rgba(255,255,255,0.04)] hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "border-[rgba(201,132,122,0.18)] bg-[rgba(201,132,122,0.12)] text-rose hover:bg-[rgba(201,132,122,0.18)] focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-[8px] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[8px] px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-1.5 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10 rounded-[8px]",
        "icon-xs":
          "size-6 rounded-[8px] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-[8px] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-11 rounded-[8px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
