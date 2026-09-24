import { ThemeProvider } from "@/components/shell/theme-provider.client"
import { ProjectHeader } from "@/components/shell/project-header"
import { ProjectFooter } from "@/components/shell/project-footer"
import { loadProjectShell } from "@/components/shell/remote-shell"
import type { ShellSurface } from "@/components/shell/shell-types"
import { cacheLife } from "next/cache"

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

// 295: ОБОЛОЧКА РИСУЕТСЯ ВНУТРИ КЭША (Cache Components) и держится минуты: правка меню на сайте доходит сюда без
// пересборки этой службы. Рисуется, а не только читается, в кэше намеренно: подвал печатает год (`new Date()`), а
// текущее время вне кэша Next 16 запрещает на статической странице — копию оболочки (`shell-kit`) не трогаем.
async function ShellHeader({ lang }: { lang: string }) {
  "use cache"
  cacheLife("minutes")
  const shell = await loadProjectShell(lang)
  return shell ? <ProjectHeader data={shell} surface={SURFACE} /> : null
}

async function ShellFooter({ lang }: { lang: string }) {
  "use cache"
  cacheLife("minutes")
  const shell = await loadProjectShell(lang)
  return shell ? <ProjectFooter data={shell} surface={SURFACE} /> : null
}

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  // Незнакомый язык — страница ответит 404; оболочку у сайта за ним не спрашиваем.
  const known = SURFACE.languages?.includes(lang) ?? true
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        {known && <ShellHeader lang={lang} />}
        {children}
        {known && <ShellFooter lang={lang} />}
      </div>
    </ThemeProvider>
  )
}
