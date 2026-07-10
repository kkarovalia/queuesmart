import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  mockServices,
  mockActiveQueueEntry,
  mockHistory,
  mockNotifications,
} from './data/mockData';
import type { Service, QueueEntry, HistoryRecord, AppNotification } from './contracts/types';

interface User {
    id: string;
    name: string;
    admin: boolean; // Hint to the UI. Does not grant perms in API calls.
}

async function getSessionID(): Promise<string> {
    return "thisisatest";
}

async function fetchUser(): Promise<User | null> {
    const sessionID = await getSessionID();
    void sessionID; // not used yet - will be sent with the real API call in A3
    

    await new Promise(r => setTimeout(r, 5000)); // Fake load delay to test spinners. Pls delete later.

    return {
        id: "123",
        name: "AUser",
        admin: true
    }
}

export type UserQuery = UseQueryResult<NoInfer<User | null>, Error>;

export function useUser(): UserQuery {
    return useQuery({
        queryKey: ['user'], // Whatever is returned by queryFn is stored globally under this key.
        queryFn: fetchUser,
        retry: false,
        staleTime: 5 * 60 * 1000,
    })
}

async function fetchServices(): Promise<Service[]> {
  await new Promise((r) => setTimeout(r, 300));
  return mockServices;
}

export type ServicesQuery = UseQueryResult<NoInfer<Service[]>, Error>;

export function useServices(): ServicesQuery {
  return useQuery({
    queryKey: ['services'],
    queryFn: fetchServices,
    retry: false,
    staleTime: 60 * 1000,
  });
}

async function fetchActiveQueueEntry(): Promise<QueueEntry | null> {
  await new Promise((r) => setTimeout(r, 300));
  return mockActiveQueueEntry;
}

export type ActiveQueueQuery = UseQueryResult<NoInfer<QueueEntry | null>, Error>;

export function useActiveQueueEntry(): ActiveQueueQuery {
  return useQuery({
    queryKey: ['active-queue'],
    queryFn: fetchActiveQueueEntry,
    retry: false,
    staleTime: 10 * 1000, // queue position changes often, keep this short
  });
}

async function fetchHistory(): Promise<HistoryRecord[]> {
  await new Promise((r) => setTimeout(r, 300));
  return mockHistory;
}

export type HistoryQuery = UseQueryResult<NoInfer<HistoryRecord[]>, Error>;

export function useHistory(): HistoryQuery {
  return useQuery({
    queryKey: ['history'],
    queryFn: fetchHistory,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

async function fetchNotifications(): Promise<AppNotification[]> {
  await new Promise((r) => setTimeout(r, 300));
  return mockNotifications;
}

export type NotificationsQuery = UseQueryResult<NoInfer<AppNotification[]>, Error>;

export function useNotifications(): NotificationsQuery {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    retry: false,
    staleTime: 30 * 1000,
  });
}
