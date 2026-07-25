import { users } from "./data/store.js";
import type { User, UserRole } from "./types.js";

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