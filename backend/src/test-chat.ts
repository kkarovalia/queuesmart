import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"
import { prisma } from "../src/database.js"
import { generateStream, ChatHistory, ChatContext, StreamEvent } from "../src/chat.js"
import { User } from "../src/generated/prisma/client.js"
import { systemMsg } from "./modules/chat/router.js"

const rl = createInterface({ input: stdin, output: stdout })

async function pickUser(): Promise<User> {
    const users = await prisma.user.findMany({ take: 25, orderBy: { id: "asc" } })

    if (users.length === 0) {
        console.error("No users found in the database.")
        process.exit(1)
    }

    console.log("\nSelect a user:\n")
    users.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.name}  (${u.id})`)
    })

    while (true) {
        const answer = await rl.question("\nEnter number: ")
        const idx = Number(answer.trim()) - 1
        if (Number.isInteger(idx) && idx >= 0 && idx < users.length) {
            return users[idx]
        }
        console.log("Invalid selection, try again.")
    }
}

async function chatLoop(user: User) {
    const context: ChatContext = { user }
    let history: ChatHistory = [
        { role: "system", content: systemMsg + user.name }
    ]

    console.log(`\nChatting as ${user.name}. Type "exit" to quit, "reset" to clear history.\n`)

    while (true) {
        const input = await rl.question("you> ")
        const trimmed = input.trim()

        if (trimmed.toLowerCase() === "exit") break
        if (trimmed.toLowerCase() === "reset") {
            history = history.slice(0, 1) // keep system message only
            console.log("(history cleared)\n")
            continue
        }
        if (trimmed === "") continue

        history.push({ role: "user", content: trimmed })

        stdout.write("bot> ")
        const gen = generateStream(history, context)
        let result: IteratorResult<StreamEvent, ChatHistory>

        try {
            while (!(result = await gen.next()).done) {
                const event = result.value
                if (event.type === "content") {
                    stdout.write(event.delta)
                } else if (event.type === "tool_call") {
                    stdout.write(`\n  [calling tool: ${event.name}]\n`)
                }
            }
            history = result.value
            stdout.write("\n\n")
        } catch (err) {
            console.error("\n[error]", err)
        }
    }
}

async function main() {
    const user = await pickUser()
    await chatLoop(user)
    rl.close()
    await prisma.$disconnect()
    process.exit(0)
}

main().catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
})