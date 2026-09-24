import type { Metadata } from "next"
import { notFound } from "next/navigation"

// СТРАНИЦА-ПРЕЗЕНТАЦИЯ СЛУЖБЫ ДАННЫХ (280-10 → 285-4 на Next). Служба машинная (JSON для программ), поэтому
// страница самая минимальная: что это, какие двери, жива ли. Слова — прежние, из HTML-страницы `presentation.js`.
const WORDS = {
  en: {
    title: "Data service",
    lead: "The single door to the data of this node: tables, media and vectors. Programs talk to it with a key; this page only presents it.",
    doors: "Doors",
    alive: "Working",
  },
  ru: {
    title: "Служба данных",
    lead: "Единственная дверь к данным этого узла: таблицы, медиа и векторы. Программы говорят с ней по ключу; эта страница только её представляет.",
    doors: "Двери",
    alive: "Работает",
  },
} as const

type Lang = keyof typeof WORDS
const DOORS = ["/health", "/db/tables", "/media", "/vectors/search", "/service/<name>/*"]

export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(WORDS).map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  return { title: WORDS[(lang in WORDS ? lang : "en") as Lang].title }
}

export default async function DataPresentation({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!(lang in WORDS)) notFound()
  const w = WORDS[lang as Lang]
  return (
    <main className="flex flex-1 items-center justify-center bg-background p-6 text-foreground">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-[var(--radius)] border border-border bg-card p-8 text-card-foreground">
        <h1 className="text-2xl font-semibold">{w.title}</h1>
        <p className="text-muted-foreground">{w.lead}</p>
        <p>
          <span className="inline-block rounded-[var(--radius)] bg-primary px-3 py-1 text-sm text-primary-foreground">{w.alive}</span>
        </p>
        <div className="flex flex-col gap-2">
          <p className="font-semibold">{w.doors}</p>
          <ul className="flex flex-col gap-1 text-sm">
            {DOORS.map((d) => (
              <li key={d}>
                <code>{d}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}
