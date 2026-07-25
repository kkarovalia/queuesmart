import { users, services } from "./data/store.js";
import type { User, UserRole, Service, ServiceInput } from './types.js'

// Any fake database stubs for A3 should go here.
// For A4, these should be changed to real queries.

export async function getUserByEmail(email: string): Promise<User | undefined> {
    return users.find(user => user.email === email)
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
