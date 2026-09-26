import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { HeroCentered } from "@/components/hero-centered"

// СТРАНИЦА-ПРЕЗЕНТАЦИЯ СЛУЖБЫ ДАННЫХ (280-10 → 285-4 на Next). Служба машинная (JSON для программ), поэтому
// страница самая минимальная: что это, какие двери, жива ли. Слова — прежние, из HTML-страницы `presentation.js`.
const WORDS = {
  en: {
    title: "Data service",
    lead: "The single door to the data of this node: tables, media and vectors. Programs talk to it with a key; this page only presents it.",
    doors: "Doors",
    alive: "Working",
    pill: "Agentic engineering infrastructure",
    steps: [
      { title: "One door", text: "Tables, media and vectors behind a single address" },
      { title: "By key", text: "Programs talk to it with the key of the node" },
      { title: "Between services", text: "Services reach each other through one route" },
    ],
  },
  ru: {
    title: "Служба данных",
    lead: "Единственная дверь к данным этого узла: таблицы, медиа и векторы. Программы говорят с ней по ключу; эта страница только её представляет.",
    doors: "Двери",
    alive: "Работает",
    pill: "Инфраструктура агентной инженерии",
    steps: [
      { title: "Одна дверь", text: "Таблицы, медиа и векторы за одним адресом" },
      { title: "По ключу", text: "Программы говорят с ней ключом узла" },
      { title: "Между службами", text: "Службы зовут друг друга одним маршрутом" },
    ],
  },
} as const

type Lang = keyof typeof WORDS
const DOORS = ["/health", "/db/tables", "/media", "/vectors/search", "/service/<name>/*"]

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
    <main className="flex flex-1 flex-col items-center gap-6 bg-background px-6 pb-12 text-foreground">
      {/* Первый экран по центру (304-4); ниже — карточка дверей, как была. */}
      <HeroCentered pill={w.pill} title={w.title} description={w.lead} steps={w.steps} />
      <div className="flex w-full max-w-md flex-col gap-6 rounded-[var(--radius)] border border-border bg-card p-8 text-card-foreground">
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
