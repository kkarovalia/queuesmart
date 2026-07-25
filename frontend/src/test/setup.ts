import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true })

// jsdom doesn't provide window.localStorage under this Node version (Node's
// own experimental native localStorage shadows it instead), so polyfill a
// minimal in-memory Storage for tests that read/write an auth token.
if (typeof window.localStorage === 'undefined') {
    class MemoryStorage implements Storage {
        #store = new Map<string, string>()
        get length() { return this.#store.size }
        clear() { this.#store.clear() }
        getItem(key: string) { return this.#store.get(key) ?? null }
        key(index: number) { return Array.from(this.#store.keys())[index] ?? null }
        removeItem(key: string) { this.#store.delete(key) }
        setItem(key: string, value: string) { this.#store.set(key, String(value)) }
    }
    Object.defineProperty(window, 'localStorage', { value: new MemoryStorage(), writable: true })
}
