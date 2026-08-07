import {
    PrismaClient,
    User,
    UserRole,
    Service,
} from "./generated/prisma/client.js";
import { services } from "./data/store.js";
import type { ServiceInput } from './types.js'

// Queue/Notification integration (Nelson, Kashf) will need QueueEntry,
// QueueEntryStatus, WaitlistOutcome, Notification, NotificationKind,
// ServiceStatus, PriorityLevel from generated/prisma/client.js — import
// those in this file as needed when those Prisma calls get built out, same
// as User/Service above. Left out for now so the build stays green.

const prisma = new PrismaClient()

// Important stuff for A4:
// getUserByEmail shows one of many ways to interact with the db using prisma.
// You can run the full application stack using docker compose.
//
// Running dev environment with live editing
// docker compose -f docker-compose.yml -f docker-compose.dev.yml up
//
// Build and run production images
// docker compose up --build
//
// If switching between prod and dev:
// Run docker compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache
// OR
// docker compose build --no-cache
//
// HistoryRecord has been merged with QueueEntry via optional fields outcome and waitMinutes.
// resolvedAt and servedAt are now one optional resolvedAt field.
// 
// QueueEntry is unconstrained and needs backend logic to prevent duplicates.
//
// There are only 4 models in the database so this file won't need much work.
// Check modules to see if the prisma types are compatible. 
//
// PS - Frontend needs fixing. It's still set up like a demo for A2.

export async function getUserByEmail(email: string): Promise<User | undefined> {
    // Working prisma example
    return await prisma.user.findUnique({where: {email: email}}) ?? undefined // Prisma returns null so must convert
}

export async function getUserById(id: string): Promise<User | undefined> {
    try {
        return await prisma.user.findUnique({ where: { id } }) ?? undefined
    } catch {
        // Mongo ids are ObjectIds under the hood; Prisma throws rather than
        // returning null for a string that isn't validly-shaped, which would
        // otherwise turn a stale/forged JWT `sub` into a 500 instead of the
        // 404 the auth router expects for "no such user".
        return undefined
    }
}

export interface NewUserInput {
    email: string
    passwordHash: string
    role: UserRole
}

export class EmailAlreadyRegisteredError extends Error {
    constructor(email: string) {
        super(`Email already registered: ${email}`)
        this.name = 'EmailAlreadyRegisteredError'
    }
}

export async function createUser(input: NewUserInput): Promise<User> {
    try {
        return await prisma.user.create({ data: input })
    } catch (error) {
        // P2002 = Prisma's unique-constraint-violation code, thrown here if
        // two registrations for the same email race each other between the
        // auth router's own getUserByEmail check and this insert.
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
            throw new EmailAlreadyRegisteredError(input.email)
        }
        throw error
    }
}

export async function getServices(): Promise<Service[]> {
    return services
}
 
export async function getServiceById(id: string): Promise<Service | undefined> {
    return services.find(service => service.id === id)
}
 
export async function createService(input: ServiceInput): Promise<Service> {
    const service: Service = {
        id: `svc-${services.length + 1}`,
        ...input,
        status: 'open',
    }
    services.push(service)
    return service
}
 
export async function updateService(id: string, input: ServiceInput): Promise<Service | undefined> {
    const service = services.find(item => item.id === id)
    if (!service) return undefined
    service.name = input.name
    service.description = input.description
    service.expectedDurationMinutes = input.expectedDurationMinutes
    service.priority = input.priority
    return service
}

export async function toggleServiceStatus(id: string): Promise<Service | undefined> {
    const service = services.find(item => item.id === id)
    if (!service) return undefined
    service.status = service.status === 'open' ? 'closed' : 'open'
    return service
}
