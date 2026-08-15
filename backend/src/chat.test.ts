import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from './generated/prisma/client.js'
import { generate, type Tool } from './chat.js'

// generate()'s tool-calling loop (chat.ts) was previously the biggest
// uncovered chunk in the file — every other test in the codebase either
// mocks generate() entirely (to test callers without hitting a real LLM) or
// exercises individual tool handlers directly, never the loop that actually
// wires model responses to tool calls and back. Mocking the OpenAI client
// itself, rather than generate(), lets the real loop run for real while
// keeping the test fast, offline, and deterministic.
const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('openai', () => ({
    default: vi.fn().mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
    })),
}))

const fakeUser = {
    id: 'user-1', name: 'Test User', email: 'test@example.com',
    phone: null, passwordHash: 'x', role: 'user',
} as User

function assistantTextReply(content: string) {
    return { choices: [{ message: { role: 'assistant', content } } as never] }
}

function assistantToolCall(name: string, args: object, callId = 'call-1') {
    return {
        choices: [{
            message: {
                role: 'assistant', content: null,
                tool_calls: [{ id: callId, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
            } as never,
        }],
    }
}

describe('generate()', () => {
    beforeEach(() => {
        mockCreate.mockReset()
    })

    it('returns the conversation with a plain assistant reply when no tool is called', async () => {
        mockCreate.mockResolvedValueOnce(assistantTextReply('Hello!'))

        const history = await generate([{ role: 'user', content: 'hi' }], { user: fakeUser }, [])

        expect(history).toHaveLength(2)
        expect(history[1]).toMatchObject({ role: 'assistant', content: 'Hello!' })
        expect(mockCreate).toHaveBeenCalledTimes(1)
    })

    it('executes a matched tool call, feeds the result back, and makes a second round-trip', async () => {
        const tool: Tool<object> = {
            definition: { type: 'function', function: { name: 'test_tool', description: 'a test tool' } },
            handler: vi.fn().mockResolvedValue('tool result'),
        }
        mockCreate
            .mockResolvedValueOnce(assistantToolCall('test_tool', {}))
            .mockResolvedValueOnce(assistantTextReply('Done!'))

        const history = await generate([{ role: 'user', content: 'do it' }], { user: fakeUser }, [tool])

        expect(tool.handler).toHaveBeenCalledWith({}, { user: fakeUser })
        expect(history.find(m => m.role === 'tool')).toMatchObject({ tool_call_id: 'call-1', content: 'tool result' })
        expect(history.at(-1)).toMatchObject({ role: 'assistant', content: 'Done!' })
        expect(mockCreate).toHaveBeenCalledTimes(2)
    })

    it('passes the parsed arguments straight through to the tool handler', async () => {
        const tool: Tool<{ city: string }> = {
            definition: { type: 'function', function: { name: 'weather', description: 'gets weather' } },
            handler: vi.fn().mockResolvedValue('sunny'),
        }
        mockCreate
            .mockResolvedValueOnce(assistantToolCall('weather', { city: 'Boston' }))
            .mockResolvedValueOnce(assistantTextReply('It is sunny in Boston.'))

        await generate([{ role: 'user', content: 'weather in boston?' }], { user: fakeUser }, [tool])

        expect(tool.handler).toHaveBeenCalledWith({ city: 'Boston' }, { user: fakeUser })
    })

    it('reports "Tool not found" for a tool name the model made up, without crashing', async () => {
        mockCreate
            .mockResolvedValueOnce(assistantToolCall('nonexistent_tool', {}))
            .mockResolvedValueOnce(assistantTextReply('ok'))

        const history = await generate([{ role: 'user', content: 'x' }], { user: fakeUser }, [])

        expect(history.find(m => m.role === 'tool')).toMatchObject({ tool_call_id: 'call-1', content: 'Tool not found' })
        expect(mockCreate).toHaveBeenCalledTimes(2)
    })

    it('turns a thrown tool handler error into a tool-result message instead of rejecting', async () => {
        const tool: Tool<object> = {
            definition: { type: 'function', function: { name: 'boom', description: 'throws' } },
            handler: vi.fn().mockRejectedValue(new Error('kaboom')),
        }
        mockCreate
            .mockResolvedValueOnce(assistantToolCall('boom', {}))
            .mockResolvedValueOnce(assistantTextReply('handled'))

        const history = await generate([{ role: 'user', content: 'x' }], { user: fakeUser }, [tool])

        expect(history.find(m => m.role === 'tool')).toMatchObject({
            tool_call_id: 'call-1',
            content: 'An error occurred during tool execution: kaboom',
        })
    })

    it('handles multiple tool calls in a single round', async () => {
        const toolA: Tool<object> = {
            definition: { type: 'function', function: { name: 'tool_a', description: 'a' } },
            handler: vi.fn().mockResolvedValue('result a'),
        }
        const toolB: Tool<object> = {
            definition: { type: 'function', function: { name: 'tool_b', description: 'b' } },
            handler: vi.fn().mockResolvedValue('result b'),
        }
        mockCreate
            .mockResolvedValueOnce({
                choices: [{
                    message: {
                        role: 'assistant', content: null,
                        tool_calls: [
                            { id: 'call-a', type: 'function', function: { name: 'tool_a', arguments: '{}' } },
                            { id: 'call-b', type: 'function', function: { name: 'tool_b', arguments: '{}' } },
                        ],
                    } as never,
                }],
            })
            .mockResolvedValueOnce(assistantTextReply('both done'))

        const history = await generate([{ role: 'user', content: 'x' }], { user: fakeUser }, [toolA, toolB])

        const toolMessages = history.filter(m => m.role === 'tool')
        expect(toolMessages).toHaveLength(2)
        expect(toolMessages).toContainEqual(expect.objectContaining({ tool_call_id: 'call-a', content: 'result a' }))
        expect(toolMessages).toContainEqual(expect.objectContaining({ tool_call_id: 'call-b', content: 'result b' }))
    })

    it('keeps looping through consecutive tool-calling rounds until the model stops calling tools', async () => {
        const tool: Tool<object> = {
            definition: { type: 'function', function: { name: 'step', description: 'one step' } },
            handler: vi.fn().mockResolvedValue('stepped'),
        }
        mockCreate
            .mockResolvedValueOnce(assistantToolCall('step', {}, 'call-1'))
            .mockResolvedValueOnce(assistantToolCall('step', {}, 'call-2'))
            .mockResolvedValueOnce(assistantTextReply('all steps done'))

        const history = await generate([{ role: 'user', content: 'x' }], { user: fakeUser }, [tool])

        expect(mockCreate).toHaveBeenCalledTimes(3)
        expect(tool.handler).toHaveBeenCalledTimes(2)
        expect(history.at(-1)).toMatchObject({ role: 'assistant', content: 'all steps done' })
    })
})
