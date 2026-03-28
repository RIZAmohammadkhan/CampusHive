import { dark } from "@clerk/themes"

export const clerkAppearance = {
  baseTheme: dark,
  layout: {
    logoPlacement: "none",
    socialButtonsVariant: "blockButton",
    shimmer: false,
  },
  variables: {
    colorPrimary: "var(--cream)",
    colorPrimaryForeground: "var(--base)",
    colorDanger: "var(--terracotta)",
    colorSuccess: "var(--sage)",
    colorWarning: "var(--terracotta)",
    colorForeground: "var(--parchment)",
    colorMutedForeground: "var(--tan)",
    colorBackground: "rgba(26, 24, 19, 0.94)",
    colorInput: "rgba(42, 38, 32, 0.96)",
    colorInputForeground: "var(--parchment)",
    colorBorder: "rgba(255, 255, 255, 0.031)",
    colorRing: "rgba(181, 164, 138, 0.4)",
    colorNeutral: "rgba(232, 220, 200, 0.92)",
    colorShadow: "#000000",
    fontFamily: "var(--font-geist-sans)",
    fontFamilyButtons: "var(--font-geist-sans)",
    fontSize: "0.875rem",
    borderRadius: "1rem",
    spacing: "1rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "relative overflow-hidden rounded-[30px] border border-hairline bg-surface/94 shadow-[0_30px_90px_rgba(0,0,0,0.34)] backdrop-blur-xl",
    headerTitle: "font-display text-[1.95rem] leading-tight text-cream",
    headerSubtitle: "mt-2 text-[13px] leading-6 text-tan",
    socialButtonsBlockButton:
      "h-11 rounded-2xl border border-hairline bg-panel/90 text-parchment shadow-none transition-colors hover:bg-elevated",
    socialButtonsBlockButtonText:
      "font-sans text-[13px] font-medium text-parchment",
    dividerText: "text-[10px] font-medium uppercase tracking-[0.18em] text-tan",
    dividerLine: "bg-hairline",
    formFieldLabel:
      "mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-tan",
    formFieldInput:
      "h-11 rounded-2xl border border-hairline bg-field/95 px-3 text-[13px] text-parchment shadow-none placeholder:text-tan transition-colors hover:bg-field focus:bg-field",
    formButtonPrimary:
      "h-11 rounded-2xl bg-primary text-primary-foreground shadow-none transition-all duration-150 hover:-translate-y-0.5 hover:bg-parchment",
    footerActionText: "text-tan",
    footerActionLink: "font-medium text-beige transition-colors hover:text-cream",
    formResendCodeLink:
      "font-medium text-beige transition-colors hover:text-cream",
    formFieldErrorText: "text-[11px] text-terracotta",
    formFieldSuccessText: "text-[11px] text-sage",
    identityPreviewText: "text-parchment",
    identityPreviewEditButton:
      "font-medium text-beige transition-colors hover:text-cream",
    otpCodeFieldInput:
      "h-12 rounded-2xl border border-hairline bg-field/90 text-parchment shadow-none",
    userButtonTrigger:
      "rounded-full border border-hairline bg-surface/85 p-1 backdrop-blur transition-colors hover:bg-elevated",
    userButtonPopoverCard:
      "rounded-[24px] border border-hairline bg-elevated/95 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl",
    userButtonPopoverActionButton:
      "rounded-2xl text-parchment transition-colors hover:bg-field",
    userButtonPopoverFooter: "border-t border-hairline",
    organizationSwitcherTrigger:
      "h-10 rounded-full border border-hairline bg-surface/85 px-3 backdrop-blur transition-colors hover:bg-elevated",
    organizationSwitcherTriggerIcon: "text-tan",
    organizationSwitcherPopoverCard:
      "rounded-[24px] border border-hairline bg-elevated/95 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl",
    organizationSwitcherPreviewButton:
      "rounded-2xl transition-colors hover:bg-field",
    organizationSwitcherPopoverActionButton:
      "rounded-2xl text-parchment transition-colors hover:bg-field",
    organizationListPreviewButton:
      "rounded-2xl border border-hairline bg-panel/70 transition-colors hover:bg-elevated",
    organizationListCreateOrganizationActionButton:
      "rounded-2xl bg-primary text-primary-foreground transition-colors hover:bg-beige",
    organizationPreviewMainIdentifier: "text-parchment",
    organizationPreviewSecondaryIdentifier: "text-tan",
    userPreviewMainIdentifierText: "text-parchment",
    userPreviewSecondaryIdentifier: "text-tan",
  },
} as const
