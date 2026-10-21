// 550: ключ OpenAI для всех потребителей и общий ход /service/<имя>/* к службам машины — обработчики прежнего `server.js` слоя данных ДОСЛОВНО (вырезка строк, см. scratchpad gen-store.cjs);
// заменены только сантехника: uuid → randomUUID, multer → uploadSingle, pipe(res) → res.sendStream.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ELEMENT_DIR, APP_ENV_FILE } from './context.mjs'
import { requireAuth } from './auth.mjs'

export function registerPlatform(app) {
  // ── ОДНА ДВЕРЬ ДЛЯ КЛЮЧА OPENAI (шаг 109, 2026-09-04) ────────────────────────
  //
  // ✗ ЧЕМ ОПЛАЧЕНА. Ключ вводится в ТРЁХ местах — панель, экран архитектора, чат, —
  // и каждое писало сама́ по своему списку имён. Они разошлись молча: экран писал
  // графу `OPENAI_API_KEY`, которую LightRAG не читает (он читает
  // `LLM_BINDING_API_KEY` и `EMBEDDING_BINDING_API_KEY`), чат не писал графу вовсе.
  // Плашка зеленела, граф оставался слепым, отказ у него молчаливый.
  //
  // 🔒 ЛЕЧЕНИЕ — НЕ «ПОПРАВИТЬ ТРИ СПИСКА», А УБРАТЬ ДВА. Здесь единственный на всю
  // платформу ответ на вопрос «кто потребляет ключ и какими именами его читает».
  // Три экрана становятся ЗВОНЯЩИМИ.
  //
  // 🔒 ПОЧЕМУ ИМЕННО ЭТА СЛУЖБА, А НЕ СЛОТ И НЕ ПАНЕЛЬ. Гостевой слот в покое ПУСТ
  // и сменяем — писатель, живущий в нём, исчезает вместе с ним. А гостевое
  // приложение не имеет права зависеть от панели в рантайме: с этой зависимостью
  // умирает право владельца уйти. Служба данных есть всегда и уже проверяет секрет.
  //
  // 🔒 ИМЯ ПЕРЕМЕННОЙ ПРИНАДЛЕЖИТ ПОТРЕБИТЕЛЮ. Четвёртый потребитель завтра читает
  // своё имя; список правится ЗДЕСЬ и нигде больше.
  const RAG_ENV_FILE  = process.env.RAG_ENV_PATH  ?? '/opt/fractera/services/rag/.env'
  const DATA_ENV_FILE = process.env.DATA_ENV_PATH ?? resolve(ELEMENT_DIR, '.env.local')
  // Склад секретов машины — тот же путь и та же переменная, что у читателей
  // (`lib/fractera/machine-env.ts` служб 3600 и 3700): два имени одного файла
  // разошлись бы молча (181-4).
  const MACHINE_ENV_FILE = process.env.FRACTERA_MACHINE_ENV ?? '/etc/fractera/secrets.env'
  
  // 🔒 `configured` ОПИСЫВАЕТ СПОСОБНОСТЬ, А НЕ ФАЙЛ, И ЭТО НЕ ПРИДИРКА.
  // Ровно этой подменой был оплачен шаг 107: плашка спрашивала «есть ли строка в
  // файле» вместо «может ли служба работать». У слоя данных порядок поиска ключа
  // ДВОЙНОЙ — `openAiKey()` выше читает файл слота первым и только потом своё
  // окружение. Поэтому у потребителя объявляется не один файл, а ПОРЯДОК ЧТЕНИЯ,
  // и «задан» значит «хотя бы один источник даёт ключ целиком».
  const KEY_CONSUMERS = [
    { id: 'app',   file: APP_ENV_FILE,  vars: ['OPENAI_API_KEY'] },
    {
      id: 'data',
      file: DATA_ENV_FILE,
      vars: ['OPENAI_API_KEY'],
      // Пишем в своё, но признаём и слот: так делает сама служба.
      reads: [{ file: APP_ENV_FILE, vars: ['OPENAI_API_KEY'] }, { file: DATA_ENV_FILE, vars: ['OPENAI_API_KEY'] }],
    },
    { id: 'graph', file: RAG_ENV_FILE,  vars: ['LLM_BINDING_API_KEY', 'EMBEDDING_BINDING_API_KEY'] },
    // 🔒 ЧЕТВЁРТЫЙ ПОТРЕБИТЕЛЬ — СКЛАД СЕКРЕТОВ МАШИНЫ (шаг 181-4, 2026-09-10).
    // Решение владельца: «из любого места всегда создаём одну единственную учётную
    // запись, которой же и обращаемся». ✗ Измерено перед правкой: из этого файла
    // ключ читают служба памяти (`lib/model.mjs`) и сама дверь чата (`readKey()`),
    // а дверь его не писала — ключ, сохранённый с любого экрана, туда не доезжал,
    // и эти двое продолжали видеть прежний. «Единый способ» был единым для трёх
    // читателей из пяти.
    // 🔒 ЭТО ФАЙЛ МАШИНЫ, А НЕ СЛУЖБЫ: он переживает снос любого слота, и именно
    // поэтому самодостаточные службы (3600, 3700) читают ключ отсюда.
    { id: 'machine', file: MACHINE_ENV_FILE, vars: ['OPENAI_API_KEY'] },
  ]
  
  /** Значение переменной из env-файла. `null` — нет файла, нет строки или строка пуста. */
  function envValueOf(file, name) {
    try {
      const raw = readFileSync(file, 'utf8')
      const m = raw.match(new RegExp(`^${name}=(.*)$`, 'm'))
      const v = m?.[1]?.trim()
      return v ? v : null
    } catch {
      return null
    }
  }
  
  /**
   * Записать переменные ПОСТРОЧНО, сохранив всё остальное.
   *
   * 🔒 ФАЙЛ ЦЕЛИКОМ НЕ ПЕРЕПИСЫВАЕТСЯ: рядом лежат пароли, пути и настройки службы,
   * и снимок затёр бы их при каждой правке ключа. Тот же закон, что у писателя
   * `.env.local` в слое архитектора.
   */
  function setEnvVars(file, pairs) {
    if (!existsSync(file)) return { ok: false, reason: 'absent' }
    try {
      let raw = readFileSync(file, 'utf8')
      for (const [name, value] of Object.entries(pairs)) {
        const line = `${name}=${value}`
        const re = new RegExp(`^${name}=.*$`, 'm')
        raw = re.test(raw) ? raw.replace(re, line) : (raw.endsWith('\n') ? raw : raw + '\n') + line + '\n'
      }
      writeFileSync(file, raw, { mode: 0o600 })
      return { ok: true }
    } catch (e) {
      return { ok: false, reason: String(e?.message ?? e) }
    }
  }
  
  /** Состояние: у кого ключ есть. «Задан» = заполнены ВСЕ переменные потребителя. */
  function openAiKeyState() {
    const out = {}
    for (const c of KEY_CONSUMERS) {
      const present = existsSync(c.file)
      // Порядок чтения: объявленный, либо собственный файл как единственный источник.
      const sources = c.reads ?? [{ file: c.file, vars: c.vars }]
      // 🔒 ВНУТРИ ИСТОЧНИКА — `every`: одна из двух у графа это работающая генерация
      // при слепом встраивании, то есть тот же молчаливый отказ.
      // 🔒 МЕЖДУ ИСТОЧНИКАМИ — `some`: служба ищет по очереди и берёт первый годный.
      const configured = sources.some((s) => s.vars.map((n) => envValueOf(s.file, n)).every(Boolean))
      out[c.id] = { present, configured, vars: c.vars }
    }
    return out
  }
  
  app.get('/platform/openai-key', (_req, res) => {
    const state = openAiKeyState()
    const tail = envValueOf(APP_ENV_FILE, 'OPENAI_API_KEY')
    // 🔒 ЗНАЧЕНИЕ НАРУЖУ НЕ ВЫХОДИТ НИКОГДА — только хвост для узнавания.
    res.json({ ok: true, state, tail: tail ? tail.slice(-4) : null })
  })
  
  app.post('/platform/openai-key', (req, res) => {
    const key = String(req.body?.key ?? '').trim()
    if (!key) return res.status(400).json({ error: 'key is required' })
  
    const written = [], failed = [], skipped = []
    for (const c of KEY_CONSUMERS) {
      if (!existsSync(c.file)) { skipped.push(c.id); continue }  // служба не установлена — это НЕ отказ
      const pairs = Object.fromEntries(c.vars.map((n) => [n, key]))
      const r = setEnvVars(c.file, pairs)
      ;(r.ok ? written : failed).push(c.id)
    }
    res.json({ ok: failed.length === 0, written, failed, skipped, state: openAiKeyState() })
  })
  
  // ── ONE DOOR: the loopback services, reachable through this one ───────────────
  //
  // (step 500) A developer working on their own machine gets the project's data
  // from this service — that is what REMOTE_DATA_URL points at. But agentic RAG
  // (:9621), the map (:3400) and the channels (:3500) bind to 127.0.0.1, so a
  // laptop cannot reach them at all, and a locally-run app behaved differently
  // from the deployed one.
  //
  // The choice was to publish three more ports or to route them through the one
  // that is already published and already checks a secret. Three open ports means
  // three things to secure, three URLs in the exported env and three ways to get
  // it wrong. So: one door.
  //
  // These proxies inherit this service's authentication — the same x-data-secret
  // that guards rows and files. Nothing new is exposed to the internet beyond what
  // the secret already unlocks.
  
  // 🔒 ИИ-БРАУЗЕР ВОШЁЛ В ОДНУ ДВЕРЬ (шаг 195-7, 2026-09-14). Решение владельца: «Маршрут слоя данных» — службы
  // обращаются друг к другу только через API, и память зовёт браузер не его портом, а `/service/ai-browser/*`.
  // Адрес по умолчанию стоит здесь, в коде: установщик пишет в `.env` только прежние три адреса, и новому серверу
  // правка установщика не нужна.
  // 🔒 ПАМЯТЬ ВОШЛА В ТУ ЖЕ ДВЕРЬ (шаг памяти 205-5, 2026-09-15). Реестр признаков памяти нужен панели и
  // другим службам: «любым существующим элементом подключаться и извлекать свои собственные элементы
  // реестра признаков» — слово владельца. Ходить туда портом `3700` значило бы завести второй адрес и
  // второй ключ у каждого потребителя; договор тот же, дверь одна.
  const INTERNAL = {
    rag:      process.env.LIGHTRAG_URL ?? 'http://127.0.0.1:9621',
    geo:      process.env.GEO_URL      ?? 'http://127.0.0.1:3400',
    channels: process.env.CHANNELS_URL ?? 'http://127.0.0.1:3500',
    'ai-browser': process.env.AI_BROWSER_URL ?? 'http://127.0.0.1:3800',
    memory:   process.env.MEMORY_URL   ?? 'http://127.0.0.1:3700',
    // 🔒 ПАНЕЛЬ ВОШЛА В ТУ ЖЕ ДВЕРЬ (227-4). Карту микросервисов собирает она — значит её спрашивает
    // каждая служба, и спрашивать обязана здесь: порт `3002` в коде чужой службы означал бы второй
    // адрес и второй ключ у каждого потребителя. Дверь панели читающая, записи снаружи нет.
    panel:    process.env.PANEL_URL    ?? 'http://127.0.0.1:3002',
  }
  const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? ''
  
  // 🔒 ПРЕДЕЛ ОЖИДАНИЯ — ПАРАМЕТР, ПО УМОЛЧАНИЮ ПРЕЖНИЕ 120 С. ИИ-браузер открывает до 10 страниц строго по очереди и
  // сам перезапускает зависший движок — это минуты, а не секунды; общий предел обрывал бы честную работу кодом 503.
  async function proxy(target, extraHeaders, req, res, timeoutMs = 120000) {
    // 🔒 ИМЯ СЛУЖБЫ БЫВАЕТ С ДЕФИСОМ (`ai-browser`). Прежний образец `[a-z]+` отрезал бы только `ai`, и в службу ушёл бы
    // путь `-browser/v1/read`. Для `rag`, `geo`, `channels` новый образец равнозначен прежнему — дефисов в них нет.
    const tail = req.originalUrl.replace(new RegExp('^\\/service\\/[a-z-]+'), '') || '/'
    try {
      const upstream = await fetch(target + tail, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body ?? {}),
        signal: AbortSignal.timeout(timeoutMs),
      })
      // 🔒 ДВОИЧНЫЙ ОТВЕТ ЧИТАЕТСЯ БАЙТАМИ, А НЕ ТЕКСТОМ.
      //
      // ✗ 2026-08-23: здесь стояло `await upstream.text()` для ЛЮБОГО ответа.
      // Текстовый разбор двоичных данных заменяет каждый недопустимый байт
      // символом U+FFFD — и делает это молча: код 200, длина правдоподобная,
      // тип верный. Фотография, прошедшая этот прокси, приезжала мёртвой:
      // первые байты JPEG (FF D8 FF E0) превращались в EF BF BD EF BF BD…,
      // модель отвечала «unsupported image», а файл в медиатеке был мусором.
      //
      // Признак двоичного — заголовок ответа, а не догадка о маршруте: службы
      // отдают файлы разных родов, и перечислять их здесь значило бы гадать.
      const type = upstream.headers.get('content-type') ?? 'application/json'
      const head = type.split(";")[0].trim().toLowerCase()
      const isText =
        head.startsWith("text/") ||
        head === "application/json" ||
        head === "application/xml" ||
        head === "application/javascript"
  
      res.status(upstream.status)
      res.set('Content-Type', type)
      res.set('Cache-Control', 'no-store')
  
      // Свои заголовки службы (например, имя файла) переносим: без них
      // принимающая сторона не знает, ЧТО ей прислали.
      for (const [k, v] of upstream.headers.entries()) {
        if (k.toLowerCase().startsWith('x-')) res.set(k, v)
      }
  
      if (isText) return res.send(await upstream.text())
      return res.send(Buffer.from(await upstream.arrayBuffer()))
    } catch (e) {
      // A loopback service that is switched off is a normal state, not a fault of
      // this one — say which one is silent instead of returning a bare 500.
      res.status(503).json({ error: `${target} did not answer: ${String(e.message ?? e)}` })
    }
  }
  
  app.all(new RegExp('^\\/service\\/rag(\\/.*)?$'), requireAuth, (req, res) =>
    proxy(INTERNAL.rag, { 'X-API-Key': RAG_KEY }, req, res))
  
  app.all(new RegExp('^\\/service\\/geo(\\/.*)?$'), requireAuth, (req, res) =>
    proxy(INTERNAL.geo, {}, req, res))
  
  app.all(new RegExp('^\\/service\\/channels(\\/.*)?$'), requireAuth, (req, res) =>
    proxy(INTERNAL.channels, {}, req, res))
  
  // 🔒 СЕКРЕТ МАШИНЫ БРАУЗЕРУ ПОДСТАВЛЯЕТ СЛОЙ ДАННЫХ САМ: прокси не переносит входящие заголовки, а замок `/v1/*`
  // ИИ-браузера пускает свои процессы по `x-data-secret` (его `server.mjs`). Тот же приём, что ключ графа выше.
  // 🛑 ПРЕДЕЛ 600 С, А НЕ ОБЩИЕ 120: десять страниц по очереди плюс самолечение движка (шаг 196-8).
  app.all(new RegExp('^\\/service\\/ai-browser(\\/.*)?$'), requireAuth, (req, res) =>
    proxy(INTERNAL['ai-browser'], { 'x-data-secret': process.env.DATA_SECRET ?? '' }, req, res, 600000))
  
  // 🔒 СЕКРЕТ МАШИНЫ ПАМЯТИ ПОДСТАВЛЯЕТ СЛОЙ ДАННЫХ САМ — тот же приём, что у графа и браузера: прокси не
  // переносит входящие заголовки, а `/v1/*` памяти пускает свои процессы по `x-data-secret`. Ключ памяти
  // (`fmk_…`) остаётся тем, чем он и задуман: пропуском для ЧУЖИХ инструментов снаружи.
  // 🛑 ПРЕДЕЛ 300 С, А НЕ ОБЩИЕ 120: собственный предел разбора внутри памяти — 120 000 мс на ОДИН вызов
  // модели (`MEMORY_THINK_TIMEOUT_MS`), и общий предел обрывал бы честную работу ровно на её границе —
  // отказ выглядел бы как молчание памяти, а не как её же таймаут.
  app.all(new RegExp('^\\/service\\/memory(\\/.*)?$'), requireAuth, (req, res) =>
    proxy(INTERNAL.memory, { 'x-data-secret': process.env.DATA_SECRET ?? '' }, req, res, 300000))
  
  // 🔒 227-4: КАРТА МИКРОСЕРВИСОВ У ПАНЕЛИ. Секрет машины уезжает заголовком — по нему панель отличает
  // свою службу от человека с кукой и от чужого. Замок на входе тот же, что у соседей: `requireAuth`
  // слоя данных; дверь панели за ним ещё раз проверяет, кто спрашивает.
  app.all(new RegExp('^\\/service\\/panel(\\/.*)?$'), requireAuth, (req, res) =>
    proxy(INTERNAL.panel, { 'x-data-secret': process.env.DATA_SECRET ?? '' }, req, res))
  
  
  return { INTERNAL }
}
