// 550: база данных: таблицы и произвольный SQL — обработчики прежнего `server.js` слоя данных ДОСЛОВНО (вырезка строк, см. scratchpad gen-store.cjs);
// заменены только сантехника: uuid → randomUUID, multer → uploadSingle, pipe(res) → res.sendStream.
import Database from 'better-sqlite3'
import { APP_DB } from './context.mjs'

export function openAppDb() {
  const appDb = new Database(APP_DB)
  appDb.pragma('journal_mode = WAL')
  appDb.pragma('foreign_keys = ON')
  
  // 🪦 ЗДЕСЬ ПЛАТФОРМА СОЗДАВАЛА ТАБЛИЦУ `products` — УДАЛЕНО 2026-08-18.
  //
  // 🔒 ЧТО ЭТО СЛОМАЛО. Форма таблицы была здешней и старой: без `description`, без
  // `i18n`, без размеров картинки. Гостевое приложение объявляет свою — полную, — но
  // объявляет через `CREATE TABLE IF NOT EXISTS`, а к тому времени таблица уже
  // существовала, и объявление молча не делало ничего. Пока приложение писало в
  // собственный файл, расхождение спало. Как только оно пошло в слой данных
  // (`4c21090`, 2026-08-17), КАЖДЫЙ запрос каталога стал получать
  // `no such column: description`, и развёртывание нового сервера не завершилось.
  //
  // 🔒 ПОЧЕМУ УДАЛЕНО, А НЕ ДОПОЛНЕНО КОЛОНКАМИ. Дописать сюда `description` значило
  // бы завести ВТОРОГО хозяина формы таблицы: два места, где живёт правда о товарах,
  // расходятся молча и по определению. Правило продукта давнее: новые таблицы
  // объявляет гостевое приложение в `SCHEMA` (`lib/db/index.ts`), а слой данных их
  // исполняет и хранит. Товары — таблица гостя, платформа их не читает и не пишет:
  // после удаления этого блока слово `products` в службе не встречается вовсе.
  //
  // Что при этом ничего не ломает: таблица рождается при подготовке схемы, которую
  // приложение выполняет на старте и на сборке; на уже живущих серверах она никуда
  // не девается, а недостающие колонки доедут лестницей `LATE_COLUMNS`.
  
  return appDb
}

