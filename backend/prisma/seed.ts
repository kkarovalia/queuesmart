import * as argon2 from 'argon2'
import { PrismaClient } from '../src/generated/prisma/client.js'

const prisma = new PrismaClient()

// Same two demo accounts the old in-memory store.ts seeded, so login still
// works out of the box against the real database.
const DEMO_USERS = [
    { name: 'Jamie Lee', phone: '555-0100', email: 'jamie@example.com', password: 'demo-user', role: 'user' as const },
    { name: 'Alex Admin', phone: '555-0101', email: 'admin@example.com', password: 'demo-admin', role: 'admin' as const },
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
    for (const { name, phone, email, password, role } of DEMO_USERS) {
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            // Backfill name/phone on accounts seeded before those fields
            // existed (schema added them in the Final Project pass) — a
            // plain skip would leave those documents missing a required
            // field, which crashes any query that reads them back.
            if (!existing.name) {
                await prisma.user.update({ where: { email }, data: { name, phone } })
                console.log(`Backfilled name/phone for ${email}.`)
            } else {
                console.log(`Skipping ${email}, already seeded.`)
            }
            continue
        }
        const passwordHash = await argon2.hash(password)
        await prisma.user.create({ data: { name, phone, email, passwordHash, role } })
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
