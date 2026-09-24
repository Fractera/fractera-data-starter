// СТАНДАРТНЫЙ ФУТЕР ПРОЕКТА ДЛЯ СЛУЖБ НА EXPRESS — готовое решение узла Fractera (шаг 283-3). Мастер-копия:
// `kits/footer/master/` узла; ставится командой `npm run footer-kit:add -- <папка службы> --express`.
//
// Страницы подвала — те же, что у сайта: поле `footer` двери `PROJECT_MENU_URL/<язык>` (пусто, пока
// архитектор их не включил), ссылки ведут на страницы сайта по `PROJECT_SITE_URL`. Читается раз в минуту и
// держится в памяти. Сайт не ответил — футер рисует одну строку с именем проекта.

const cache = new Map()
// Имя проекта — поле `brand` той же двери (сайт v1.5.0+); аргумент `brand` рендера — запасной.
const brands = new Map()
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const WORDS = {
  en: { pages: 'Footer pages', rights: 'All rights reserved.' },
  ru: { pages: 'Страницы футера', rights: 'Все права защищены.' },
}

export async function loadProjectFooter(lang) {
  const hit = cache.get(lang)
  if (hit && Date.now() - hit.at < 60000) return hit.footer
  const base = process.env.PROJECT_MENU_URL
  let footer = []
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/${lang}`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.footer)) footer = data.footer
        if (typeof data.brand === 'string') brands.set(lang, data.brand)
      }
    } catch { /* сайт не ответил */ }
  }
  cache.set(lang, { at: Date.now(), footer })
  return footer
}

export function renderProjectFooter(groups, lang, fallback = '') {
  const brand = brands.get(lang) || fallback
  const site = String(process.env.PROJECT_SITE_URL || '').replace(/\/+$/, '')
  const abs = (p) => (/^https?:\/\//.test(p) ? p : `${site}/${lang}${p}`)
  const w = WORDS[lang] || WORDS.en
  const pages = groups.length
    ? `<div class="pf-pages"><p class="pf-title">${esc(w.pages)}</p><nav class="pf-nav">${groups
        .map((g) => `<a class="pf-link" href="${esc(abs(g.href || `/${g.slug}`))}">${esc(g.label)}</a>`)
        .join('')}</nav></div>`
    : ''
  return `<footer class="pf">${pages}<p class="pf-copy">© ${new Date().getFullYear()}${brand ? ` ${esc(brand)}` : ''}. ${esc(w.rights)}</p></footer>`
}

/** Стили футера — на токенах оформления узла (`--background`, `--foreground`, `--border`, `--muted-foreground`, `--primary`). */
export const PROJECT_FOOTER_CSS = `
.pf{margin-top:auto;display:flex;flex-direction:column;gap:1.5rem;padding:1.5rem;border-top:1px solid var(--border);background:var(--background);color:var(--foreground)}
.pf-pages{display:flex;flex-direction:column;gap:.75rem}
.pf-title{margin:0;font-family:ui-monospace,monospace;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted-foreground)}
.pf-nav{display:flex;flex-wrap:wrap;gap:.5rem 1.5rem;font-size:.875rem;font-weight:500}
.pf-link{color:var(--foreground);text-decoration:none}
.pf-link:hover{color:var(--primary)}
.pf-copy{margin:0;font-size:.875rem}
`
