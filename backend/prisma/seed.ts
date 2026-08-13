import * as argon2 from 'argon2'
import { PrismaClient } from '../src/generated/prisma/client.js'

const prisma = new PrismaClient()

// Same two demo accounts the old in-memory store.ts seeded, so login still
// works out of the box against the real database.
const DEMO_USERS = [
    { name: 'Jamie', email: 'jamie@example.com', password: 'demo-user', role: 'user' as const },
    { name: 'Admin', email: 'admin@example.com', password: 'demo-admin', role: 'admin' as const },
]

const DEMO_SERVICES = [
    {
        name: 'Dinner Waitlist',
        description: 'General dining room seating for walk-in guests.',
        expectedDurationMinutes: 45,
        priority: 'high' as const,
        status: 'open' as const,
    },
    {
        name: 'Bar Seating',
        description: 'First-come bar seats for smaller parties.',
        expectedDurationMinutes: 30,
        priority: 'medium' as const,
        status: 'open' as const,
    },
    {
        name: 'Patio Seating',
        description: 'Outdoor seating when weather and capacity allow.',
        expectedDurationMinutes: 40,
        priority: 'medium' as const,
        status: 'open' as const,
    },
    {
        name: 'Private Dining',
        description: 'Private room seating for larger parties and special events.',
        expectedDurationMinutes: 120,
        priority: 'high' as const,
        status: 'closed' as const,
    },
]

async function main() {
    for (const { name, email, password, role } of DEMO_USERS) {
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            console.log(`Skipping ${email}, already seeded.`)
            continue
        }
        const passwordHash = await argon2.hash(password)
        await prisma.user.create({ data: { name, email, passwordHash, role } })
        console.log(`Seeded ${email} (${role})`)
    }

    for (const service of DEMO_SERVICES) {
        await prisma.service.upsert({
            where: { name: service.name },
            update: service,
            create: service,
        })
        console.log(`Seeded service ${service.name}`)
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
