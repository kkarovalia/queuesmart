// Try to keep all api calls in here for convenience and organization
// All stubs should be replaced with requests for assignment 3

import {
    useQuery,
    useMutation,
    useQueryClient,
    type UseQueryResult,
    type UseMutationResult
} from '@tanstack/react-query';

import type {
    Service,
    ServiceFormInput,
    Table,
    TableFormInput,
    Reservation,
    ReservationFormInput,
    QueueEntry,
    MyQueueStatus,
    WaitlistHistoryRecord,
    WaitlistOutcome,
    AdminHistoryRecord,
    AppNotification,
    PriorityLevel,
} from './contracts/types';

import {
    mockQueueEntries,
    mockTables,
    mockReservations,
    mockMyQueueStatus,
    mockNotifications,
} from './data/mockData';

// A3 backend (Node/Express, see /backend). Override with VITE_API_URL for a
// non-default port; everything else in this file is still mock data pending
// each module's backend integration.
const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface User {
    id: string;
    email: string;
    role: 'user' | 'admin';
}

const TOKEN_STORAGE_KEY = 'queuesmart_token';

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function setToken(token: string): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

function clearToken(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function authHeaders(): HeadersInit {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseApiError(response: Response): Promise<never> {
    const body = await response.json().catch(() => null);
    const message = body?.details?.[0] ?? body?.error ?? `Request failed (${response.status})`;
    throw new Error(message);
}

async function fetchUser(): Promise<User | null> {
    const token = getToken();
    if (!token) return null;
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
        clearToken();
        return null;
    }
    if (!response.ok) {
        await parseApiError(response);
    }
    return response.json();
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

interface LoginInput {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    id: string;
    email: string;
    role: 'user' | 'admin';
}
 
async function login({ email, password }: LoginInput): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!response.ok) await parseApiError(response);
    return response.json();
}
 
export type LoginMutation = UseMutationResult<NoInfer<AuthResponse>, Error, LoginInput>;
 
export function useLogin(): LoginMutation {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: login,
        onSuccess: (data: AuthResponse) => {
            setToken(data.token);
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    })
}
 
interface RegisterInput {
    email: string;
    password: string;
}
 
async function register({ email, password }: RegisterInput): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!response.ok) await parseApiError(response);
    return response.json();
}
 
export type RegisterMutation = UseMutationResult<NoInfer<AuthResponse>, Error, RegisterInput>;
 
export function useRegister(): RegisterMutation {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: register,
        onSuccess: (data: AuthResponse) => {
            setToken(data.token);
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    })
}
 
export function useLogout(): () => void {
    const queryClient = useQueryClient();
    return () => {
        clearToken();
        queryClient.setQueryData(['user'], null);
    };
}

// --- Admin Services ---

const FAKE_DELAY_MS = 500;

interface BackendService {
    id: string;
    name: string;
    description: string;
    expectedDurationMinutes: number;
    priority: PriorityLevel;
    status: 'open' | 'closed';
}
 
function toFrontendService(service: BackendService): Service {
    return {
        ...service,
        estimatedWait: `${service.expectedDurationMinutes} min`,
        tablePreferenceLabel: 'Any available table',
    };
}
 
async function fetchServices(): Promise<Service[]> {
    const response = await fetch(`${API_BASE_URL}/api/services`);
    if (!response.ok) await parseApiError(response);
    const services: BackendService[] = await response.json();
    return services.map(toFrontendService);
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
    const services = await fetchServices();
    return services.find(s => s.id === id) ?? null;

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
    const response = await fetch(`${API_BASE_URL}/api/services/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
    });
    if (!response.ok) await parseApiError(response);
    return toFrontendService(await response.json());
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

async function createService(input: ServiceFormInput): Promise<Service> {
    const response = await fetch(`${API_BASE_URL}/api/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(input),
    });
    if (!response.ok) await parseApiError(response);
    return toFrontendService(await response.json());
}
 
export type CreateServiceMutation = UseMutationResult<NoInfer<Service>, Error, ServiceFormInput>;
 
