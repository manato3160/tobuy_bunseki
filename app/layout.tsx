import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "to buy分析Pro",
  description: "必要情報を入力することで、to buy分析Proが施策結果レポートを自動生成する社内SaaSツール",
  generator: 'v0.dev',
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head />
      <body className={inter.className}>{children}</body>
    </html>
  )
}
