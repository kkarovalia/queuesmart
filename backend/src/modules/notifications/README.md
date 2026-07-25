# The notifications module creates and stores notifications. Doesn't send real emails/SMS, just logs to the in-memory store and returns them to the frontend.

## Endpoints

**GET /api/notifications/:userId**
Returns that user's notifications, newest first.

**POST /api/notifications/:notificationId/read**
Marks a notification as read. Returns 404 if the id doesn't exist.

## In relation to the queue module.

Three functions are exported and ready to call, nothing else needed on this end:

```ts
import { notifyQueueJoined, notifyAlmostReady, notifyServed } from '../notifications/router.js'

notifyQueueJoined(userId, service.name)   // call right after a new entry is added to the queue
notifyServed(userId, service.name)        // call when someone is served
notifyAlmostReady(userId, service.name)   // call for whoever is now at the front of the line
```

Each one just needs a userId and the service's name, they don't care how the queue is ordered or how you got that userId.

## Tests

`npm run test` runs `notifications.test.ts`, covers all three notify functions directly plus both endpoints. Doesn't call into the queue module, so it'll keep passing regardless of how that module gets built.
