import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Proof of Reasoning — Integrity Protocol",
  description:
    "71,893 AI reasoning failures caught autonomously across 145 pipeline runs. The Integrity Protocol cognitive audit terminal.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#0a0f1a",
          color: "#f1f5f9",
          margin: 0,
          padding: 0,
        }}
      >
        {children}
      </body>
    </html>
  )
}
