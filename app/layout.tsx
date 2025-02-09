import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import type React from "react"
import dynamic from "next/dynamic"

const inter = Inter({ subsets: ["latin"] })

const DynamicHeader = dynamic(() => import("./components/Header"), { ssr: false })

export const metadata: Metadata = {
  title: "Basic Next.js TypeScript App",
  description: "A simple Next.js app with TypeScript",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DynamicHeader />
        {children}
      </body>
    </html>
  )
}