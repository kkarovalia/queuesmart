import { useState } from 'react'
import { BellRing, RotateCcw, Save, UserPlus } from 'lucide-react'
import { useAddQueueEntry, useQueueEntries, useReorderQueueEntries, useService } from '../../api'
import type { QueueEntry } from '../../contracts/types'
import { QueueListItem } from './QueueListItem'
import './queue-management.css'

type DraftEntry = QueueEntry & { isPending?: boolean }

export function QueueManagementPage({ serviceId }: { serviceId: string }) {
    const service = useService(serviceId)
    const queueEntries = useQueueEntries(serviceId)
    const reorder = useReorderQueueEntries(serviceId)
    const addEntry = useAddQueueEntry(serviceId)
    const [workingEntries, setWorkingEntries] = useState<DraftEntry[] | null>(null)
    const [customerName, setCustomerName] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [notice, setNotice] = useState('')
    const [previousServiceId, setPreviousServiceId] = useState(serviceId)
    if (serviceId !== previousServiceId) { setPreviousServiceId(serviceId); setWorkingEntries(null); setNotice('') }
    const displayedEntries = workingEntries ?? queueEntries.data ?? []

    function changeEntries(updater: (entries: DraftEntry[]) => DraftEntry[]) {
        setWorkingEntries(current => updater([...(current ?? queueEntries.data ?? [])]))
    }
    function move(index: number, offset: number) {
        changeEntries(entries => { const target = index + offset; if (target < 0 || target >= entries.length) return entries; [entries[index], entries[target]] = [entries[target], entries[index]]; return entries })
    }
    function remove(id: string) { changeEntries(entries => entries.filter(entry => entry.id !== id)); setNotice('Guest removed from the working queue.') }
    function serveNext() {
        if (displayedEntries.length === 0) return
        const served = displayedEntries[0]
        changeEntries(entries => entries.slice(1))
        setNotice(`${served.customerName} has been marked served.`)
    }
    function addToQueue() {
        const name = customerName.trim(); if (!name) return
        const entry: DraftEntry = { id: `pending-${crypto.randomUUID()}`, serviceId, customerName: name, joinedAt: new Date().toISOString(), partySize: 2, estimatedWaitMinutes: 30, isPending: true }
        changeEntries(entries => [...entries, entry]); setCustomerName(''); setNotice(`${name} added to the working queue.`)
    }
    async function save() {
        if (!workingEntries) return
        setIsSaving(true)
        try {
            const finalEntries: QueueEntry[] = []
            for (const entry of workingEntries) finalEntries.push(entry.isPending ? await addEntry.mutateAsync({ customerName: entry.customerName, insertAtFront: false }) : entry)
            await reorder.mutateAsync(finalEntries); setWorkingEntries(null); setNotice('Queue changes saved.')
        } finally { setIsSaving(false) }
    }

    if (service.isLoading || queueEntries.isLoading) return <p>Loading queue...</p>
    return <section className="queue-management page">
        <header className="page-header"><div><h1>{service.data?.name ?? 'Queue Management'}</h1><p>{displayedEntries.length} parties currently waiting.</p></div><div className="queue-management__header-actions"><button className="primary-button" type="button" onClick={serveNext} disabled={displayedEntries.length === 0}><BellRing size={17} />Serve next</button><button className="secondary-button" type="button" onClick={() => setWorkingEntries(null)} disabled={!workingEntries}><RotateCcw size={17} />Undo</button><button className="secondary-button" type="button" onClick={save} disabled={!workingEntries || isSaving}><Save size={17} />{isSaving ? 'Saving' : 'Save'}</button></div></header>

        <div className="queue-management__add panel"><label htmlFor="new-customer-name">Walk-in guest name</label><div><input id="new-customer-name" value={customerName} onChange={event => setCustomerName(event.target.value)} placeholder="Enter customer name" /><button className="secondary-button" type="button" onClick={addToQueue} disabled={!customerName.trim()}><UserPlus size={17} />Add to queue</button></div></div>
        {notice ? <p className="queue-management__notice" role="status">{notice}</p> : null}
        {(addEntry.isError || reorder.isError) ? <p role="alert">Failed to save changes. Your working queue is still available.</p> : null}

        <div className="queue-management__table panel"><div className="queue-row queue-row--head"><span>#</span><span>Guest</span><span>Party</span><span>Wait</span><span>Joined</span><span>Actions</span></div>{displayedEntries.length === 0 ? <div className="empty-state">No walk-in guests are waiting.</div> : <ol>{displayedEntries.map((entry, index) => <QueueListItem key={entry.id} position={index + 1} queueEntry={entry} onMoveUp={() => move(index, -1)} onMoveDown={() => move(index, 1)} onRemove={() => remove(entry.id)} canMoveUp={index > 0} canMoveDown={index < displayedEntries.length - 1} />)}</ol>}</div>
    </section>
}
