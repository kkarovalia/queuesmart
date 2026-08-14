// Using openai lib for maximum compatibility.
// Gemini API is compatible, as well as local LLMs through llamacpp, vLLM, etc.

import OpenAI from "openai"
import { QueueEntry, Service, User } from "./generated/prisma/client.js"
import { ChatCompletionFunctionTool, ChatModel } from "openai/resources"
import { getNotificationsByUserId, prisma } from "./database.js"

function hasLLMConfig(): boolean {
    return [
        "LLM_BASE_URL",
        "LLM_API_KEY",
        "LLM_MODEL_NAME",
    ].every(arg => process.env[arg] != null)
}

const llm = (() => {
    if (!hasLLMConfig())
        throw Error("Required env vars for LLM have not been set")
    return new OpenAI({
        baseURL: process.env.LLM_BASE_URL,
        apiKey: process.env.LLM_API_KEY,
    })
})()

// Add more if needed but user will likely be enough
export interface ChatContext {
    user: User
}

export type ChatHistory = Parameters<typeof llm.chat.completions.create>[0]["messages"]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Tool<TArgs = any> {
    definition: ChatCompletionFunctionTool;
    handler: (args: TArgs, context: ChatContext) => Promise<string> | string;
}


async function executeTool(tool: Tool, argsJson: string, context: ChatContext) {
    const result = await (async () => {
        try {
            return await tool.handler(JSON.parse(argsJson), context)
        } catch (error) {
            let msg = "An error occurred during tool execution: "
            if (error instanceof Error) {
                msg += error.message
            } else {
                msg += String(error)
            }
            return msg
        }
    })()
    // Log result if needed
    return result
}

export const getUserNotifications: Tool<object> = {
    definition: {
        type: "function",
        function: {
            name: "get_user_notifications",
            description: "Gets a list of all user notifications, such as confirmations and cancellations."
        }
    },
    handler: async (_args, context) => {
        const notifications = await getNotificationsByUserId(context.user.id)
        return JSON.stringify(notifications, null, 2)
    }
}

export const getUserQueueEntries: Tool<object> = {
    definition: {
        type: "function",
        function: {
            name: "get_user_queue_entries",
            description: "Gets a list of all active queue entries for the current user."
        }
    },
    handler: async (_args, context) => {
        const entries = await prisma.queueEntry.findMany({
            where: {
                userId: context.user.id,
                status: { in: ["waiting", "almost_ready"] },
                resolvedAt: {isSet: false},
            },
            orderBy: { position: "asc" },
        });
        const serviceIds = [...new Set(entries.map((e) => e.serviceId))];
        const [services, activeEntries] = await Promise.all([
            prisma.service.findMany({
                where: { id: { in: serviceIds } },
            }),
            prisma.queueEntry.findMany({
                where: {
                    serviceId: { in: serviceIds },
                    status: { in: ["waiting", "almost_ready"] },
                    resolvedAt: {isSet: false},
                },
                orderBy: { position: "asc" },
            }),
        ]);
        const queueByService = new Map<string, typeof activeEntries>();
        for (const e of activeEntries) {
            const list = queueByService.get(e.serviceId) ?? [];
            list.push(e);
            queueByService.set(e.serviceId, list);
        }
        const entriesWithPosition = entries.map((entry) => {
            const queue = queueByService.get(entry.serviceId)!;
            const position = queue.findIndex((e) => e.id === entry.id) + 1;
            return { ...entry, position, queueLength: queue.length };
        });
        return JSON.stringify({
            services: services,
            entries: entriesWithPosition,
        }, null, 2)
    }
}

export const getOpenServices: Tool<object> = {
    definition: {
        type: "function",
        function: {
            name: "get_open_services",
            description: "Gets a list of all open services (a.k.a. queues) the user can join."
        }
    },
    handler: async (_args, _context) => {
        const entries = await prisma.service.findMany({
            where: {
                status: "open"
            }
        })
        return JSON.stringify(entries)
    }
}

// Need to add seating pref as arg if we keep that field.
// Will update if fixed.
export const joinQueue: Tool<{ 
    entry_id: string,
    party_size: number,
}> = {
    definition: {
        type: "function",
        function: {
            name: "join_queue",
            description: "Adds the user to the provided queue.",
            parameters: {
                type: "object",
                properties: {
                    entry_id: {
                        type: "string",
                        description: "ID of service to queue for."
                    },
                    party_size: {
                        type: "integer",
                        description: "Size of expected party."
                    }
                }
            }
        }
    },
    handler: async (args, context) => {
        let match: Service | null
        try {
            match = await prisma.service.findUnique({
                where: { id: args.entry_id }
            })
        } catch {
            return "Invalid id format."
        }
        if (match == null)
            return "Service not found."
        const num_existing = await prisma.queueEntry.count({
            where: {
                serviceId: match.id, 
                userId: context.user.id,
                resolvedAt: {isSet: false},
            }
        })
        if (num_existing > 0)
            return "User already in queue."
        await prisma.queueEntry.create({
            data: {
                serviceId: match.id,
                userId: context.user.id,
                partySize: args.party_size,
                status: "waiting",
                position: Date.now(),
            }
        })
        return "User has been added to queue."
    }
}

