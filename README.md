# Fractera Data — the single door to the data

A replaceable microservice. Everything stored by a Fractera node — rows, files, vectors — is reached
through this one service. The node never opens the database file itself: it knows one address and one
key.

**One door, not many.** The value is not the SQLite file; it is that there is exactly one place where
data can be read or written, so there is exactly one place to protect, replace or audit.

## What it gives

| Door | Answers |
|---|---|
| `GET /health` | liveness — **the only door that needs no key** |
| `GET /capabilities` | what this installation can actually do right now |
| `GET /db/tables` · `GET|POST /db/tables/:table` | tables and their rows |
| `PATCH /db/tables/:table/rows/:id` | row update |
| `POST /db/migrate` | the column ladder: adds what a schema gained |
| `GET /media` · `POST /media/upload` | the media list and upload |
| `GET /media/:id/file` · `/thumb` | the file and its thumbnail |
| `POST /media/generate-icons` | a full icon set from one image |
| `POST /vectors` · `POST /vectors/search` · `GET /vectors/status` | the vector half |
| `GET|POST|PATCH /deploy-runs` | the deployment journal |
| `GET|PUT /panel-settings/:key` | settings a control surface keeps |
| `ANY /service/<name>/*` | the one-door route to another service of this node |

The full passport is `OWN-SERVICE-PROPS.json` — written by the author of this service, read and never
edited by whoever installs it.

## The key

Every door but `/health` requires the header `X-Data-Secret`. The installer generates that key and
writes it to both ends; this service never invents one. Without the header the answer is a refusal,
not an empty result — a distinction worth keeping, because an empty result reads as "there is no
data" and stops the search.

🛑 **`DATA_BIND` defaults to `127.0.0.1` on purpose.** Setting it to `0.0.0.0` exposes the data layer
to the network. That has to be someone's decision, never a default.

## No build step

`server.js` is source and production at once. It is in git, unobfuscated, ~1600 lines. Starting it is
the whole deployment:

```
npm ci
cp .env.example .env.local    # then fill the values in by hand
npm run start
```

Normally you do none of this: the node installs the service with one command
(`npm run services:install`), assigns the port and writes `.env.local` itself.

🛑 **`.env.local` is a generated file.** Editing it by hand works until the next install and then
disappears without a word.

## Storage

SQLite, one file, `data/app.db`. The schema is executed at start — no migrations. `data/`, `storage/`
and `icons/` hold the person's own files and never enter git; only their `.gitkeep` does.

`better-sqlite3`, `sqlite-vec` and `sharp` are native modules. A machine without a build toolchain
loses the half that needs them and says so, rather than failing at startup.

## Where it came from

Moved out of `ai-workspace/services/data` on 2026-09-20 (step 257-2), unchanged: same `server.js`,
same dependencies. What was added at the move: this README, the passport, a complete `.env.example`,
and the empty `architect-pages/` folder.

🪦 The old `.env.example` listed three variables while the code reads twenty-three. An incomplete
list of questions is worse than none — the installer fills what it is asked about and leaves the rest
at defaults nobody chose.