export function registerDb(app, appDb) {
  // ── GET /db/tables ────────────────────────────────────────────────────────────
  
  app.get('/db/tables', (_req, res) => {
    const rows = appDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all()
    res.json({ tables: rows.map(r => r.name) })
  })
  
  // ── GET /db/tables/:table ─────────────────────────────────────────────────────
  
  // 🔒 СЕКРЕТНЫЕ КОЛОНКИ НЕ ПОКИДАЮТ БАЗУ (2026-08-21, найдено живой проверкой).
  //
  // `/db/tables/users?limit=1` отдавал строку ЦЕЛИКОМ, включая `password` — bcrypt-хеш
  // учётной записи. Дверь защищена секретом `DATA_SECRET`, и в этом смысле «утечки»
  // не было; но секрет знает всё приложение и всякий, кто получил его выгрузкой
  // окружения, а хеш пароля не нужен приложению НИКОГДА — ни показать, ни сверить
  // (сверяет служба авторизации, у неё свой путь к базе).
  //
  // Хеш, покинувший базу, дальше живёт в журналах, в ответах, в снимках экрана и в
  // контексте агента — то есть в местах, откуда его уже не изъять. Поэтому дверь
  // вырезает такие колонки на выходе, а не полагается на дисциплину вызывающего.
  //
  // Список ведётся по ИМЕНИ колонки, а не по имени таблицы: завтра `password_reset_token`
  // появится в другой таблице, и правило обязано сработать там само.
  const SECRET_COLUMNS = new Set([
    'password',
    'password_hash',
    'session_token',
    'refresh_token',
    'access_token',
    'id_token',
    'verification_token',
    'totp_secret',
  ])
  
  app.get('/db/tables/:table', (req, res) => {
    const { table } = req.params
    const validTables = new Set(
      appDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name)
    )
    if (!validTables.has(table)) return res.status(404).json({ error: 'Table not found' })
  
    const search = req.query.search ?? ''
    const limit  = Math.min(parseInt(req.query.limit ?? '500'), 1000)
    const offset = parseInt(req.query.offset ?? '0')
  
    const allColumns = appDb.prepare(`PRAGMA table_info("${table}")`).all().map(c => c.name)
    // Колонки-секреты не попадают ни в выборку, ни в перечень: вызывающий не должен
    // даже узнать их имена — по имени угадывается способ атаки.
    const columns = allColumns.filter(c => !SECRET_COLUMNS.has(c))
    const select = columns.length ? columns.map(c => `"${c}"`).join(', ') : '*'
  
    let rows
    if (search.trim()) {
      // Поиск идёт по тем же видимым колонкам: искать ПО хешу пароля бессмысленно,
      // а возможность подобрать его посимвольным LIKE — нет.
      const textCols   = columns.filter(c => c !== 'id')
      const conditions = textCols.length ? textCols.map(c => `"${c}" LIKE ?`).join(' OR ') : null
      rows = conditions
        ? appDb.prepare(`SELECT ${select} FROM "${table}" WHERE ${conditions} LIMIT ? OFFSET ?`).all(...textCols.map(() => `%${search}%`), limit, offset)
        : appDb.prepare(`SELECT ${select} FROM "${table}" LIMIT ? OFFSET ?`).all(limit, offset)
    } else {
      rows = appDb.prepare(`SELECT ${select} FROM "${table}" LIMIT ? OFFSET ?`).all(limit, offset)
    }
  
    const total = appDb.prepare(`SELECT COUNT(*) as n FROM "${table}"`).get().n
    res.json({ columns, rows, total })
  })
  
  // ── POST /db/tables/:table — insert row ──────────────────────────────────────
  
  app.post('/db/tables/:table', (req, res) => {
    const { table } = req.params
    const validTables = new Set(
      appDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name)
    )
    if (!validTables.has(table)) return res.status(404).json({ error: 'Table not found' })
  
    const body = req.body
    if (!body || typeof body !== 'object' || Object.keys(body).length === 0)
      return res.status(400).json({ error: 'Body must be a non-empty object' })
  
    const validCols = new Set(appDb.prepare(`PRAGMA table_info("${table}")`).all().map(c => c.name))
    const cols = Object.keys(body).filter(k => validCols.has(k))
    if (cols.length === 0) return res.status(400).json({ error: 'No valid columns provided' })
  
    appDb.prepare(
      `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
    ).run(...cols.map(c => body[c]))
    res.json({ ok: true })
  })
  
  // ── PATCH /db/tables/:table/rows/:id — правка одной строки ───────────────────
  //
  // 🔒 ЗАЧЕМ ОН ПОНАДОБИЛСЯ (2026-08-13). Слой данных умел СОЗДАВАТЬ строку и
  // УРОНИТЬ таблицу целиком, а изменить одну строку — нет. Пробел вскрылся на
  // простой задаче: привязать посевные товары к картинкам, уже лежащим в
  // хранилище. Хранилище правильное, строка товара правильная, а соединить их
  // нечем — оставалось либо пересоздавать товары, теряя всё, что владелец о них
  // написал, либо лезть в базу мимо службы.
  //
  // Правила ровно те же, что у вставки рядом, и это не совпадение: разойдись они —
  // и через месяц одна дверь пускала бы туда, куда другая не пускает. Таблица
  // сверяется со списком существующих, колонки — с настоящей схемой таблицы, всё
  // прочее из тела молча отбрасывается.
  //
  // `id` — единственный поддерживаемый ключ. Правка по произвольному условию — это
  // уже язык запросов через HTTP, и её здесь не будет: одна опечатка в условии
  // меняет всю таблицу, а не строку.
  app.patch('/db/tables/:table/rows/:id', (req, res) => {
    const { table, id } = req.params
    const validTables = new Set(
      appDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name)
    )
    if (!validTables.has(table)) return res.status(404).json({ error: 'Table not found' })
  
    const body = req.body
    if (!body || typeof body !== 'object' || Object.keys(body).length === 0)
      return res.status(400).json({ error: 'Body must be a non-empty object' })
  
    const validCols = new Set(appDb.prepare(`PRAGMA table_info("${table}")`).all().map(c => c.name))
    // `id` не правим даже по просьбе: смена ключа — это другая строка, а не
    // изменение этой, и все ссылки на неё осиротели бы молча.
    const cols = Object.keys(body).filter(k => validCols.has(k) && k !== 'id')
    if (cols.length === 0) return res.status(400).json({ error: 'No valid columns provided' })
    if (!validCols.has('id')) return res.status(400).json({ error: 'Table has no id column' })
  
    const info = appDb.prepare(
      `UPDATE "${table}" SET ${cols.map(c => `"${c}" = ?`).join(', ')} WHERE "id" = ?`
    ).run(...cols.map(c => body[c]), id)
  
    if (info.changes === 0) return res.status(404).json({ error: 'Row not found' })
    res.json({ ok: true, changed: info.changes })
  })
  
  // ── DELETE /db/tables/:table — drop table ────────────────────────────────────
  
  app.delete('/db/tables/:table', (req, res) => {
    const { table } = req.params
    const validTables = new Set(
      appDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name)
    )
    if (!validTables.has(table)) return res.status(404).json({ error: 'Table not found' })
  
    appDb.prepare(`DROP TABLE "${table}"`).run()
    res.json({ ok: true })
  })
  
  // ── POST /db/migrate — execute arbitrary SQL ──────────────────────────────────
  
  app.post('/db/migrate', (req, res) => {
    const { sql, params = [] } = req.body
    if (!sql || typeof sql !== 'string' || !sql.trim())
      return res.status(400).json({ error: 'sql field is required' })
  
    try {
      const upper = sql.trim().toUpperCase()
      const isDDL = upper.startsWith('CREATE') || upper.startsWith('ALTER') ||
                    upper.startsWith('DROP')   || upper.startsWith('PRAGMA')
      if (isDDL) {
        appDb.exec(sql)
        return res.json({ ok: true })
      }
      const stmt = appDb.prepare(sql)
      if (upper.startsWith('SELECT')) {
        const rows = params.length ? stmt.all(...params) : stmt.all()
        return res.json({ ok: true, rows })
      }
      const result = params.length ? stmt.run(...params) : stmt.run()
      res.json({ ok: true, changes: result.changes, lastInsertRowid: result.lastInsertRowid })
    } catch (e) {
      res.status(500).json({ error: String(e) })
    }
  })
  
}
