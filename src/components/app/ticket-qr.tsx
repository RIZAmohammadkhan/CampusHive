"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import QRCode from "qrcode"

export function TicketQr({
  value,
  alt,
}: {
  value: string
  alt: string
}) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void QRCode.toDataURL(value, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 280,
      color: {
        dark: "#F0E6D3",
        light: "#0000",
      },
    })
      .then((nextSrc) => {
        if (active) {
          setSrc(nextSrc)
        }
      })
      .catch(() => {
        if (active) {
          setSrc(null)
        }
      })

    return () => {
      active = false
    }
  }, [value])

  if (!src) {
    return (
      <div className="flex h-[180px] items-center justify-center rounded-[24px] border border-dashed border-hairline bg-surface/55 px-4 text-[12px] leading-6 text-tan">
        Generating secure ticket QR...
      </div>
    )
  }

  return (
    <div className="rounded-[24px] border border-hairline bg-surface/55 p-4">
      <Image
        src={src}
        alt={alt}
        width={180}
        height={180}
        unoptimized
        className="mx-auto size-full max-w-[180px]"
      />
    </div>
  )
}
