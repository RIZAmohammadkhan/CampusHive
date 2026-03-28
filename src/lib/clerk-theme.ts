import { dark } from "@clerk/themes"

export const clerkAppearance = {
  baseTheme: dark,
  layout: {
    logoPlacement: "none",
    socialButtonsVariant: "blockButton",
    shimmer: false,
  },
  variables: {
    colorPrimary: "var(--rose)",
    colorPrimaryForeground: "var(--base)",
    colorDanger: "var(--terracotta)",
    colorSuccess: "var(--sage)",
    colorWarning: "var(--gold)",
    colorForeground: "var(--parchment)",
    colorMutedForeground: "var(--tan)",
    colorBackground: "rgba(13, 13, 15, 0.96)",
    colorInput: "rgba(13, 13, 15, 0.96)",
    colorInputForeground: "var(--parchment)",
    colorBorder: "rgba(255, 255, 255, 0.05)",
    colorRing: "rgba(217, 149, 111, 0.45)",
    colorNeutral: "rgba(232, 220, 200, 0.92)",
    colorShadow: "#000000",
    fontFamily: "var(--font-geist-sans)",
    fontFamilyButtons: "var(--font-geist-sans)",
    fontSize: "0.875rem",
    borderRadius: "0.625rem",
    spacing: "1rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "relative overflow-hidden rounded-[10px] border border-hairline bg-surface/95 shadow-[0_28px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/7 before:content-['']",
    headerTitle: "font-sans text-[1.85rem] leading-tight text-cream",
    headerSubtitle: "mt-2 text-[13px] leading-6 text-tan",
    socialButtonsBlockButton:
      "h-11 rounded-[8px] border border-hairline bg-panel/90 text-parchment shadow-none transition-colors hover:border-white/10 hover:bg-elevated",
    socialButtonsBlockButtonText:
      "font-sans text-[13px] font-medium text-parchment",
    dividerText: "text-[10px] font-medium uppercase tracking-[0.18em] text-tan",
    dividerLine: "bg-hairline",
    formFieldLabel:
      "mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-tan",
    formFieldInput:
      "h-11 rounded-[8px] border border-white/8 bg-field px-3 text-[13px] text-parchment shadow-none placeholder:text-tan transition-colors hover:bg-field focus:bg-field",
    formButtonPrimary:
      "h-11 rounded-[8px] border border-[rgba(217,149,111,0.2)] bg-[linear-gradient(135deg,#d9956f,#d4af7f)] text-primary-foreground shadow-none transition-all duration-150 hover:-translate-y-0.5",
    footerActionText: "text-tan",
    footerActionLink: "font-medium text-gold transition-colors hover:text-gold-hover",
    formResendCodeLink:
      "font-medium text-gold transition-colors hover:text-gold-hover",
    formFieldErrorText: "text-[11px] text-terracotta",
    formFieldSuccessText: "text-[11px] text-sage",
    identityPreviewText: "text-parchment",
    identityPreviewEditButton:
      "font-medium text-gold transition-colors hover:text-gold-hover",
    otpCodeFieldInput:
      "h-12 rounded-[8px] border border-white/8 bg-field text-parchment shadow-none",
    userButtonTrigger:
      "rounded-[8px] border border-hairline bg-surface/85 p-1 backdrop-blur transition-colors hover:border-white/10 hover:bg-elevated",
    userButtonPopoverCard:
      "rounded-[10px] border border-hairline bg-elevated/96 shadow-[0_20px_64px_rgba(0,0,0,0.38)] backdrop-blur-xl",
    userButtonPopoverActionButton:
      "rounded-[8px] text-parchment transition-colors hover:bg-field",
    userButtonPopoverFooter: "border-t border-hairline",
    organizationSwitcherTrigger:
      "h-10 rounded-[8px] border border-hairline bg-surface/85 px-3 backdrop-blur transition-colors hover:border-white/10 hover:bg-elevated",
    organizationSwitcherTriggerIcon: "text-tan",
    organizationSwitcherPopoverCard:
      "rounded-[10px] border border-hairline bg-elevated/96 shadow-[0_20px_64px_rgba(0,0,0,0.38)] backdrop-blur-xl",
    organizationSwitcherPreviewButton:
      "rounded-[8px] transition-colors hover:bg-field",
    organizationSwitcherPopoverActionButton:
      "rounded-[8px] text-parchment transition-colors hover:bg-field",
    organizationListPreviewButton:
      "rounded-[8px] border border-hairline bg-panel/70 transition-colors hover:bg-elevated",
    organizationListCreateOrganizationActionButton:
      "rounded-[8px] bg-[linear-gradient(135deg,#d9956f,#d4af7f)] text-primary-foreground transition-colors",
    organizationPreviewMainIdentifier: "text-parchment",
    organizationPreviewSecondaryIdentifier: "text-tan",
    userPreviewMainIdentifierText: "text-parchment",
    userPreviewSecondaryIdentifier: "text-tan",
  },
} as const
