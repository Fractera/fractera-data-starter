# fractera-data — the database of a Fractera node

A native element of the node, built on the Fractera native element template. It is the one element that opens the node's
database file; every other element reads and writes tables through its doors.

Until step 550 this element was the whole data layer (an Express server): tables, media and vectors in one process. The owner
split it on 2026-10-21 into native elements: **data** (this one, the database), **storage** (files and images) and **vectors**
(search by meaning); the knowledge graph is the **graph** element. The former addresses `/media/*` and `/vectors/*` still answer
here: the request is passed to the storage or vectors element as it is, and the answer comes back unchanged.

## In the Fractera project

The node's database: tables and journals of every element. It is the one element that opens the database file; every other element reads and writes through its doors, and files and vectors reach the storage and vectors elements through it.

You can change it. The code is open under the MIT license and the copy on your node is yours. The node installs this element from
this repository by the tag written in `WEB4-ITEMS-REGISTRY/web4-items.json` of the core; the core does not let you delete a built-in
element or move its address.

To change it, open it in the core (left menu, Native items, Database), go to Build and tell its agent in the terminal what you need.
The agent edits the element folder `WEB4-ITEMS/core/data` and commits. Its backup is set up in Backup of the same element.

The change goes live when you press Deploy in Build, Deployments: the element is rebuilt beside the running one and switched over in
seconds. Other elements call its doors by address, request and answer, so a change to a door breaks every element that uses it;
that is a decision for the node owner, while a change inside the element is ordinary work. To keep your version when the node is
reinstalled, save the element to your own GitHub repository in Build, GitHub. A newer Fractera version arrives through Update, which
merges it with your commits, and the element's agent resolves a conflict.

## Doors

Every door but `/health` needs the node data key (`X-Data-Secret`, the installer writes the same `DATA_SECRET` to every element)
or a privileged session (architect, admin, agent) checked by the node's auth element. A request that came through the Cloudflare
tunnel (`cf-ray` header) gets 404 on every data door, with a key or without: data never leaves this machine.

| Door | Method | Gives |
|---|---|---|
| `/health` | GET | `{ ok: true }`, no key — the watcher's door |
| `/capabilities` | GET | what this installation can do; the routes are listed from the router itself |
| `/db/tables` | GET | the list of tables |
| `/db/tables/:table` | GET, POST | rows (`search`, `limit` ≤ 1000, `offset`; secret columns such as `password` never leave), insert a row |
| `/db/tables/:table` | DELETE | drop the table — machine key only |
| `/db/tables/:table/rows/:id` | PATCH | edit one row by `id` |
| `/db/migrate` | POST | `{ sql, params }` — DDL, SELECT, writes; machine key only, a session never |
| `/db/whoami` | GET | what the presented key opens: `{ scope: 'element', id, database }` or `{ scope: 'node' }` |
| `/db/claim` | POST | `{ element, tables }` — COPIES tables of the node's database into an element's own (node key only, 654-1) |
| `/deploy-runs`, `/deploy-runs/:id` | GET, POST, PATCH | the deploy journal |
| `/a2a-log`, `/a2a-log/pin` | GET, POST | the agent-to-agent conversation log (last 10 000 kept, secret-named fields stripped) |
| `/panel-settings/:key` | GET, PUT | JSON values a control surface keeps |
| `/platform/openai-key` | GET, POST | whether each consumer has the OpenAI key; write it to all of them |
| `/service/<name>/*` | any | one route to the loopback services of the machine (rag, geo, channels, ai-browser, memory, panel) |
| `/media/*` | any | passed to the storage element (`STORAGE_URL`) |
| `/vectors/*` | any | passed to the vectors element (`VECTORS_URL`) |

