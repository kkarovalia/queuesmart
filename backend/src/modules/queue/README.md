# The queue module owns the line itself: who is in it, what order they get served in, and moving parties through it.

## Endpoints

**GET /api/queue/:serviceId**
Admin view of the current queue for one service, already in serving order. Each entry comes back with a 1-based `position` and its resolved `priority` so the UI doesn't have to work either out. Parties who have been served or who left are not included. 404 if the service doesn't exist.

**POST /api/queue/:serviceId/join**
Body: `{ userId, partySize, priority? }`. Returns 201 with the new entry plus its `position`.

**POST /api/queue/:serviceId/leave**
Body: `{ userId }`. Marks that party `left`. Works whether they were `waiting` or already `almost-ready` — someone who has been told they're next can still change their mind.

**POST /api/queue/:serviceId/serve-next**
Admin action. Seats the party at the front and returns `{ served, nowAlmostReady }`, where `nowAlmostReady` is whoever moved up (or `null` if that was the last party in line).

## Ordering

Two things decide the order, in this priority:

1. **Priority** — high, then medium, then low.
2. **Arrival time** — earliest `joinedAt` first, within the same priority band.

A party can carry its own `priority`. If it doesn't, it inherits the priority of the service it queued for. Without the per-party override every entry in one service's queue would have identical priority and sorting by it would do nothing, which is why `QueueEntry.priority` is optional in `types.ts`.

Known trade-off: a steady stream of high-priority parties can keep delaying a low-priority one. The brief only asks that ordering "consider arrival order and priority", so there's no ageing rule yet.

## For the wait-time module

`sortQueueEntries(entries, service)` and `getCurrentQueue(service)` are exported from `router.ts`. Please compute position with those rather than re-sorting by `joinedAt`:

```ts
import { getCurrentQueue } from '../queue/router.js'
```

This is the mismatch flagged in the wait-time README — position has to be derived from the same ordering that `serve-next` actually uses, or the estimate will disagree with who really gets served next.

## For the notifications module

The queue keeps exactly one party flagged `almost-ready`: whoever is currently at the front. `syncAlmostReady(service)` re-applies that after every change to the line, so the flag can't go stale (e.g. a high-priority party joining and jumping the front-runner moves the flag with it). It returns the entry that *newly* became almost-ready, or `null` if the front didn't change.

There are three commented trigger points in `router.ts` marked `Notification trigger point:` — in `join`, and two in `serve-next`. The notify helpers live on Nelson's branch and aren't importable from here yet, so wiring them up is a one-line drop-in at each of those three spots once the branches merge.

## Statuses

`waiting` → `almost-ready` → `served`, or `left` at any point while still in line. `almost-ready` still counts as being in the queue.

## Validation

400 with `{ error: 'Validation failed', details: [...] }`, listing every problem at once rather than stopping at the first.

- `userId` — required, string, non-empty, 64 characters or fewer.
- `partySize` — required, whole number, between 1 and 20.
- `priority` — optional; if present must be `low`, `medium`, or `high`.

Other responses: 404 for an unknown service or a party who isn't in the line, 400 for joining a closed service, 409 for joining a line you're already in (stops a refresh of the join screen quietly taking two slots).

## Tests

`npm test` runs `queue.test.ts` — 57 tests covering the ordering functions directly, the almost-ready logic, every endpoint, and each validation rule.

`npm run test:coverage` for the coverage report (the assignment asks for 70–80%). This module is at 100% statements / 97% branches; the only uncovered branches are the defensive `req.body ?? {}` fallbacks, which Express never actually hits.
