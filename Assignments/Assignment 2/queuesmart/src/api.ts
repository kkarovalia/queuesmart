// Try to keep all api calls in here for convenience and organization
// All stubs should be replaced with requests for assignment 3

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

interface User {
    id: string;
    name: string;
    admin: boolean; // Hint to the UI. Does not grant perms in API calls.
}

async function getSessionID(): Promise<string> {
    // TODO
    return "thisisatest";
}

async function fetchUser(): Promise<User | null> {
    const sessionID = await getSessionID();
    
    // Do some api call w/ session id where the actual user is retrieved, or fails to do so

    await new Promise(r => setTimeout(r, 5000)); // Fake load delay to test spinners. Pls delete later.

    // Placeholder user
    return {
        id: "123",
        name: "AUser",
        admin: true
    }
}

export type UserQuery = UseQueryResult<NoInfer<User | null>, Error>;

// Actual function meant for react component
export function useUser(): UserQuery {
    return useQuery({
        queryKey: ['user'], // Whatever is returned by queryFn is stored globally under this key.
        queryFn: fetchUser,
        retry: false,
        staleTime: 5 * 60 * 1000,
    })
}