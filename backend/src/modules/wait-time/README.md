# The wait time module estimates how long a party can expect to wait, rule-based: parties ahead x service's expected duration.

## Endpoints

**GET /api/wait-time/:serviceId**
Aggregate estimate for a service. Returns `{ serviceId, waitingCount, estimatedWaitMinutes }`. Counts everyone currently in line (waiting or already flagged almost-ready).

**GET /api/wait-time/:serviceId/entry/:entryId**
Estimate for one specific queue entry. Returns `{ entryId, serviceId, position, estimatedWaitMinutes }`. This is what the frontend should use for a logged-in user's own queue status. 404 if the entry never existed, 400 if it existed but has already been served or left the line.

## Ordering

Position is calculated using `getCurrentQueue(service)`, imported directly from the queue module, the same priority-then-arrival ordering `serve-next` actually uses to decide who's up next. This used to be a plain arrival-order sort done independently in this module, which would have disagreed with the real serving order once priority was added to queue ordering. Fixed by importing the queue module's own ordering function instead of re-implementing it.

## Tests

`npm run test` runs `wait-time.test.ts`. Covers the estimate math directly, both endpoints, 404/400 handling, and includes a live test that proves a party who joined later but with higher priority correctly gets a lower position and shorter wait than a party who joined earlier with lower priority.
