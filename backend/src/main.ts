import * as dotenv from "dotenv";
dotenv.config();

// .env is gitignored (per-developer secret), so fall back to a dev-only
// value when it's absent rather than crashing every login/register call —
// there's no real security stake here since A3 has no persistent database.
process.env.JWT_SECRET ??= 'dev-only-insecure-secret-do-not-use-in-production';

import { createApp } from './app.js'

const port = process.env.PORT ? Number(process.env.PORT) : 3001
const app = createApp()

app.listen(port, () => {
    console.log(`QueueSmart backend listening on http://localhost:${port}`)
})
