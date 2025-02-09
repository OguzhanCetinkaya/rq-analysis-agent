import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import type React from "react"
import dynamic from "next/dynamic"
import Script from "next/script"

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
      <head>
        <link rel="stylesheet" href="https://unpkg.com/react-pdf@5.7.2/dist/esm/Page/AnnotationLayer.css" />
        <Script id="google-analytics">
          {`
            window.addEventListener('load', function() {
              document.body.setAttribute('data-new-gr-c-s-check-loaded', 'true');
              document.body.setAttribute('data-gr-ext-installed', '');
            });
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <DynamicHeader />
        {children}
      </body>
    </html>
  )
}