**An element's own key (node step 654-1).** An element of the node may call with its own key instead: `X-Element-Key: <element
id>.<mac>` — written to the element by the node installer, the mac an HMAC-SHA256 of the node's `DATA_SECRET` over the element id, checked
here with no list and no call to the core. Such a call works on that element's own database (see «Whose tables»), reaches only the
`/db/*` doors, `/db/whoami` and `/capabilities` (any other door — 403 `not-for-an-element`), and a key that does not match gets 401
`bad_element_key` — never the node's view. A request with both keys gets the element's view.

Example — read ten rows of a table from another element:

```js
const r = await fetch(`${process.env.REMOTE_DATA_URL}/db/tables/products?limit=10`, {
  headers: { 'X-Data-Secret': process.env.DATA_SECRET },
})
const { columns, rows, total } = await r.json()
```

## Whose tables (node step 654-1)

The owner of the node, 2026-11-05: «объектное хранилище должно быть обновлено не только для использования глубинной памятью но и для
использования просто внутри элемента»; in both node types — a single project and an app factory.

- **An element's own database.** A call with an element's key works on `data/elements/<id>.db` beside the node's `data.db`, created at
  its first call. Every `/db/*` door does there exactly what it does on the node's file: two elements may each have a table `products`,
  and neither sees the other's.
- **SQL stays in its file.** An element's SQL that names `ATTACH`, `DETACH`, `VACUUM INTO` or `load_extension` — the only ways out of one
  SQLite file — is refused with 400 `outside-own-database`. Values go as `params`; a word inside a string value or a comment is data.
- **The node sees all.** The node's key (`X-Data-Secret` — the core, the native elements, the main agent) works on the node's file as
  before; with `?space=<element id>` on any `/db/*` door it works on that element's database (404 `no-such-space` while the element has
  none — the node's call never creates one).
- **Tables written before 654.** A custom element that kept tables in the node's file sees them no more after it moves to its own key.
  The architect copies them over: `POST /db/claim { element, tables }` — schema, indexes and rows; the node's table stays until the
  architect drops it; a table the element already has is refused (409). List parent tables before the tables that point to them.
- **What it does not do.** It does not keep elements apart on the disk: all elements run as one user of the computer, and an element's
  agent is held off the neighbours' files by the node's boundary hook on named paths, not by the operating system.

New tables are declared by the element that owns them (`CREATE TABLE IF NOT EXISTS` through `/db/migrate` at its start);
this element runs them and keeps the rows. There are no migrations.

## Where things live

- `lib/data-store/` — the doors. The handlers of the former `server.js` moved here verbatim; `express-shim.mjs` gives them the
  Express shape (`app.get`, `req.params`, `res.json`) over Next route handlers, `app.mjs` assembles them in the former order.
- `app/<door>/[[...path]]/route.ts` — one route file per root segment, each hands the request to `lib/data-store/app.mjs`.
- `proxy.ts` — the data doors pass first (`DATA_DOOR_ROOTS`), before the template's language router and `/api` gate.
- The database file — `APP_DB_PATH` relative to the element folder (`./data/data.db`), never in git.
- The home page — `app/[lang]/(publicLayer)/_data/en.json`, `ru.json`.

## Environment

The node writes `.env.local` from `.env.example`: `DATA_SECRET` (shared), `APP_DB_PATH`, `STORAGE_URL` and `VECTORS_URL` (the
neighbours, empty when not installed — the former address then answers 503 naming the missing element), `AUTH_SERVICE_URL`,
`LIGHTRAG_API_KEY` (foreign, for `/service/rag/*`).

## Extending

- A new door: add the handler to a module in `lib/data-store/`, register it in `app.mjs`, and if it opens a new root segment —
  a route file `app/<segment>/[[...path]]/route.ts`, the segment in `DATA_DOOR_ROOTS` of `proxy.ts` and a line in
  `scripts/check-routes.mjs`. Changing a door is the owner's decision: every element of the node calls these addresses.
- The lock (`lib/data-store/auth.mjs`) and the element key (`lib/data-store/element-key.mjs`) are shared word for word with storage
  and vectors; change them in all three at once. `scripts/check-element-key.mjs` (in `prebuild`) holds the key's test vector — the same
  in every store of the node.

## What it does not do

It does not keep files (storage) or vectors (vectors element) any more. The vector tables of the former store stay in
`data.db` untouched until the owner decides to remove them; the vectors element works on its own copy.

## Proven by

Step 550: the same requests to the former Express service and to this element return the same status and shape
(`/code/scripts/agent-tokens/door-parity.mjs`), and the consumers of the node (deploy journal, A2A log, media on pages) work
after the switch.

License: MIT.
