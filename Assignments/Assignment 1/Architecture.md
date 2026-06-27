Our service is comprised of 3 major components:

## Web App (Frontend)
Users can request a table, check their position in line, get an estimated wait, and edit their reservation.
Administrators can add, rearrange, and change seating capacity of tables, manually enter and remove reservations, and view analytics on queue volume and wait time accuracy.

## API Server (Backend)
The web app will communicate with an API server that manages various internal services. Every request that comes in is first validated by an auth handler before being routed to the appropriate service, which keeps authentication centralized rather than scattered across every endpoint.

The queue service monitors active queues and sends events to the notification service when a customer's turn is approaching or their table is ready. It handles customers joining the waitlist, leaving voluntarily, and being released once their table is freed.

Future bookings are managed by the reservation service, which supports creation, edits, and cancellations. It works alongside the queue service so that walk-ins and scheduled reservations stay consistent with one another and don't double-book the same table.

Administrators interact with the restaurant builder service to define and arrange tables, set seating capacities, and update the floor layout. Both the queue and reservation services depend on the layout it produces, since neither one is meaningful without knowing what tables actually exist.

Estimates shown to customers are produced by the wait time estimate service, which runs an algorithm over past event history and the current state of the queue. Accuracy data is fed back into the database so the algorithm can be refined over time.

The notification service picks up events from the other services and sends them to an external email/SMS provider.

## Database
User account information and credentials are persisted on behalf of the auth handler.

The queue service writes active queue items, including party size and join time, along with event history for each seating, release, or abandonment.

Future reservations are stored for the reservation service with their associated time slots, party sizes, and statuses.

Table definitions written by the restaurant builder service, including capacities and arrangement, live here as well and are read back by the queue and reservation services whenever they need the current layout.

The wait time estimate service stores accuracy data, comparing predicted estimates against actual wait times so the algorithm can improve over time.