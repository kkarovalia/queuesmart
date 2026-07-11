import { useState } from "react";
import type { DragEvent } from "react";
import { useService, useQueueEntries, useReorderQueueEntries, useAddQueueEntry } from "../../api";
import { QueueListItem } from "./QueueListItem";
import type { QueueEntry } from "../../contracts/types";
import "./queue-management.css";

interface QueueManagementPageProps {
    serviceId: string
}

type DraftEntry = QueueEntry & { isPending?: boolean }

export function QueueManagementPage({ serviceId }: QueueManagementPageProps) {
    const service = useService(serviceId)
    const queueEntries = useQueueEntries(serviceId)
    const reorder = useReorderQueueEntries(serviceId)
    const addEntry = useAddQueueEntry(serviceId)

    const [workingEntries, setWorkingEntries] = useState<DraftEntry[] | null>(null)
    const [dragIndex, setDragIndex] = useState<number | null>(null)
    const [customerName, setCustomerName] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const [prevServiceId, setPrevServiceId] = useState(serviceId)
    if (serviceId !== prevServiceId) {
        setPrevServiceId(serviceId)
        setWorkingEntries(null)
    }

    const displayedEntries: DraftEntry[] = workingEntries ?? queueEntries.data ?? []
    const isDirty = workingEntries !== null

    const originalPositions = new Map<string, number>()
        ; (queueEntries.data ?? []).forEach((entry, idx) => {
            originalPositions.set(entry.id, idx + 1)
        })

    const handleDragStart = (index: number) => (e: DragEvent<HTMLLIElement>) => {
        setDragIndex(index)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (index: number) => (e: DragEvent<HTMLLIElement>) => {
        e.preventDefault()
        if (dragIndex === null || dragIndex === index) return

        setWorkingEntries((current) => {
            const base = current ?? queueEntries.data ?? []
            const updated = [...base]
            const [moved] = updated.splice(dragIndex, 1)
            updated.splice(index, 0, moved)
            return updated
        })
        setDragIndex(index)
    }

    const handleDrop = (e: DragEvent<HTMLLIElement>) => {
        e.preventDefault()
    }

    const handleDragEnd = () => {
        setDragIndex(null)
    }

    const canAdd = customerName.trim().length > 0 && !isSaving

    const handleAdd = (insertAtFront: boolean) => {
        const trimmed = customerName.trim()
        if (!trimmed) return

        const placeholder: DraftEntry = {
            id: `pending-${crypto.randomUUID()}`,
            serviceId,
            customerName: trimmed,
            joinedAt: '',
            isPending: true,
        }

        setWorkingEntries((current) => {
            const base = current ?? queueEntries.data ?? []
            return insertAtFront ? [placeholder, ...base] : [...base, placeholder]
        })
        setCustomerName('')
    }

    const handleUndo = () => {
        setWorkingEntries(null)
    }

    const handleSave = async () => {
        if (!workingEntries) return
        setIsSaving(true)
        try {
            const finalEntries: QueueEntry[] = []
            for (const entry of workingEntries) {
                if (entry.isPending) {
                    const created = await addEntry.mutateAsync({
                        customerName: entry.customerName,
                        insertAtFront: false,
                    })
                    finalEntries.push(created)
                } else {
                    finalEntries.push(entry)
                }
            }
            await reorder.mutateAsync(finalEntries)
            setWorkingEntries(null)
        } catch {
            // ...
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="admin-dashboard">
            <div className="queue-management__toolbar">
                <h1>Queue Management</h1>
                <div className="queue-management__toolbar-actions">
                    <button onClick={handleUndo} disabled={!isDirty || isSaving}>
                        Undo
                    </button>
                    <button onClick={handleSave} disabled={!isDirty || isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            <div className="queue-management__add-entry">
                <div className="queue-management__add-entry-field">
                    <label htmlFor="new-customer-name">Customer Name</label>
                    <input
                        id="new-customer-name"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        disabled={isSaving}
                    />
                </div>
                <div className="queue-management__add-entry-buttons">
                    <button onClick={() => handleAdd(true)} disabled={!canAdd}>
                        Add to Front
                    </button>
                    <button onClick={() => handleAdd(false)} disabled={!canAdd}>
                        Add to Back
                    </button>
                </div>
            </div>

            {(addEntry.isError || reorder.isError) && (
                <p role="alert">Failed to save changes. Your edits are still here — try Save again.</p>
            )}
            {(service.isLoading || queueEntries.isLoading) && <p>Loading queue...</p>}
            {(service.isError || queueEntries.isError) && <p role="alert">Failed to load queue.</p>}

            {displayedEntries.length > 0 && (
                <ul className="admin-dashboard__list">
                    {displayedEntries.map((entry, idx) => (
                        <QueueListItem
                            key={entry.id}
                            position={originalPositions.get(entry.id) ?? idx + 1}
                            queueEntry={entry}
                            onDragStart={handleDragStart(idx)}
                            onDragOver={handleDragOver(idx)}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            isDragging={dragIndex === idx}
                        />
                    ))}
                </ul>
            )}
        </div>
    )
}