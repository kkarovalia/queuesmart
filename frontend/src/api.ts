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
    MyQueueStatus,
    WaitlistHistoryRecord,
    WaitlistOutcome,
    AdminHistoryRecord,
    PriorityLevel,
    ReportFilters,
    UserParticipationRow,
    ServiceActivityRow,
    UsageSummaryReport,
} from './contracts/types';

import type { QueueNotification } from './types/queue';

import {
    mockQueueEntries,
    mockTables,
    mockReservations,
    mockMyQueueStatus,
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

// --- Queue Management (backend/src/modules/queue/router.ts) ---
// Wire format: entries carry a resolved `priority` and, on the list endpoint
// only, a 1-based `position` — both computed server-side so the UI never has
// to re-derive the ordering rules (priority, then arrival time).
export interface QueueEntryView {
    id: string;
    serviceId: string;
    userId: string;
    partySize: number;
    priority: PriorityLevel;
    status: 'waiting' | 'almost-ready' | 'served' | 'left';
    joinedAt: string;
    servedAt: string | null;
    position?: number;
}

async function fetchQueueForService(serviceId: string): Promise<QueueEntryView[]> {
    const response = await fetch(`${API_BASE_URL}/api/queue/${serviceId}`, { headers: authHeaders() });
    if (!response.ok) await parseApiError(response);
    return response.json();
}

export type QueueForServiceQuery = UseQueryResult<NoInfer<QueueEntryView[]>, Error>;

export function useQueueForService(serviceId: string): QueueForServiceQuery {
    return useQuery({
        queryKey: ['queueForService', serviceId],
        queryFn: () => fetchQueueForService(serviceId),
        staleTime: 15 * 1000,
    })
}

interface JoinQueueArgs {
    serviceId: string;
    partySize: number;
}

export async function joinQueue({ serviceId, partySize }: JoinQueueArgs): Promise<QueueEntryView> {
    const response = await fetch(`${API_BASE_URL}/api/queue/${serviceId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ partySize }),
    });
    if (!response.ok) await parseApiError(response);
    return response.json();
}

interface LeaveQueueArgs {
    serviceId: string;
}

export async function leaveQueue({ serviceId }: LeaveQueueArgs): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/queue/${serviceId}/leave`, {
        method: 'POST',
        headers: authHeaders(),
    });
    if (!response.ok) await parseApiError(response);
}

interface ServeNextResult {
    served: QueueEntryView;
    nowAlmostReady: QueueEntryView | null;
}

async function serveNextInQueue(serviceId: string): Promise<ServeNextResult> {
    const response = await fetch(`${API_BASE_URL}/api/queue/${serviceId}/serve-next`, {
        method: 'POST',
        headers: authHeaders(),
    });
    if (!response.ok) await parseApiError(response);
    return response.json();
}

export type ServeNextMutation = UseMutationResult<NoInfer<ServeNextResult>, Error, void>;

export function useServeNextInQueue(serviceId: string): ServeNextMutation {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => serveNextInQueue(serviceId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queueForService', serviceId] });
        },
    })
}

// --- Wait-Time Estimation (backend/src/modules/wait-time/router.ts) ---
export interface EntryWaitStatus {
    entryId: string;
    serviceId: string;
    position: number;
    estimatedWaitMinutes: number;
}

