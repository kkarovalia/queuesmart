import { 
    PrismaClient, 
    User, 
    UserRole, 
    Service, 
    ServiceStatus,
    PriorityLevel,
    QueueEntry,
    QueueEntryStatus, 
    WaitlistOutcome,
    Notification,
    NotificationKind,
} from "./generated/prisma/client.js";
import { users, services } from "./data/store.js";
import type { ServiceInput } from './types.js'

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
    return users.find(user => user.id === id)
}

export interface NewUserInput {
    email: string
    passwordHash: string
    role: UserRole
}

export async function createUser(input: NewUserInput): Promise<User> {
    const user: User = {
        id: `user-${users.length + 1}`,
        ...input,
    }
    users.push(user)
    return user
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
