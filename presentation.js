// СТРАНИЦА-ПРЕЗЕНТАЦИЯ И ДВЕРЬ НАСТРОЕК СЛУЖБЫ ДАННЫХ (узел Fractera, шаг 280-10).
//
// Слово владельца 2026-09-24: у входа и данных должна существовать страница-презентация, чтобы из ядра
// смотреть их содержимое и видеть, как к ним применяется оформление узла. Служба — машинная (JSON для
// программ), поэтому страница самая минимальная: что это, какие двери, жива ли.
//
// 🔒 НАСТРОЙКИ ПРИНАДЛЕЖАТ СЛУЖБЕ, ЯДРО ДОТЯГИВАЕТСЯ. `DESIGN-CONFIG/design-config.json` пишет только
// дверь `/api/settings/design` (ключ `SETTINGS_SECRET`, установщик кладёт его в оба конца). Страница
// читает файл НА КАЖДЫЙ ЗАПРОС: сборки у службы нет, и правка видна сразу.
// 🛑 Путь — из `DESIGN_CONFIG_PATH` (абсолютный, выдаёт установщик).

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, unlinkSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { timingSafeEqual } from 'crypto'
// 283-4: хедер и футер проекта — готовые решения узла (ставятся `header-kit:add`/`footer-kit:add --express`,
// руками не править). Меню, страницы подвала и имя проекта — у двери сайта, раз в минуту.
import { loadProjectMenu, renderProjectHeader, PROJECT_HEADER_CSS } from './project-header.mjs'
import { loadProjectFooter, renderProjectFooter, PROJECT_FOOTER_CSS } from './project-footer.mjs'

const WORDS = {
  en: {
    title: 'Data service',
    lead: 'The single door to the data of this node: tables, media and vectors. Programs talk to it with a key; this page only presents it.',
    doors: 'Doors',
    alive: 'Working',
  },
  ru: {
    title: 'Служба данных',
    lead: 'Единственная дверь к данным этого узла: таблицы, медиа и векторы. Программы говорят с ней по ключу; эта страница только её представляет.',
    doors: 'Двери',
    alive: 'Работает',
  },
}

const DOORS = ['/health', '/db/tables', '/media', '/vectors/search', '/service/<name>/*']

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)
const safe = (v) => typeof v === 'string' && /^[#(),.%\w\s-]{1,64}$/.test(v)

export function mountPresentation(app, serviceDir) {
  const designPath = () => process.env.DESIGN_CONFIG_PATH || resolve(serviceDir, 'DESIGN-CONFIG', 'design-config.json')

  const readDesign = () => {
    try {
      const parsed = JSON.parse(readFileSync(designPath(), 'utf8'))
      return isObj(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }

  const vars = (map) =>
    Object.entries(isObj(map) ? map : {})
      .filter(([k, v]) => /^[a-z-]{1,32}$/.test(k) && safe(v))
      .map(([k, v]) => `--${k}: ${v};`)
      .join(' ')

  const page = async (lang) => {
    const w = WORDS[lang] || WORDS.en
    const [menu, footer] = await Promise.all([loadProjectMenu(lang), loadProjectFooter(lang)])
    const d = readDesign()
    const body = isObj(d.fonts) && isObj(d.fonts.body) ? d.fonts.body : null
    const font = body && safe(body.family) ? `font-family: '${body.family}', system-ui, sans-serif;` : ''
    const link = body && typeof body.import === 'string' && /^https:\/\/fonts\.googleapis\.com\//.test(body.import)
      ? `<link rel="stylesheet" href="${body.import}">` : ''
    const radius = isObj(d.shape) && safe(d.shape.radius) ? `--radius: ${d.shape.radius};` : ''
    const light = isObj(d.colors) ? vars(d.colors.light) : ''
    const dark = isObj(d.colors) ? vars(d.colors.dark) : ''
    return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${w.title}</title>${link}
<style>
:root{--background:#ffffff;--foreground:#0f172a;--primary:#0f172a;--muted:#f1f5f9;--muted-foreground:#64748b;--border:#e2e8f0;--radius:0.625rem;${light}${radius}}
@media (prefers-color-scheme: dark){:root{--background:#0b1220;--foreground:#e2e8f0;--primary:#e2e8f0;--muted:#1e293b;--muted-foreground:#94a3b8;--border:#334155;${dark}}}
body{margin:0;min-height:100vh;display:flex;flex-direction:column;background:var(--background);color:var(--foreground);${font}}
.stage{flex:1;display:flex;align-items:center;justify-content:center}
main{max-width:30rem;margin:1.5rem;padding:2rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--muted)}
${PROJECT_HEADER_CSS}${PROJECT_FOOTER_CSS}
h1{margin:0 0 .75rem;font-size:1.5rem}p{opacity:.8;line-height:1.5}
.badge{display:inline-block;padding:.25rem .75rem;border-radius:var(--radius);background:var(--primary);color:var(--background);font-size:.875rem}
code{font-size:.875rem}
</style></head><body>${renderProjectHeader(menu, lang)}<div class="stage"><main>
<h1>${w.title}</h1><p>${w.lead}</p><p><span class="badge">${w.alive}</span></p>
<p><strong>${w.doors}</strong></p><ul>${DOORS.map((x) => `<li><code>${x}</code></li>`).join('')}</ul>
</main></div>${renderProjectFooter(footer, lang)}</body></html>`
  }

  app.get('/', async (_req, res) => res.type('html').send(await page('en')))
  app.get('/:lang(en|ru)', async (req, res) => res.type('html').send(await page(req.params.lang)))

  const keyOk = (req) => {
    const expected = process.env.SETTINGS_SECRET || ''
    const given = String(req.headers['x-settings-key'] || '')
    return !!expected && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  }
  const merge = (base, patch) => {
    const out = isObj(base) ? { ...base } : {}
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) delete out[k]
      else out[k] = isObj(v) ? merge(out[k], v) : v
    }
    return out
  }

  app.get('/api/settings/design', (req, res) => {
    if (!keyOk(req)) return res.status(401).json({ ok: false, reason: 'bad-key' })
    res.json({ ok: true, config: readDesign() })
  })
  app.patch('/api/settings/design', (req, res) => {
    if (!keyOk(req)) return res.status(401).json({ ok: false, reason: 'bad-key' })
    if (!isObj(req.body)) return res.status(400).json({ ok: false, reason: 'bad-body' })
    const path = designPath()
    const next = merge(readDesign(), req.body)
    const tmp = join(dirname(path), `.design-config.${process.pid}.${Date.now()}.tmp`)
    try {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(tmp, JSON.stringify(next, null, 2) + '\n', 'utf8')
      renameSync(tmp, path)
      res.json({ ok: true, config: next, rebuildNeeded: false })
    } catch {
      if (existsSync(tmp)) try { unlinkSync(tmp) } catch { /* уже нет */ }
      res.status(500).json({ ok: false, reason: 'write-failed' })
    }
  })
}