export function useCreateService(): CreateServiceMutation {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createService,
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
    const response = await fetch(`${API_BASE_URL}/api/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(input),
    });
    if (!response.ok) await parseApiError(response);
    return toFrontendService(await response.json());
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

// --- Queue Management ---

// Note: This should be fine grained by service id on the backend to avoid large payloads
async function fetchQueueEntries(serviceId: string): Promise<QueueEntry[]> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    return mockQueueEntries.filter((entry) => entry.serviceId === serviceId);
}

export type QueueEntriesQuery = UseQueryResult<NoInfer<QueueEntry[] | null>, Error>;

export function useQueueEntries(serviceId: string): QueueEntriesQuery {
    return useQuery({
        queryKey: ['queueEntries', serviceId],
        queryFn: () => fetchQueueEntries(serviceId),
        staleTime: 60 * 1000,
    })
}

interface ReorderQueueEntriesArgs {
    serviceId: string;
    entries: QueueEntry[];
}

async function reorderQueueEntries({ serviceId, entries }: ReorderQueueEntriesArgs): Promise<QueueEntry[]> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    const otherEntries = mockQueueEntries.filter(e => e.serviceId !== serviceId);
    mockQueueEntries.length = 0;
    mockQueueEntries.push(...otherEntries, ...entries);
    return entries;
}

export type ReorderQueueEntriesMutation = UseMutationResult<NoInfer<QueueEntry[]>, Error, QueueEntry[]>;

export function useReorderQueueEntries(serviceId: string): ReorderQueueEntriesMutation {
    const queryClient = useQueryClient();
    const queryKey = ['queueEntries', serviceId];

    return useMutation({
        mutationFn: (entries: QueueEntry[]) => reorderQueueEntries({ serviceId, entries }),
        onMutate: async (entries) => {
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<QueueEntry[]>(queryKey);
            queryClient.setQueryData(queryKey, entries);
            return { previous };
        },
        onError: (_err, _entries, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKey, context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    })
}

interface AddQueueEntryArgs {
    serviceId: string;
    customerName: string;
    insertAtFront: boolean;
}

async function addQueueEntry({ serviceId, customerName, insertAtFront }: AddQueueEntryArgs): Promise<QueueEntry> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    const maxIdNum = mockQueueEntries.reduce((max, entry) => {
        const match = entry.id.match(/^q-(\d+)$/);
        return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    const newEntry: QueueEntry = {
        id: `q-${maxIdNum + 1}`,
        serviceId,
        customerName,
        joinedAt: new Date().toISOString(),
        partySize: 2,
        estimatedWaitMinutes: insertAtFront ? 5 : 30,
    };

    if (insertAtFront) {
        const firstIndexForService = mockQueueEntries.findIndex(e => e.serviceId === serviceId);
        if (firstIndexForService === -1) {
            mockQueueEntries.push(newEntry);
        } else {
            mockQueueEntries.splice(firstIndexForService, 0, newEntry);
        }
    } else {
        mockQueueEntries.push(newEntry);
    }

    return newEntry;
}

interface AddQueueEntryVariables {
    customerName: string;
    insertAtFront: boolean;
}

export type AddQueueEntryMutation = UseMutationResult<NoInfer<QueueEntry>, Error, AddQueueEntryVariables>;

export function useAddQueueEntry(serviceId: string): AddQueueEntryMutation {
    const queryClient = useQueryClient();
    const queryKey = ['queueEntries', serviceId];

    return useMutation({
        mutationFn: ({ customerName, insertAtFront }: AddQueueEntryVariables) =>
            addQueueEntry({ serviceId, customerName, insertAtFront }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ['queueLengths'] });
        },
    })
}

async function fetchMyQueueStatus(): Promise<MyQueueStatus | null> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    return mockMyQueueStatus;
}

export type MyQueueStatusQuery = UseQueryResult<NoInfer<MyQueueStatus | null>, Error>;

export function useMyQueueStatus(): MyQueueStatusQuery {
    return useQuery({
        queryKey: ['myQueueStatus'],
        queryFn: fetchMyQueueStatus,
        staleTime: 10 * 1000,
    })
}

// Wire format returned by the real backend (backend/src/modules/history/router.ts).
interface BackendHistoryRecord {
    id: string;
    serviceName: string;
    partySize: number;
    resolvedAt: string;
    outcome: WaitlistOutcome;
    waitMinutes: number;
}

async function fetchWaitlistHistory(): Promise<WaitlistHistoryRecord[]> {
    // TODO: use the real logged-in user's id once Ian's auth module issues sessions.
    const userId = '123';
    const response = await fetch(`${API_BASE_URL}/api/history/${userId}`);
    if (!response.ok) {
        throw new Error(`Failed to load history (${response.status})`);
    }
    const records: BackendHistoryRecord[] = await response.json();
    return records.map(record => ({
        id: record.id,
        serviceName: record.serviceName,
        date: record.resolvedAt,
        partySize: record.partySize,
        outcome: record.outcome,
        waitMinutes: record.waitMinutes,
    }));
}

export type WaitlistHistoryQuery = UseQueryResult<NoInfer<WaitlistHistoryRecord[]>, Error>;

export function useWaitlistHistory(): WaitlistHistoryQuery {
    return useQuery({
        queryKey: ['waitlistHistory'],
        queryFn: fetchWaitlistHistory,
        staleTime: 5 * 60 * 1000,
    })
}

// Admin view: every user's history at once (see backend/src/modules/history/router.ts's GET /).
interface BackendAdminHistoryRecord extends BackendHistoryRecord {
    customerEmail: string;
}

async function fetchAllHistory(): Promise<AdminHistoryRecord[]> {
    const response = await fetch(`${API_BASE_URL}/api/history`);
    if (!response.ok) {
        throw new Error(`Failed to load history (${response.status})`);
    }
    const records: BackendAdminHistoryRecord[] = await response.json();
    return records.map(record => ({
        id: record.id,
        serviceName: record.serviceName,
        date: record.resolvedAt,
        partySize: record.partySize,
        outcome: record.outcome,
        waitMinutes: record.waitMinutes,
        customerEmail: record.customerEmail,
    }));
}

export type AllHistoryQuery = UseQueryResult<NoInfer<AdminHistoryRecord[]>, Error>;

export function useAllHistory(): AllHistoryQuery {
    return useQuery({
        queryKey: ['allHistory'],
        queryFn: fetchAllHistory,
        staleTime: 60 * 1000,
    })
}

async function fetchNotifications(): Promise<AppNotification[]> {
    await new Promise(r => setTimeout(r, FAKE_DELAY_MS));
    return mockNotifications;
}

export type NotificationsQuery = UseQueryResult<NoInfer<AppNotification[]>, Error>;

export function useNotifications(): NotificationsQuery {
    return useQuery({
        queryKey: ['notifications'],
        queryFn: fetchNotifications,
        staleTime: 30 * 1000,
    })
}