export const cancelEntry: Tool<{ entry_id: string }> = {
    definition: {
        type: "function",
        function: {
            name: "cancel_queue_entry",
            description: "Cancels the provided queue entry.",
            parameters: {
                type: "object",
                properties: {
                    entry_id: {
                        type: "string",
                        description: "Entry id to cancel."
                    }
                }
            }
        }
    },
    handler: async (args, context) => {
        let match: QueueEntry | null
        try {
            match = await prisma.queueEntry.findUnique({
                where: { id: args.entry_id }
            })
        } catch {
            return "Invalid id format."
        }
        if (match == null || match.userId !== context.user.id)
            return "Entry not found."
        await prisma.queueEntry.update({
            where: { id: match.id },
            data: { 
                outcome: "cancelled",
                resolvedAt: new Date(Date.now()),
            }
        })
        return "Queue entry has been cancelled."
    }
}

const defaultTools = [
    getUserNotifications,
    getUserQueueEntries,
    getOpenServices,
    joinQueue,
    cancelEntry,
]

export async function generate(messages: ChatHistory, context: ChatContext, tools: Tool[] = defaultTools) {
    const history = [...messages]
    const tool_mappings = tools ? Object.fromEntries(tools.map(t => [t.definition.function.name, t])) : undefined
    const tool_definitions = tools?.map(t => t.definition)
    let response = (await llm.chat.completions.create({
        model: process.env.LLM_MODEL_NAME as ChatModel,
        messages: history,
        tools: tool_definitions
    })).choices[0].message
    history.push(response)
    while (response.tool_calls?.length) {
        for (const call of response.tool_calls) {
            if (call.type !== "function")
                continue
            const target = tool_mappings?.[call.function.name]
            if (target == null) {
                history.push({
                    role: "tool",
                    tool_call_id: call.id,
                    content: "Tool not found"
                })
            } else {
                history.push({
                    role: "tool",
                    tool_call_id: call.id,
                    content: await executeTool(target, call.function.arguments, context)
                })
            }
        }
        response = (await llm.chat.completions.create({
            model: process.env.LLM_MODEL_NAME as ChatModel,
            messages: history,
            tools: tool_definitions
        })).choices[0].message
        history.push(response)
    }
    return history
}

export type StreamEvent =
    | { type: "content"; delta: string }
    | { type: "tool_call"; name: string }
    | { type: "done" }

export async function* generateStream(
    messages: ChatHistory,
    context: ChatContext,
    tools: Tool[] = defaultTools
): AsyncGenerator<StreamEvent, ChatHistory> {
    const history = [...messages]
    const tool_mappings = Object.fromEntries(tools.map(t => [t.definition.function.name, t]))
    const tool_definitions = tools.map(t => t.definition)

    while (true) {
        const stream = await llm.chat.completions.create({
            model: process.env.LLM_MODEL_NAME as ChatModel,
            messages: history,
            tools: tool_definitions,
            stream: true,
        })

        let content = ""
        const toolCallAccumulator: Record<number, {
            id: string; name: string; arguments: string
        }> = {}

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta
            if (!delta) continue

            if (delta.content) {
                content += delta.content
                yield { type: "content", delta: delta.content }
            }

            if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                    const idx = tc.index
                    if (!toolCallAccumulator[idx]) {
                        toolCallAccumulator[idx] = { id: "", name: "", arguments: "" }
                    }
                    if (tc.id) toolCallAccumulator[idx].id = tc.id
                    if (tc.function?.name) toolCallAccumulator[idx].name += tc.function.name
                    if (tc.function?.arguments) toolCallAccumulator[idx].arguments += tc.function.arguments
                }
            }
        }

        const toolCalls = Object.values(toolCallAccumulator)
        history.push({
            role: "assistant",
            content: content || null,
            tool_calls: toolCalls.length
                ? toolCalls.map(tc => ({
                    id: tc.id,
                    type: "function" as const,
                    function: { name: tc.name, arguments: tc.arguments }
                }))
                : undefined,
        })

        if (toolCalls.length === 0) {
            yield { type: "done" }
            return history
        }

        for (const tc of toolCalls) {
            yield { type: "tool_call", name: tc.name }
            const target = tool_mappings[tc.name]
            const result = target == null
                ? "Tool not found"
                : await executeTool(target, tc.arguments, context)
            history.push({
                role: "tool",
                tool_call_id: tc.id,
                content: result,
            })
        }
    }
}