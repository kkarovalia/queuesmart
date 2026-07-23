# QueueSmart Backend (A3)

Node + Express + TypeScript. In-memory data only — no database yet (that's A4).

## Running it

```
npm install
npm run dev     # starts the API on http://localhost:3001 with auto-reload
npm test        # runs the vitest/supertest suite
npm run build   # type-checks and compiles to dist/
npm run lint
```

## Structure

- `src/types.ts` — shared types, all modules import from here.
- `src/data/store.ts` — the shared in-memory "database" (plain arrays). Import from here, don't create your own parallel data.
- `src/app.ts` — builds the Express app and mounts every module's router. `src/main.ts` is the only file that actually calls `.listen()` — tests import `createApp()` directly instead, so they don't need a real port.
- `src/modules/<name>/router.ts` — one router per module, mounted under `/api/<name>` in `app.ts`.

## Module ownership

| Module | Route prefix | Owner | Status |
|---|---|---|---|
| Auth | `/api/auth` | Ian | Starting point only — see TODO in file |
| Services | `/api/services` | Ian | Starting point only — see TODO in file |
| Queue | `/api/queue` | Kashf | Starting point only — see TODO in file |
| Notifications | `/api/notifications` | Nelson | Starting point only — see TODO in file |
| Wait-time | `/api/wait-time` | Nelson | Starting point only — see TODO in file |
| History | `/api/history` | Frances | Done |

Each stub is real enough to run and to demonstrate the validation/error-response pattern (400 with `{ error, details }` for bad input, 404 for missing resources) — just not the full logic described in the assignment brief for that module yet. Add a `<module>.test.ts` next to your router file; see `src/modules/history/history.test.ts` for the supertest pattern.
