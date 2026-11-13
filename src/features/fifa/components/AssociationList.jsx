//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: AssociationList.jsx
//  Description: The associations as a list, one row each, in text: its country, its code, its confederation and the position the map
//               colours (with the words). The accessible equivalent of the map, and the list beside it in "Map & list". Also the
//               collapsible list of the small associations and territories the map draws as markers
//

import {useState} from "react";
import {ChevronDown} from "lucide-react";
import {Badge} from "@/components/ui/badge.jsx";
import {Swatch} from "@/features/fifa/components/Swatch.jsx";
import {sortedRows} from "@/features/fifa/positions.js";
import {cn} from "@/lib/utils.js";

const Row = ({row, selected, onSelect, compact}) => {
    const {member, described} = row;
    return (
        <li className="lazy-row">
            <button type="button" onClick={() => onSelect(member.qid)} aria-current={selected ? 'true' : undefined}
                    aria-label={`${member.name}, ${member.fifa}: ${described.label}. Open the sheet`}
                    className={cn('grid w-full cursor-pointer items-center gap-x-4 gap-y-1 border-b border-rule px-2 py-3 text-left transition-colors hover:bg-paper-deep',
                        selected && 'bg-paper-deep',
                        compact ? 'grid-cols-[minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,2.2fr)_5.5rem_minmax(0,2.4fr)_9rem]')}>
                <span className="min-w-0">
                    <span className="block truncate text-[1rem] font-medium text-ink">{member.name}</span>
                    <span className="block truncate text-[0.8125rem] text-ink-mute">{member.fifa} · {member.confederation}{compact ? '' : ` · ${member.association}`}</span>
                </span>
                {!compact && <span className="hidden text-[0.8125rem] text-ink-mute md:block">{member.confederation}</span>}
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[0.875rem] text-ink">
                    <Swatch fill={described.fill} ring={described.ring}/>
                    <span className="min-w-0">{described.label}</span>
                    {described.byReader && <Badge tone="quiet" className="!px-2 !py-0.5 !text-[0.75rem]">Set by a reader</Badge>}
                    {described.promoted && <Badge tone="quiet" className="!px-2 !py-0.5 !text-[0.75rem]">Confirmed by a reader</Badge>}
                    {described.uncertain > 0 && described.category !== 'uncertain' && <Badge tone="uncertain" className="!px-2 !py-0.5 !text-[0.75rem]">{described.uncertain} uncertain</Badge>}
                </span>
                {!compact && (
                    <span className="hidden text-[0.8125rem] text-ink-mute tabular md:block">
                        {described.coverage.articles} {described.coverage.articles === 1 ? 'article' : 'articles'}
                    </span>
                )}
            </button>
        </li>
    );
};

// rows: [{member, described}] already filtered. compact: the narrow list beside the map
export const AssociationList = ({rows, selected, onSelect, compact = false, presorted = false}) => {
    const sorted = presorted ? rows : sortedRows(rows);
    if (sorted.length === 0) {
        return <p className="py-10 text-center text-[1rem] text-ink-mute">No association matches these choices.</p>;
    }
    return (
        <div>
            {!compact && (
                <div aria-hidden className="hidden grid-cols-[minmax(0,2.2fr)_5.5rem_minmax(0,2.4fr)_9rem] gap-x-4 border-b border-rule px-2 pb-2 text-[0.75rem] font-medium text-ink-mute md:grid">
                    <span>Association</span><span>Confederation</span><span>Position</span><span>Sources, 30 days</span>
                </div>
            )}
            <ul aria-label={`${sorted.length} associations`}>
                {sorted.map(row => <Row key={row.member.qid} row={row} selected={row.member.qid === selected} onSelect={onSelect} compact={compact}/>)}
            </ul>
        </div>
    );
};

// The members the map draws as a marker (too small for a polygon or none): a list that opens, so a touch never has to find them
// among the others. rows: [{member, described, visible}] of the markers
export const SmallAssociations = ({rows, selected, onSelect}) => {
    const [open, setOpen] = useState(false);
    if (rows.length === 0) return null;
    return (
        <section className="mt-6">
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="fifa-small"
                    className="inline-flex cursor-pointer items-center gap-2 text-[0.9375rem] font-medium text-ink hover:text-ink-mute">
                <ChevronDown aria-hidden className={cn('size-4 transition-transform', open && 'rotate-180')}/>
                Small associations and territories <span className="font-normal text-ink-mute tabular-nums">{rows.length}</span>
            </button>
            {open && (
                <ul id="fifa-small" className="mt-3 flex flex-wrap gap-2">
                    {rows.map(({member, described, visible}) => (
                        <li key={member.qid}>
                            <button type="button" onClick={() => onSelect(member.qid)} aria-label={`${member.name}, ${member.fifa}: ${described.label}. Open the sheet`}
                                    aria-current={member.qid === selected ? 'true' : undefined}
                                    className={cn('inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-rule px-3 py-1 text-[0.8125rem] text-ink transition-colors hover:border-ink-mute',
                                        member.qid === selected && 'bg-paper-deep', !visible && 'opacity-40')}>
                                <Swatch fill={described.fill} ring={described.ring}/>
                                {member.name} <span className="text-ink-mute">{member.fifa}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};
