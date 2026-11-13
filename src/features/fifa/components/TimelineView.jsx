//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: TimelineView.jsx
//  Description: When the positions appeared, on one line for all the associations the filters let through: a position that changed is
//               labelled, the others are dots, a hollow dashed dot is a day with Uncertain signals and no position. Under it the same
//               dates as a list, which is also how a screen reader reads them
//

import {useMemo} from "react";
import {PositionTimeline} from "@/features/fifa/components/PositionTimeline.jsx";
import {eventsOf} from "@/features/fifa/timelineEvents.js";

const dateOf = (at) => new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});

export const TimelineView = ({rows, scope, levels, subjects, onSelect}) => {
    const events = useMemo(() => eventsOf(rows, scope, levels, subjects), [rows, scope, levels, subjects]);
    const latest = useMemo(() => [...events].sort((a, b) => +new Date(b.at) - +new Date(a.at)), [events]);
    return (
        <div>
            <p className="caption mb-4 max-w-[70ch]">
                Each marker is the date a position appeared in the news (labelled when it changed). A hollow dashed marker is a day with
                Uncertain signals and no position. The history starts when this page started reading the news: it grows from there.
            </p>
            <PositionTimeline events={events} onSelect={event => onSelect(event.qid)} label="Positions of the associations on a timeline"/>
            {latest.length > 0 && (
                <ol aria-label="Positions by date" className="mt-6 border-t border-rule">
                    {latest.slice(0, 40).map(event => (
                        <li key={event.id}>
                            <button type="button" onClick={() => onSelect(event.qid)} className="flex w-full cursor-pointer flex-wrap gap-x-4 border-b border-rule px-2 py-2.5 text-left text-[0.875rem] transition-colors hover:bg-paper-deep">
                                <span className="w-28 shrink-0 text-ink-mute tabular-nums">{dateOf(event.at)}</span>
                                <span className="min-w-0 flex-1">{event.text}</span>
                            </button>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
};
