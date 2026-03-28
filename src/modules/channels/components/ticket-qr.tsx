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
        dark: "#F0EDE8",
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
      <div className="flex h-[188px] items-center justify-center rounded-[10px] border border-dashed border-hairline bg-[linear-gradient(180deg,rgba(201,132,122,0.14),rgba(201,132,122,0)_26%),rgba(15,15,17,0.92)] px-4 text-center text-[12px] leading-6 text-tan">
        Generating secure pass QR...
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-[10px] border border-hairline bg-[linear-gradient(180deg,rgba(201,132,122,0.18),rgba(201,132,122,0)_24%),rgba(15,15,17,0.96)] p-4 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 before:content-['']">
      <div className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[rgba(168,168,179,0.04)] p-3">
        <Image
          src={src}
          alt={alt}
          width={180}
          height={180}
          unoptimized
          className="mx-auto size-full max-w-[180px]"
        />
      </div>
    </div>
  )
}
