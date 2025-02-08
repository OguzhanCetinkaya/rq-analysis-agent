import type React from "react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="h-screen w-screen">{children}</div>
}

