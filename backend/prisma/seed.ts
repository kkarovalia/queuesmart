import * as argon2 from 'argon2'
import { PrismaClient } from '../src/generated/prisma/client.js'

const prisma = new PrismaClient()

// Same two demo accounts the old in-memory store.ts seeded, so login still
// works out of the box against the real database.
const DEMO_USERS = [
    { email: 'jamie@example.com', password: 'demo-user', role: 'user' as const },
    { email: 'admin@example.com', password: 'demo-admin', role: 'admin' as const },
]

async function main() {
    for (const { email, password, role } of DEMO_USERS) {
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            console.log(`Skipping ${email}, already seeded.`)
            continue
        }
        const passwordHash = await argon2.hash(password)
        await prisma.user.create({ data: { email, passwordHash, role } })
        console.log(`Seeded ${email} (${role})`)
    }
}

main()
    .catch(error => {
        console.error(error)
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
