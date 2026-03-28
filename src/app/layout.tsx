import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google"

import { ConvexClientProvider } from "@/components/convex/convex-client-provider"
import { clerkAppearance } from "@/lib/clerk-theme"

import "./globals.css"

import { Toaster } from "@/components/ui/sonner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const cormorantGaramond = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "CampusHive",
  description: "A connected digital campus for clubs, events, and student community ops.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${cormorantGaramond.variable}`}
    >
      <body className="antialiased">
        <ClerkProvider appearance={clerkAppearance} afterSignOutUrl="/sign-in">
          <ConvexClientProvider>
            {children}
            <Toaster position="bottom-right" />
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
