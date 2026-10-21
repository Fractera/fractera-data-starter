// 550: база данных узла — та же последовательность дверей, что у прежнего `server.js`: `/health` без ключа → прежние
// адреса медиа и векторов пересылаются соседям (их замок — у них, тот же самый) → только с этой машины → ключ или сессия
// → право по классу → таблицы, журналы, ключ OpenAI, общий ход к службам, `/capabilities`. Маршруты Next
// (`app/<сегмент>/…/route.ts`) отдают сюда запрос целиком.
//
// 🔒 ОДИН ЭКЗЕМПЛЯР НА ПРОЦЕСС (`globalThis`): сборщик кладёт этот модуль в каждый маршрут, и без общей копии каждый
// открыл бы свою базу.
import { createApp, dispatch, listRoutes, forwardTo } from './express-shim.mjs'
import { onlyFromThisMachine, requireAuth, requireCapability, PRIVILEGED_ROLES } from './auth.mjs'
import { EMBED_MODEL, EMBED_DIMS } from './context.mjs'
import { openAppDb, registerDb } from './db.mjs'
import { registerLogs } from './logs.mjs'
import { registerPlatform } from './platform.mjs'

// 🔒 СОСЕДИ — ИЗ ОКРУЖЕНИЯ, КОТОРОЕ ПИШЕТ УЗЕЛ (`STORAGE_URL`, `VECTORS_URL` — правило адресов соседей установщика):
// слой данных не помнит ни их портов, ни их имён.
const STORAGE_URL = process.env.STORAGE_URL ?? ''
const VECTORS_URL = process.env.VECTORS_URL ?? ''

async function build() {
  const app = createApp()

  // ── GET /health — no auth ──
  app.get('/health', (_req, res) => res.json({ ok: true }))

  // 550: медиа и векторы — отдельные элементы узла; прежние адреса здесь отвечают их голосом, и ни один потребитель не
  // меняется (решение владельца 2026-10-21: «data = база данных, старые адреса пересылают»).
  app.forward(/^\/media(\/.*)?$/, forwardTo(STORAGE_URL, 'storage'))
  app.forward(/^\/vectors(\/.*)?$/, forwardTo(VECTORS_URL, 'vectors'))

  app.use(onlyFromThisMachine)
  app.use(requireAuth)
  app.use(requireCapability)

  const appDb = openAppDb()
  registerDb(app, appDb)
  registerLogs(app, appDb)
  const { INTERNAL } = registerPlatform(app)

  // ── GET /capabilities — служба описывает СЕБЯ САМА: список порождается из зарегистрированных маршрутов, ключей нет.
  app.get('/capabilities', (req, res) => {
    res.json({
      service: 'fractera-data',
      generatedAt: new Date().toISOString(),
      auth: {
        machine: { header: 'x-data-secret', identity: 'x-agent-identity (optional)' },
        human: { cookie: true, requiredRoles: [...PRIVILEGED_ROLES] },
      },
      classes: {
        schema: {
          requires: 'machine secret',
          routes: ['POST /db/migrate', 'DELETE /db/tables/:table'],
          note: 'arbitrary SQL: DDL, SELECT with params, writes',
        },
        data: { requires: 'machine secret or a privileged role', routes: 'everything else below' },
      },
      proxies: Object.keys(INTERNAL).map(name => ({
        prefix: `/service/${name}/*`,
        passes: 'any method, any subpath',
      })),
      // 550: где теперь живут медиа и векторы — прежние адреса здесь пересылают туда.
      moved: { '/media/*': 'storage element', '/vectors/*': 'vectors element' },
      vectors: { model: EMBED_MODEL, dims: EMBED_DIMS },
      limits: { uploadBytes: 200 * 1024 * 1024 },
      routes: listRoutes(app),
    })
  })

  return app
}

export function dataApp() {
  globalThis.__fracteraDataApp ??= build()
  return globalThis.__fracteraDataApp
}

/** Обработчик маршрута Next: весь запрос — в двери слоя данных. */
export async function handle(request) {
  return dispatch(await dataApp(), request)
}
