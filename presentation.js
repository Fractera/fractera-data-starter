// СТРАНИЦА-ПРЕЗЕНТАЦИЯ И ДВЕРЬ НАСТРОЕК СЛУЖБЫ ДАННЫХ (узел Fractera; 280-10, на Next — 285-4).
//
// Решение владельца 2026-09-24: «Страница данных переезжает на Next и получает ту же оболочку, что у остальных».
// Страницу (`/`, `/en`, `/ru`) рисует приложение Next из папки `presentation/` — с оболочкой проекта (шапка и
// подвал сайта, копия байт в байт). 🔒 Next живёт ВНУТРИ этого процесса: один процесс и один порт, как у любого
// элемента узла; двери данных ниже не тронуты. Сборка — `npm run build` (`scripts/build-presentation.mjs`):
// Next собирается в соседнюю папку, а метка `.presentation-dist` называет, какую сборку отдавать при старте.
// Нет сборки — страница отвечает 503 со словами «не собрано», а двери данных работают.
//
// 🔒 НАСТРОЙКИ ПРИНАДЛЕЖАТ СЛУЖБЕ, ЯДРО ДОТЯГИВАЕТСЯ. `DESIGN-CONFIG/design-config.json` пишет только дверь
// `/api/settings/design` (ключ `SETTINGS_SECRET`); страница читает его на сборке — правка видна после развёртывания.
// 🛑 Путь — из `DESIGN_CONFIG_PATH` (абсолютный, выдаёт установщик).

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, unlinkSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { timingSafeEqual } from 'crypto'
import next from 'next'

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)

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

  // ── Страница на Next (285-4) ──────────────────────────────────────────────
  const distMarker = join(serviceDir, '.presentation-dist')
  const dist = existsSync(distMarker) ? readFileSync(distMarker, 'utf8').trim() : '.next'
  // Next читает `presentation/next.config.ts`, а тот — папку сборки из NEXT_DIST_DIR (✗ аргумент `conf.distDir` он
  // проигнорировал — измерено). Поэтому переменная выставляется по метке до создания Next.
  process.env.NEXT_DIST_DIR = dist
  const nextApp = next({ dev: false, dir: resolve(serviceDir, 'presentation') })
  const ready = nextApp
    .prepare()
    .then(() => nextApp.getRequestHandler())
    .catch((err) => {
      console.warn(`[presentation] страница не собрана (${dist}): ${err instanceof Error ? err.message : err} — npm run build`)
      return null
    })
  const page = async (req, res) => {
    const handle = await ready
    if (!handle) return res.status(503).type('text').send('presentation is not built: npm run build')
    return handle(req, res)
  }
  app.get('/', (_req, res) => res.redirect(302, '/en'))
  // 308: сигнал CONFIG «версия сменилась» — маршрут страницы (перерисовка без пересборки); ключ проверяет сама страница.
  app.post('/api/settings/changed', page)
  app.get(['/:lang(en|ru)', '/_next/*', '/fonts/*'], page) // 315: шрифты своего сервера

  // ── Кто вошёл — для оболочки страницы (285-4) ───────────────────────────
  // Та же служба входа и тот же cookie проекта, что у двери данных ниже (`requireAuth`); без ключа данных:
  // оболочке нужно знать только, показывать ли «Войти» или «Личный кабинет».
  const authUrl = process.env.AUTH_SERVICE_URL ?? ''
  app.get('/api/me', async (req, res) => {
    if (!authUrl) return res.status(401).json({ error: 'Unauthorized' })
    try {
      const r = await fetch(`${authUrl}/api/session`, { headers: { cookie: req.headers.cookie ?? '' }, signal: AbortSignal.timeout(5000) })
      if (!r.ok) return res.status(401).json({ error: 'Unauthorized' })
      res.json(await r.json())
    } catch {
      res.status(503).json({ error: 'Auth service unavailable' })
    }
  })

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
    const merged = merge(readDesign(), req.body)
    const tmp = join(dirname(path), `.design-config.${process.pid}.${Date.now()}.tmp`)
    try {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(tmp, JSON.stringify(merged, null, 2) + '\n', 'utf8')
      renameSync(tmp, path)
      // 285-4: страница читает оформление на сборке — правка видна после развёртывания службы.
      res.json({ ok: true, config: merged, rebuildNeeded: true })
    } catch {
      if (existsSync(tmp)) try { unlinkSync(tmp) } catch { /* уже нет */ }
      res.status(500).json({ ok: false, reason: 'write-failed' })
    }
  })
}
