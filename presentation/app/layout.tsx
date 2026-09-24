import type { Metadata } from "next"
import "./globals.css"
import { buildDesignCss } from "@/lib/design-css"
import { ThemeInit, AppWidthInit } from "@/components/shell/shell-init"

// КОРНЕВОЙ МАКЕТ СТРАНИЦЫ СЛУЖБЫ ДАННЫХ (285-4). Оформление — `DESIGN-CONFIG` этой службы (его пишет «Дизайн»
// ядра дверью `/api/settings/design`), тема и ширина — выбор посетителя на весь проект до первого кадра.
export const metadata: Metadata = { title: "Fractera — Data" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { css, fontLinks } = buildDesignCss()
  return (
    // suppressHydrationWarning: класс `dark` на <html> ставит скрипт темы до гидратации.
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeInit />
        <AppWidthInit />
        {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
        {fontLinks.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body>{children}</body>
    </html>
  )
}
