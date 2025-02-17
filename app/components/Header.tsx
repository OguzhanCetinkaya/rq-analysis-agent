"use client"

import Link from "next/link"
import type React from "react"
import { usePathname } from "next/navigation"

const Header: React.FC = () => {
  const pathname = usePathname()

  return (
    <header className="flex-none bg-[#202124]">
      <div className="flex items-center p-4">
        <div className="flex items-center">
          <i className="fas fa-robot text-2xl text-white mr-2"></i>
          <span className="text-xl text-white font-semibold">System Analyst Agent</span>
        </div>
      </div>
    </header>
  )
}

export default Header