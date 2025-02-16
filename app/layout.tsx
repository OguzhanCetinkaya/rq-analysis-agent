import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import type React from "react"
import dynamic from "next/dynamic"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

const DynamicHeader = dynamic(() => import("./components/Header"), { ssr: false })

export const metadata: Metadata = {
  title: "System Analyst Agent",
  description: "System Analyst Agent",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/react-pdf@5.7.2/dist/esm/Page/AnnotationLayer.css" />
      </head>
      <body className={inter.className}>
        <DynamicHeader />
        <main className="mainContent">
          {children}
        </main>
      </body>
    </html>
  )
}

