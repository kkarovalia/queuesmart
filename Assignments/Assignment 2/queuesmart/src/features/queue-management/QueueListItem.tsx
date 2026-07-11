import type { DragEvent } from "react";
import type { QueueEntry } from "../../contracts/types";

interface QueueListItemProps {
    position: number
    queueEntry: QueueEntry & { isPending?: boolean }
    onDragStart: (e: DragEvent<HTMLLIElement>) => void
    onDragOver: (e: DragEvent<HTMLLIElement>) => void
    onDrop: (e: DragEvent<HTMLLIElement>) => void
    onDragEnd: (e: DragEvent<HTMLLIElement>) => void
    isDragging: boolean
}

export function QueueListItem({
    position, queueEntry, onDragStart, onDragOver, onDrop, onDragEnd, isDragging,
}: QueueListItemProps) {
    return (
        <li
            className={`service-list-item${isDragging ? ' service-list-item--dragging' : ''}`}
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
        >
            <div className="service-list-item__info">
                <div className="service-list-item__heading">
                    <span className="service-list-item__name">
                        {position}. {queueEntry.customerName}
                        {queueEntry.isPending && <em className="service-list-item__pending-tag"> (unsaved)</em>}
                    </span>
                </div>
                <p className="service-list-item__description">
                    {queueEntry.isPending ? 'Not yet saved' : `Joined at ${queueEntry.joinedAt}`}
                </p>
            </div>
        </li>
    )
}