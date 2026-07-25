// Tests import createApp() directly (see app.test.ts and friends), bypassing
// main.ts's dotenv/env-fallback setup entirely. Auth tests need a JWT_SECRET
// to exist for signToken to work, so set the same dev-only fallback here.
process.env.JWT_SECRET ??= 'dev-only-insecure-secret-do-not-use-in-production';
