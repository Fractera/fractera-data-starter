// 550: журналы узла: развёртывания, разговоры A2A, настройки панели — обработчики прежнего `server.js` слоя данных ДОСЛОВНО (вырезка строк, см. scratchpad gen-store.cjs);
// заменены только сантехника: uuid → randomUUID, multer → uploadSingle, pipe(res) → res.sendStream.
export function registerLogs(app, appDb) {
  // ── DEPLOY HISTORY ────────────────────────────────────────────────────────────
  //
  // Every press of Deploy leaves a row here: what was built, when, how long it took, whether it
  // succeeded, and the full build log. It lives in the data layer rather than in the admin panel's
  // memory for two reasons. It survives restarts and rebuilds of the panel itself, and it is readable
  // by an agent through the same door and the same key as everything else — so "what happened on the
  // last five deploys" is a query, not an investigation.
  //
  // It also replaces a worse mechanism: the deploy route used to record success by making a git commit
  // in the platform repository ON the server. Every press moved the server's history away from the
  // remote, and the next update refused to fast-forward. A log belongs in a log, not in version control.
  //
  // The name is deliberately not `deployment_records` — that table was removed in task 9 and meant
  // something else entirely (servers provisioned by the billing layer). Reusing the name would make two
  // unrelated things look like one.
  appDb.exec(`
    CREATE TABLE IF NOT EXISTS deploy_runs (
      id           TEXT PRIMARY KEY NOT NULL,
      started_at   TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at  TEXT,
      status       TEXT NOT NULL,
      description  TEXT DEFAULT '',
      duration_ms  INTEGER,
      commit_hash  TEXT,
      log          TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS deploy_runs_started_idx ON deploy_runs (started_at DESC);
  `)
  
  // Insert on start, update on finish — the caller owns the id, so a run that never reports a finish
  // stays visible as "running" instead of vanishing. That is the honest record of a build that hung.
  app.post('/deploy-runs', (req, res) => {
    const { id, status, description, commit } = req.body ?? {}
    if (!id || !status) return res.status(400).json({ error: 'id and status are required' })
    appDb.prepare(
      'INSERT OR IGNORE INTO deploy_runs (id, status, description, commit_hash) VALUES (?, ?, ?, ?)'
    ).run(String(id), String(status), String(description ?? ''), commit ? String(commit) : null)
    res.json({ ok: true, id })
  })
  
  app.patch('/deploy-runs/:id', (req, res) => {
    const { status, log, durationMs } = req.body ?? {}
    const row = appDb.prepare('SELECT id FROM deploy_runs WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ error: 'unknown run' })
    appDb.prepare(
      `UPDATE deploy_runs
          SET status      = COALESCE(?, status),
              log         = COALESCE(?, log),
              duration_ms = COALESCE(?, duration_ms),
              finished_at = datetime('now')
        WHERE id = ?`
    ).run(status ?? null, typeof log === 'string' ? log : null, Number.isFinite(durationMs) ? durationMs : null, req.params.id)
    res.json({ ok: true })
  })
  
  // The list never carries the logs: a hundred builds of log text is megabytes nobody asked for. The
  // log is fetched for the one run being opened.
  app.get('/deploy-runs', (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const rows = appDb.prepare(
      `SELECT id, started_at, finished_at, status, description, duration_ms, commit_hash,
              length(log) AS log_size
         FROM deploy_runs ORDER BY started_at DESC LIMIT ?`
    ).all(limit)
    res.json({ runs: rows })
  })
  
  app.get('/deploy-runs/:id', (req, res) => {
    const row = appDb.prepare('SELECT * FROM deploy_runs WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ error: 'unknown run' })
    res.json({ run: row })
  })
  
  // ── A2A CONVERSATION LOG ──────────────────────────────────────────────────────
  //
  // Every agent-to-agent call that reaches an element's A2A endpoint leaves a row here: who called whom, the method and
  // skill, what was asked, what came back, the outcome and how long it took (node step 408). The element hands the record
  // to the core, the core writes it here and shows it as a read-only feed. Refusals are rows too — "the caller never got
  // through" is exactly what the feed has to show.
  //
  // A dedicated door, not `/db/tables`: the feed needs the newest first, rows newer than the last one seen, and a filter by
  // element — the generic door has no order and no column filter.
  //
  // Owner 2026-10-05: «Последние 10 000» — every insert trims the oldest beyond 10 000. Bodies are capped at 8 KB each and
  // keys never enter the table: fields named like a secret are removed before the row is written.
  appDb.exec(`
    CREATE TABLE IF NOT EXISTS a2a_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      from_element  TEXT NOT NULL DEFAULT 'unknown',
      to_element    TEXT NOT NULL,
      method        TEXT,
      skill         TEXT,
      task_id       TEXT,
      context_id    TEXT,
      state         TEXT,
      http_status   INTEGER,
      reason        TEXT,
      duration_ms   INTEGER,
      request       TEXT,
      response      TEXT,
      truncated     INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS a2a_log_from_idx ON a2a_log (from_element, id);
    CREATE INDEX IF NOT EXISTS a2a_log_to_idx ON a2a_log (to_element, id);
  `)
  
  // Conversations an order summary points at are kept (node step 412-5). Owner 2026-10-06, choosing between «the link is
  // temporary» and «conversations with a summary are not pushed out»: «б» — the second. The element that saved the summary pins
  // its conversation; trimming skips pinned conversations. `A2A_LOG_KEEP` in the environment exists for the probe only.
  appDb.exec(`
    CREATE TABLE IF NOT EXISTS a2a_pinned (
      context_id  TEXT PRIMARY KEY,
      at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      by_element  TEXT
    );
  `)
  
  const A2A_LOG_KEEP = Number(process.env.A2A_LOG_KEEP) > 0 ? Number(process.env.A2A_LOG_KEEP) : 10000
  const A2A_BODY_MAX = 8 * 1024
  const A2A_SECRET_KEY = /secret|token|password|api[-_]?key|node[-_]?key|authorization/i
  
  /** Drop every field whose name reads like a secret, at any depth. */
  function withoutSecrets(value, depth = 0) {
    if (depth > 12 || value === null || typeof value !== 'object') return value
    if (Array.isArray(value)) return value.map((v) => withoutSecrets(v, depth + 1))
    const out = {}
    for (const [k, v] of Object.entries(value)) if (!A2A_SECRET_KEY.test(k)) out[k] = withoutSecrets(v, depth + 1)
    return out
  }
  
  /** JSON text of a body, secrets removed, capped at 8 KB. */
  function a2aBody(value) {
    if (value === undefined || value === null) return { text: null, cut: false }
    const text = typeof value === 'string' ? value : JSON.stringify(withoutSecrets(value))
    return text.length > A2A_BODY_MAX ? { text: text.slice(0, A2A_BODY_MAX), cut: true } : { text, cut: false }
  }
  
  const a2aShort = (v, n = 128) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null)
  
  app.post('/a2a-log', (req, res) => {
    const b = req.body ?? {}
    const to = a2aShort(b.to)
    if (!to) return res.status(400).json({ error: 'to (the receiving element) is required' })
    const request = a2aBody(b.request)
    const response = a2aBody(b.response)
    const info = appDb.prepare(
      `INSERT INTO a2a_log (from_element, to_element, method, skill, task_id, context_id, state, http_status, reason,
                            duration_ms, request, response, truncated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      a2aShort(b.from) ?? 'unknown', to, a2aShort(b.method), a2aShort(b.skill), a2aShort(b.taskId), a2aShort(b.contextId),
      a2aShort(b.state), Number.isInteger(b.httpStatus) ? b.httpStatus : null, a2aShort(b.reason),
      Number.isFinite(b.durationMs) ? Math.round(b.durationMs) : null, request.text, response.text,
      request.cut || response.cut ? 1 : 0,
    )
    const id = Number(info.lastInsertRowid)
    appDb.prepare(
      'DELETE FROM a2a_log WHERE id <= ? AND (context_id IS NULL OR context_id NOT IN (SELECT context_id FROM a2a_pinned))'
    ).run(id - A2A_LOG_KEEP)
    res.json({ ok: true, id })
  })
  
  // Pin one conversation: its rows survive trimming (412-5). Idempotent.
  app.post('/a2a-log/pin', (req, res) => {
    const b = req.body ?? {}
    const contextId = a2aShort(b.contextId)
    if (!contextId) return res.status(400).json({ error: 'contextId is required' })
    appDb.prepare('INSERT OR IGNORE INTO a2a_pinned (context_id, by_element) VALUES (?, ?)').run(contextId, a2aShort(b.by))
    const rows = appDb.prepare('SELECT COUNT(*) AS n FROM a2a_log WHERE context_id = ?').get(contextId).n
    res.json({ ok: true, contextId, rows })
  })
  
  // Newest first. `after` = only rows newer than that id (the feed polls with it); `before` = an older page. `element` =
  // rows where it is either side; `pair=a,b` = rows between those two; `task` = one task; `context` = one conversation.
  app.get('/a2a-log', (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200)
    const where = []
    const args = []
    if (Number(req.query.after) > 0) { where.push('id > ?'); args.push(Number(req.query.after)) }
    if (Number(req.query.before) > 0) { where.push('id < ?'); args.push(Number(req.query.before)) }
    const element = a2aShort(req.query.element)
    if (element) { where.push('(from_element = ? OR to_element = ?)'); args.push(element, element) }
    const [a, b] = String(req.query.pair ?? '').split(',').map((s) => s.trim())
    if (a && b) { where.push('((from_element = ? AND to_element = ?) OR (from_element = ? AND to_element = ?))'); args.push(a, b, b, a) }
    const task = a2aShort(req.query.task)
    if (task) { where.push('task_id = ?'); args.push(task) }
    // 412-6: `context` = one conversation (an order summary links to it).
    const context = a2aShort(req.query.context)
    if (context) { where.push('context_id = ?'); args.push(context) }
    const rows = appDb.prepare(
      `SELECT * FROM a2a_log ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT ?`
    ).all(...args, limit)
    res.json({ rows, total: appDb.prepare('SELECT COUNT(*) AS n FROM a2a_log').get().n })
  })
  
  // ── PANEL SETTINGS ────────────────────────────────────────────────────────────
  //
  // Settings that belong to the SERVER rather than to the guest application — today the automatic
  // deployment mode. They live here and not in the slot's PLATFORM-CONFIG, because that file is the
  // guest's own configuration, and not in a file inside a repository, because a deploy checkout
  // overwrites those. Here they survive rebuilds and redeploys, and an agent can read them through the
  // same door and the same key as the deploy history.
  appDb.exec(`
    CREATE TABLE IF NOT EXISTS panel_settings (
      key        TEXT PRIMARY KEY NOT NULL,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
  
  app.get('/panel-settings/:key', (req, res) => {
    const row = appDb.prepare('SELECT value FROM panel_settings WHERE key = ?').get(req.params.key)
    if (!row) return res.json({ value: null })
    try {
      res.json({ value: JSON.parse(row.value) })
    } catch {
      // A value that stopped being JSON is a fault worth seeing, not one to paper over with null.
      res.status(500).json({ error: 'stored value is not valid JSON' })
    }
  })
  
  app.put('/panel-settings/:key', (req, res) => {
    const value = req.body?.value
    if (value === undefined) return res.status(400).json({ error: 'value is required' })
    appDb.prepare(
      `INSERT INTO panel_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).run(req.params.key, JSON.stringify(value))
    res.json({ ok: true })
  })
  
}
