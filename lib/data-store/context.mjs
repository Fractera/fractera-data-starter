// 550: постоянные прежнего `server.js` слоя данных — пути, адреса, ключ модели.
//
// 🔒 КОРЕНЬ — ПАПКА ЭЛЕМЕНТА (`ELEMENT_DIR`), А НЕ `process.cwd()`: собранный сервер Next делает chdir в свою сборку, и
// относительный путь увёл бы базы внутрь `.next-*` — следующая сборка стёрла бы данные (тот же класс, что 260-1 и 549-1).
// Прежний сервер считал пути от своего файла; в папке элемента это тот же адрес.
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const ELEMENT_DIR = process.env.ELEMENT_DIR || process.cwd()

export const PORT = process.env.PORT ?? 3300
export const AUTH_URL = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001'
export const STORAGE_DIR = resolve(ELEMENT_DIR, 'storage')
export const ICONS_DIR = resolve(ELEMENT_DIR, 'icons')
export const MEDIA_DB = resolve(ELEMENT_DIR, 'data/media.db')
export const APP_DB = process.env.APP_DB_PATH ? resolve(ELEMENT_DIR, process.env.APP_DB_PATH) : resolve(ELEMENT_DIR, '../../app/data/products.db')

mkdirSync(resolve(ELEMENT_DIR, 'data'), { recursive: true })

// 626-3: здесь больше нет модели встраиваний и вызова OpenAI: векторы — у элемента vectors (`/vectors/*` пересылается туда), а
// считает их свой элемент узла `embeddings`. Ключ OpenAI ниже остался для голосового ввода и переводов.

/**
 * КЛЮЧ МОДЕЛИ — ИЗ ЕДИНСТВЕННОГО ИСТОЧНИКА (правка владельца 2026-09-03), читается на КАЖДЫЙ вызов, а не при старте:
 * введённый ключ действует со следующего запроса. Источник серверной линии — `.env.local` проекта (`APP_ENV_FILE`);
 * на узле его нет, и ключ берётся из своего окружения.
 */
export const APP_ENV_FILE = process.env.APP_ENV_FILE ?? '/opt/fractera/app/.env.local'

export function openAiKey() {
  try {
    const raw = readFileSync(APP_ENV_FILE, 'utf8')
    const found = (raw.match(/^OPENAI_API_KEY=(.+)$/m) ?? [])[1]
    if (found?.trim()) return found.trim()
  } catch {
    // Файла нет — это чужая машина или разработка: берём своё окружение.
  }
  return process.env.OPENAI_API_KEY ?? ''
}
