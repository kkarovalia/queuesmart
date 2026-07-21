import { useState, type FormEvent } from 'react'
import { CalendarDays, CheckCircle2, Clock3, UsersRound } from 'lucide-react'
import { useCancelReservation, useCreateReservation, useReservations, useTables } from '../../api'
import './customer-reservations.css'

type Errors = { partySize?: string; dateTime?: string }

function defaultReservationDate() {
    const date = new Date()
    date.setDate(date.getDate() + 2)
    date.setHours(19, 0, 0, 0)
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function CustomerReservationsPage() {
    const reservationsQuery = useReservations()
    const tablesQuery = useTables()
    const createReservation = useCreateReservation()
    const cancelReservation = useCancelReservation()
    const [partySize, setPartySize] = useState('4')
    const [dateTime, setDateTime] = useState(defaultReservationDate)
    const [tableId, setTableId] = useState('')
    const [errors, setErrors] = useState<Errors>({})
    const [confirmed, setConfirmed] = useState(false)
    const reservations = (reservationsQuery.data ?? []).filter(item => item.customerName === 'Jamie Lee')

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const nextErrors: Errors = {}
        const party = Number(partySize)
        if (!partySize || !Number.isInteger(party) || party < 1 || party > 20) nextErrors.partySize = 'Enter a party size from 1 to 20.'
        if (!dateTime) nextErrors.dateTime = 'Choose a reservation date and time.'
        else if (new Date(dateTime).getTime() <= Date.now()) nextErrors.dateTime = 'Choose a future date and time.'
        setErrors(nextErrors)
        if (Object.keys(nextErrors).length > 0) return
        createReservation.mutate({ customerName: 'Jamie Lee', partySize: party, dateTime: new Date(dateTime).toISOString(), tableId: tableId || null }, { onSuccess: () => setConfirmed(true) })
    }

    return <section className="customer-reservations page">
        <header className="page-header"><div><h1>Reservations</h1><p>Book a table for a future visit. Reservations do not enter the walk-in queue.</p></div></header>
        <div className="reservation-layout">
            <div className="reservation-booking panel"><h2>Book a table</h2><form onSubmit={submit} noValidate>
                <label className="field"><span className="field-label">Party size</span><div className="input-with-icon"><UsersRound size={17} /><input type="number" min="1" max="20" value={partySize} onChange={event => setPartySize(event.target.value)} /></div>{errors.partySize ? <span className="field-error">{errors.partySize}</span> : null}</label>
                <label className="field"><span className="field-label">Date and time</span><div className="input-with-icon"><Clock3 size={17} /><input type="datetime-local" value={dateTime} onChange={event => setDateTime(event.target.value)} /></div>{errors.dateTime ? <span className="field-error">{errors.dateTime}</span> : null}</label>
                <label className="field"><span className="field-label">Table preference</span><select value={tableId} onChange={event => setTableId(event.target.value)}><option value="">No preference</option>{(tablesQuery.data ?? []).filter(table => table.status === 'available').map(table => <option value={table.id} key={table.id}>{table.label} · {table.section} · seats {table.seats}</option>)}</select></label>
                <button className="primary-button" type="submit" disabled={createReservation.isPending}>{createReservation.isPending ? 'Booking...' : 'Reserve table'}</button>
                {confirmed ? <p className="reservation-success" role="status"><CheckCircle2 size={17} /> Reservation confirmed.</p> : null}
            </form></div>

            <div className="reservation-list"><h2>My reservations</h2>{reservationsQuery.isLoading ? <p>Loading reservations...</p> : reservations.length === 0 ? <div className="panel empty-state"><CalendarDays /><p>No reservations yet.</p></div> : reservations.map(reservation => {
                const table = tablesQuery.data?.find(item => item.id === reservation.tableId)
                return <article className="reservation-item panel" key={reservation.id}><div className="reservation-item__date"><span>{new Date(reservation.dateTime).toLocaleDateString('en-US', { month: 'short' })}</span><strong>{new Date(reservation.dateTime).getDate()}</strong></div><div><h3>Bistro 42</h3><p>{new Date(reservation.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · Party of {reservation.partySize}</p><small>{table?.label ?? 'Table assigned on arrival'}</small></div><div className="reservation-item__actions"><span className={`reservation-state ${reservation.status}`}>{reservation.status}</span>{reservation.status === 'confirmed' ? <button type="button" onClick={() => cancelReservation.mutate(reservation.id)} disabled={cancelReservation.isPending}>Cancel</button> : null}</div></article>
            })}</div>
        </div>
    </section>
}
