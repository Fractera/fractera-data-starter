import { ThemeProvider } from "@/components/shell/theme-provider.client"
import { ProjectHeader } from "@/components/shell/project-header"
import { ProjectFooter } from "@/components/shell/project-footer"
import { loadProjectShell } from "@/components/shell/remote-shell"
import type { ShellSurface } from "@/components/shell/shell-types"

// ОБОЛОЧКА ПРОЕКТА НА СТРАНИЦЕ СЛУЖБЫ ДАННЫХ (285-4, решение владельца: «Страница данных переезжает на Next и
// получает ту же оболочку, что у остальных»). `components/shell/` — копия сайта байт в байт (`shell-kit:add`
// узла, руками не править); данные — дверь сайта `PROJECT_SHELL_URL/<язык>` на сборке.
//
// 🔒 Своей двери «кто вошёл» у службы данных нет — вошедшего знает сайт, поэтому оболочка спрашивает сайт
// (`PROJECT_SITE_URL/api/me`, тот же cookie проекта); вход и выход — через сайт. Языки — только en, ru.
const SITE = (process.env.PROJECT_SITE_URL ?? "").replace(/\/+$/, "")

const SURFACE: ShellSurface = {
  meUrl: `${SITE}/api/me`,
  loginHref: (lang) => `${SITE}/login?lang=${lang}`,
  logoutHref: (lang) => `${SITE}/logout?lang=${lang}`,
  languages: ["en", "ru"],
}

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const shell = await loadProjectShell(lang)
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        {shell && <ProjectHeader data={shell} surface={SURFACE} />}
        {children}
        {shell && <ProjectFooter data={shell} surface={SURFACE} />}
      </div>
    </ThemeProvider>
  )
}
