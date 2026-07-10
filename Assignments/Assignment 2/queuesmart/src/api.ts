// Try to keep all api calls in here for convenience and organization
// All stubs should be replaced with requests for assignment 3

import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import type { Service, ServiceFormInput, Table, TableFormInput, Reservation, ReservationFormInput } from './contracts/types';
import { mockServices, mockQueueEntries, mockTables, mockReservations } from './data/mockData';

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
    await getSessionID();

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

// --- Admin Services ---

const FAKE_DELAY_MS = 500;

async function fetchServices(): Promise<Service[]> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    return mockServices;
}

export type ServicesQuery = UseQueryResult<NoInfer<Service[]>, Error>;

export function useServices(): ServicesQuery {
    return useQuery({
        queryKey: ['services'],
        queryFn: fetchServices,
        staleTime: 60 * 1000,
    })
}

async function fetchQueueLengths(): Promise<Record<string, number>> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    const lengths: Record<string, number> = {};
    for (const entry of mockQueueEntries) {
        lengths[entry.serviceId] = (lengths[entry.serviceId] ?? 0) + 1;
    }
    return lengths;
}

export type QueueLengthsQuery = UseQueryResult<NoInfer<Record<string, number>>, Error>;

export function useQueueLengths(): QueueLengthsQuery {
    return useQuery({
        queryKey: ['queueLengths'],
        queryFn: fetchQueueLengths,
        staleTime: 60 * 1000,
    })
}

async function fetchService(id: string): Promise<Service | null> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    return mockServices.find(s => s.id === id) ?? null;
}

export type ServiceQuery = UseQueryResult<NoInfer<Service | null>, Error>;

export function useService(id: string): ServiceQuery {
    return useQuery({
        queryKey: ['services', id],
        queryFn: () => fetchService(id),
        staleTime: 60 * 1000,
    })
}

async function toggleServiceStatus(id: string): Promise<Service> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    const service = mockServices.find(s => s.id === id);
    if (!service) {
        throw new Error(`Service ${id} not found`);
    }
    service.status = service.status === 'open' ? 'closed' : 'open';
    return service;
}

export type ToggleServiceStatusMutation = UseMutationResult<NoInfer<Service>, Error, string>;

export function useToggleServiceStatus(): ToggleServiceStatusMutation {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: toggleServiceStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
        },
    })
}

interface UpdateServiceArgs {
    id: string;
    input: ServiceFormInput;
}

async function updateService({ id, input }: UpdateServiceArgs): Promise<Service> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    const service = mockServices.find(s => s.id === id);
    if (!service) {
        throw new Error(`Service ${id} not found`);
    }
    Object.assign(service, input);
    return service;
}

export type UpdateServiceMutation = UseMutationResult<NoInfer<Service>, Error, UpdateServiceArgs>;

export function useUpdateService(): UpdateServiceMutation {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateService,
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
            queryClient.invalidateQueries({ queryKey: ['services', variables.id] });
        },
    })
}

// --- Table Management (Restaurant Builder) ---

async function fetchTables(): Promise<Table[]> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    return mockTables;
}

export type TablesQuery = UseQueryResult<NoInfer<Table[]>, Error>;

export function useTables(): TablesQuery {
    return useQuery({
        queryKey: ['tables'],
        queryFn: fetchTables,
        staleTime: 60 * 1000,
    })
}

async function fetchTable(id: string): Promise<Table | null> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    return mockTables.find(t => t.id === id) ?? null;
}

export type TableQuery = UseQueryResult<NoInfer<Table | null>, Error>;

export function useTable(id: string): TableQuery {
    return useQuery({
        queryKey: ['tables', id],
        queryFn: () => fetchTable(id),
        staleTime: 60 * 1000,
    })
}

async function createTable(input: TableFormInput): Promise<Table> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    const table: Table = {
        id: crypto.randomUUID(),
        status: 'available',
        ...input,
    };
    mockTables.push(table);
    return table;
}

export type CreateTableMutation = UseMutationResult<NoInfer<Table>, Error, TableFormInput>;

export function useCreateTable(): CreateTableMutation {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTable,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        },
    })
}

interface UpdateTableArgs {
    id: string;
    input: TableFormInput;
}

async function updateTable({ id, input }: UpdateTableArgs): Promise<Table> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    const table = mockTables.find(t => t.id === id);
    if (!table) {
        throw new Error(`Table ${id} not found`);
    }
    Object.assign(table, input);
    return table;
}

export type UpdateTableMutation = UseMutationResult<NoInfer<Table>, Error, UpdateTableArgs>;

export function useUpdateTable(): UpdateTableMutation {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateTable,
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
            queryClient.invalidateQueries({ queryKey: ['tables', variables.id] });
        },
    })
}

async function deleteTable(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    const index = mockTables.findIndex(t => t.id === id);
    if (index === -1) {
        throw new Error(`Table ${id} not found`);
    }
    mockTables.splice(index, 1);
}

export type DeleteTableMutation = UseMutationResult<NoInfer<void>, Error, string>;

export function useDeleteTable(): DeleteTableMutation {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteTable,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        },
    })
}

// --- Reservation Management ---

async function fetchReservations(): Promise<Reservation[]> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    return mockReservations;
}

export type ReservationsQuery = UseQueryResult<NoInfer<Reservation[]>, Error>;

export function useReservations(): ReservationsQuery {
    return useQuery({
        queryKey: ['reservations'],
        queryFn: fetchReservations,
        staleTime: 60 * 1000,
    })
}

async function fetchReservation(id: string): Promise<Reservation | null> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    return mockReservations.find(r => r.id === id) ?? null;
}

export type ReservationQuery = UseQueryResult<NoInfer<Reservation | null>, Error>;

export function useReservation(id: string): ReservationQuery {
    return useQuery({
        queryKey: ['reservations', id],
        queryFn: () => fetchReservation(id),
        staleTime: 60 * 1000,
    })
}

async function createReservation(input: ReservationFormInput): Promise<Reservation> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    const reservation: Reservation = {
        id: crypto.randomUUID(),
        status: 'confirmed',
        ...input,
    };
    mockReservations.push(reservation);
    return reservation;
}

export type CreateReservationMutation = UseMutationResult<NoInfer<Reservation>, Error, ReservationFormInput>;

export function useCreateReservation(): CreateReservationMutation {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createReservation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
        },
    })
}

interface UpdateReservationArgs {
    id: string;
    input: ReservationFormInput;
}

async function updateReservation({ id, input }: UpdateReservationArgs): Promise<Reservation> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    const reservation = mockReservations.find(r => r.id === id);
    if (!reservation) {
        throw new Error(`Reservation ${id} not found`);
    }
    Object.assign(reservation, input);
    return reservation;
}

export type UpdateReservationMutation = UseMutationResult<NoInfer<Reservation>, Error, UpdateReservationArgs>;

export function useUpdateReservation(): UpdateReservationMutation {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateReservation,
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
            queryClient.invalidateQueries({ queryKey: ['reservations', variables.id] });
        },
    })
}

async function cancelReservation(id: string): Promise<Reservation> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    const reservation = mockReservations.find(r => r.id === id);
    if (!reservation) {
        throw new Error(`Reservation ${id} not found`);
    }
    reservation.status = 'cancelled';
    return reservation;
}

export type CancelReservationMutation = UseMutationResult<NoInfer<Reservation>, Error, string>;

export function useCancelReservation(): CancelReservationMutation {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: cancelReservation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
        },
    })
}