import { Inter, Roboto, Open_Sans, Lato, Montserrat, Nunito } from "next/font/google";
import "./globals.css";
import type React from "react";
import dynamic from "next/dynamic";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "700"] });
const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "700"] });
const lato = Lato({ subsets: ["latin"], weight: ["400", "700"] });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "700"] });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "700"] });

const DynamicHeader = dynamic(() => import("./components/Header"), { ssr: false });

export const metadata: Metadata = {
  title: "System Analyst Agent",
  description: "System Analyst Agent",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
        <link rel="stylesheet" href="https://unpkg.com/react-pdf@5.7.2/dist/esm/Page/AnnotationLayer.css" />
      </head>
      <body className={`${inter.className} ${roboto.className} ${openSans.className} ${lato.className} ${montserrat.className} ${nunito.className}`}>
        <DynamicHeader />
        <main className="mainContent">
          {children}
        </main>
      </body>
    </html>
  )
}
