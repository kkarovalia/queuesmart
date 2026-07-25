import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./src/test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            // main.ts is just the .listen() entry point and the store is plain
            // seed data; neither has logic worth covering, and leaving them in
            // drags the reported percentage down for no useful signal.
            include: ['src/**/*.ts'],
            exclude: ['src/main.ts', 'src/types.ts', 'src/data/store.ts'],
        },
    },
})
