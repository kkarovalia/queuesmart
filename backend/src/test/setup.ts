// Tests import createApp() directly (see app.test.ts and friends), bypassing
// main.ts's dotenv/env-fallback setup entirely. Auth tests need a JWT_SECRET
// to exist for signToken to work, so set the same dev-only fallback here.
process.env.JWT_SECRET ??= 'dev-only-insecure-secret-do-not-use-in-production';

// A4: tests that hit the database now need a real MongoDB. Point at the
// mongodb service's dev-only host port (see docker-compose.dev.yml) with the
// same credentials as .env.example, so `npm test` works straight after
// `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`
// without needing the repo-root .env sourced into this shell too. Override
// DATABASE_URL yourself if your local Mongo uses different credentials.
// directConnection=true, not replicaSet=rs0 — see the matching comment in
// docker-compose.yml for why (the replica set's single member advertises
// itself as "localhost:27017" with no way to override that).
process.env.DATABASE_URL ??=
    'mongodb://admin:dev-local-only@localhost:27017/queuesmart?authSource=admin&directConnection=true';

// chat.ts validates provider configuration when it is imported. Tool and
// route tests mock the actual provider call, so deterministic placeholders
// keep the test suite local and prevent it from depending on developer keys.
process.env.LLM_BASE_URL ??= 'http://127.0.0.1:1';
process.env.LLM_API_KEY ??= 'test-only';
process.env.LLM_MODEL_NAME ??= 'test-only';
