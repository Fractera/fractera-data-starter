// СТАНДАРТНЫЙ ХЕДЕР ПРОЕКТА ДЛЯ СЛУЖБ НА EXPRESS — готовое решение узла Fractera (шаг 283-2). Мастер-копия:
// `kits/header/master/` узла; ставится командой `npm run header-kit:add -- <папка службы> --express`.
//
// То же меню, что у сайта и всех служб узла: берётся у двери `PROJECT_MENU_URL/<язык>`, ссылки ведут на
// `PROJECT_SITE_URL`. Меню читается раз в минуту и держится в памяти — страница не ждёт сайт на каждом
// запросе. Сайт не ответил — хедер рисует одно имя проекта.

const cache = new Map()
// Имя проекта — поле `brand` той же двери (сайт v1.5.0+); аргумент `brand` рендера — запасной.
const brands = new Map()
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

export async function loadProjectMenu(lang) {
  const hit = cache.get(lang)
  if (hit && Date.now() - hit.at < 60000) return hit.top
  const base = process.env.PROJECT_MENU_URL
  let top = []
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/${lang}`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.top)) top = data.top
        if (typeof data.brand === 'string') brands.set(lang, data.brand)
      }
    } catch { /* сайт не ответил */ }
  }
  cache.set(lang, { at: Date.now(), top })
  return top
}

export function renderProjectHeader(groups, lang, fallback = '') {
  const brand = brands.get(lang) || fallback
  const site = String(process.env.PROJECT_SITE_URL || '').replace(/\/+$/, '')
  const abs = (p) => (/^https?:\/\//.test(p) ? p : `${site}/${lang}${p}`)
  const items = groups.map((g) => {
    if (g.inert) return `<span class="ph-item ph-inert" aria-disabled="true">${esc(g.label)}</span>`
    const href = abs(g.href || `/${g.slug}`)
    if (!g.children || g.children.length === 0) return `<a class="ph-item" href="${esc(href)}">${esc(g.label)}</a>`
    const kids = g.children.map((c) => `<a class="ph-item" href="${esc(abs(c.href || `${g.href || `/${g.slug}`}/${c.slug}`))}">${esc(c.title)}</a>`).join('')
    return `<details class="ph-group"><summary class="ph-item">${esc(g.label)}</summary><div class="ph-drop">${kids}</div></details>`
  }).join('')
  const home = brand ? `<a class="ph-brand" href="${esc(site ? `${site}/${lang}` : '/')}">${esc(brand)}</a>` : ''
  return `<header class="ph">${home}<nav class="ph-nav">${items}</nav></header>`
}

/** Стили хедера — на токенах оформления узла (`--background`, `--foreground`, `--border`, `--muted`, `--radius`). */
export const PROJECT_HEADER_CSS = `
.ph{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:1rem;height:3.5rem;padding:0 1.5rem;border-bottom:1px solid var(--border);background:var(--background)}
.ph-brand{font-weight:600;color:var(--foreground);text-decoration:none}
.ph-nav{display:flex;flex-wrap:wrap;align-items:center;gap:.25rem;font-size:.875rem}
.ph-item{padding:.375rem .75rem;border-radius:.375rem;color:var(--foreground);text-decoration:none;cursor:pointer;list-style:none}
.ph-item:hover{background:var(--muted)}
.ph-inert{opacity:.6;cursor:default}
.ph-group{position:relative}
.ph-drop{position:absolute;left:0;top:100%;margin-top:.25rem;display:flex;flex-direction:column;min-width:12rem;padding:.25rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--background)}
`