// Returns null once the entry is no longer active (served/left) or never
// existed — the backend tells those apart via 400 vs 404, but the customer
// queue-status screen just needs to know "still waiting or not" either way.
export async function fetchEntryWaitStatus(serviceId: string, entryId: string): Promise<EntryWaitStatus | null> {
    const response = await fetch(`${API_BASE_URL}/api/wait-time/${serviceId}/entry/${entryId}`, {
        headers: authHeaders(),
    });
    if (response.status === 400 || response.status === 404) return null;
    if (!response.ok) await parseApiError(response);
    return response.json();
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

// --- Notifications (backend/src/modules/notifications/router.ts) ---
// Backend only stores a `kind` + generated `message`; map kind -> the
// title/tone the UI displays.
const NOTIFICATION_DISPLAY: Record<string, { title: string; tone: QueueNotification['tone'] }> = {
    'queue-joined': { title: 'You joined the waitlist', tone: 'success' },
    'almost-ready': { title: "You're almost ready", tone: 'warning' },
    served: { title: 'Your table is ready', tone: 'success' },
};

interface BackendNotification {
    id: string;
    userId: string;
    kind: string;
    message: string;
    createdAt: string;
    read: boolean;
}

async function fetchNotifications(userId: string): Promise<QueueNotification[]> {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${userId}`);
    if (!response.ok) await parseApiError(response);
    const records: BackendNotification[] = await response.json();
    return records.map(record => ({
        id: record.id,
        title: NOTIFICATION_DISPLAY[record.kind]?.title ?? 'Notification',
        message: record.message,
        createdAt: record.createdAt,
        read: record.read,
        tone: NOTIFICATION_DISPLAY[record.kind]?.tone ?? 'info',
    }));
}

export type NotificationsQuery = UseQueryResult<NoInfer<QueueNotification[]>, Error>;

export function useNotifications(userId: string | undefined): NotificationsQuery {
    return useQuery({
        queryKey: ['notifications', userId],
        queryFn: () => fetchNotifications(userId!),
        enabled: Boolean(userId),
        staleTime: 15 * 1000,
    })
}

async function markNotificationRead(notificationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, { method: 'POST' });
    if (!response.ok) await parseApiError(response);
}

export type MarkNotificationReadMutation = UseMutationResult<NoInfer<void>, Error, string>;

export function useMarkNotificationRead(): MarkNotificationReadMutation {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: markNotificationRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    })
}

// --- Reporting (backend/src/modules/reports, real endpoint, frizzle) ---
// Three separate reports, matching the assignment's three required report
// contents. Admin-only, 401/403 handled the same way authHeaders() and
// parseApiError already handle every other admin endpoint. from/to/serviceId
// are all optional on the backend; 'all' here just means "don't send the
// serviceId param at all."

function reportQueryString(filters: ReportFilters, extra?: Record<string, string>): string {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.serviceId !== 'all') params.set('serviceId', filters.serviceId);
    if (extra) for (const [key, value] of Object.entries(extra)) params.set(key, value);
    return params.toString();
}

async function fetchUserParticipationReport(filters: ReportFilters): Promise<UserParticipationRow[]> {
    const response = await fetch(`${API_BASE_URL}/api/reports/users?${reportQueryString(filters)}`, {
        headers: authHeaders(),
    });
    if (!response.ok) await parseApiError(response);
    return response.json();
}

async function fetchServiceActivityReport(filters: ReportFilters): Promise<ServiceActivityRow[]> {
    const response = await fetch(`${API_BASE_URL}/api/reports/services?${reportQueryString(filters)}`, {
        headers: authHeaders(),
    });
    if (!response.ok) await parseApiError(response);
    return response.json();
}

async function fetchUsageSummaryReport(filters: ReportFilters): Promise<UsageSummaryReport> {
    const response = await fetch(`${API_BASE_URL}/api/reports/summary?${reportQueryString(filters)}`, {
        headers: authHeaders(),
    });
    if (!response.ok) await parseApiError(response);
    return response.json();
}

export interface FullReport {
    participation: UserParticipationRow[];
    services: ServiceActivityRow[];
    summary: UsageSummaryReport;
}

async function generateFullReport(filters: ReportFilters): Promise<FullReport> {
    const [participation, services, summary] = await Promise.all([
        fetchUserParticipationReport(filters),
        fetchServiceActivityReport(filters),
        fetchUsageSummaryReport(filters),
    ]);
    return { participation, services, summary };
}

export type GenerateReportMutation = UseMutationResult<NoInfer<FullReport>, Error, ReportFilters>;

export function useGenerateReport(): GenerateReportMutation {
    return useMutation({
        mutationFn: generateFullReport,
    })
}

// CSV download hits the same endpoints with format=csv, which makes the
// backend return a real file (Content-Disposition: attachment) instead of
// JSON, per reports/router.ts. No client-side CSV building needed, unlike
// the earlier mock version of this feature.
export type ReportKind = 'users' | 'services' | 'summary';

const REPORT_FILENAMES: Record<ReportKind, string> = {
    users: 'user-participation-report',
    services: 'service-activity-report',
    summary: 'usage-summary-report',
};

export async function downloadReportCsv(kind: ReportKind, filters: ReportFilters): Promise<void> {
    const query = reportQueryString(filters, { format: 'csv' });
    const response = await fetch(`${API_BASE_URL}/api/reports/${kind}?${query}`, {
        headers: authHeaders(),
    });
    if (!response.ok) await parseApiError(response);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${REPORT_FILENAMES[kind]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}
