import Link from "next/link"
import type React from "react"
import { usePathname } from "next/navigation"

const Header: React.FC = () => {
  const pathname = usePathname()

  return (
    <header className="w-full bg-blue-500 p-4">
      <nav>
        <ul className="flex justify-center space-x-4">
          <li>
            <Link href="/" className={`text-white hover:text-gray-200 ${pathname === "/" ? "underline" : ""}`}>
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/about"
              className={`text-white hover:text-gray-200 ${pathname === "/about" ? "underline" : ""}`}
            >
              About
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard"
              className={`text-white hover:text-gray-200 ${pathname === "/dashboard" ? "underline" : ""}`}
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              href="/contact"
              className={`text-white hover:text-gray-200 ${pathname === "/contact" ? "underline" : ""}`}
            >
              Contact
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  )
}

export default Header

