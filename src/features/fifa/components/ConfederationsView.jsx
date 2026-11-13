//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: ConfederationsView.jsx
//  Description: The six confederations in a table: their president, the position their own statements show, how many members they have and how many
//               of them support each candidate, are conflicting, Uncertain or have no position. A confederation does not vote in the election of the
//               president of FIFA; its member associations do, and a confederation speaks for itself, not for them. A row opens to list its members
//               (the list of the page, in its default order, each opening the sheet). The search bar finds a confederation (code, name,
//               president) and its members (association, country, code, president): a confederation with matching members opens on them and
//               says how many, the others go. Each column sorts; own position and "supports a candidate" filter. Default order: the most
//               members first, then the code. On a phone the rows are cards
//

import {useMemo, useState} from "react";
import {ChevronDown} from "lucide-react";
import {usePhone} from "@/lib/usePhone.js";
import {AssociationList} from "@/features/fifa/components/AssociationList.jsx";
import {DataTable} from "@/features/fifa/components/DataTable.jsx";
import {PositionCell} from "@/features/fifa/components/PositionCell.jsx";
import {Swatch} from "@/features/fifa/components/Swatch.jsx";
import {TableToolbar} from "@/features/fifa/components/TableToolbar.jsx";
import {FifaApi} from "@/features/fifa/fifaApi.js";
import {
    CONFEDERATION_COLUMN_FILTERS, compareConfederations, confederationFilters, confederationItems, confederationSorts, searchConfederation,
} from "@/features/fifa/confederationsModel.js";
import {candidateFill, passes} from "@/features/fifa/positions.js";
import {useRemote} from "@/features/fifa/useRemote.js";
import {useTableView} from "@/features/fifa/useTableView.js";
import {cn} from "@/lib/utils.js";

const noMembers = (n) => n === 1 ? '1 member association' : `${n} member associations`;
const matching = (n) => n === 1 ? '1 matching association' : `${n} matching associations`;

// the members of a confederation as the list of the page, in its default order; the buttons that lead elsewhere
const Members = ({entry, members, selected, onSelect, onShow}) => (
    <div id={`members-${entry.code}`} className="space-y-3">
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-[0.875rem]">
            <button type="button" onClick={() => onSelect(entry.confederation.qid)} aria-current={entry.confederation.qid === selected ? 'true' : undefined}
                    className="link cursor-pointer">Its sheet</button>
            <button type="button" onClick={() => onShow(entry.code)} className="link cursor-pointer">Show {entry.code} on the map</button>
        </p>
        <AssociationList rows={members} selected={selected} onSelect={onSelect} compact/>
    </div>
);

// the button that opens a row; the code and the name beside it
const Opener = ({entry, open, onToggle}) => (
    <>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={open ? `members-${entry.code}` : undefined}
                className="inline-flex cursor-pointer items-center gap-1.5 text-left font-semibold">
            <ChevronDown aria-hidden className={cn('size-4 shrink-0 text-ink-mute transition-transform', !open && '-rotate-90')}/>
            {entry.code}
        </button>
        <span className="mt-0.5 block pl-5.5 text-[0.8125rem] font-normal text-ink-mute">{entry.confederation.name}</span>
        {entry.found.active && entry.found.members.length > 0 && (
            <span className="mt-0.5 block pl-5.5 text-[0.8125rem] font-normal text-action-text">{matching(entry.found.members.length)}</span>
        )}
    </>
);

const columnsOf = ({subjects, isOpen, toggle}) => [
    {key: 'code', label: 'Confederation', className: 'min-w-36', render: entry => <Opener entry={entry} open={isOpen(entry)} onToggle={() => toggle(entry)}/>},
    {key: 'president', label: 'President', render: entry => entry.president ?? '—'},
    {key: 'own', label: 'Own position', filters: CONFEDERATION_COLUMN_FILTERS.own, className: 'min-w-40', render: entry => <PositionCell described={entry.own}/>},
    {key: 'members', label: 'Members', filters: CONFEDERATION_COLUMN_FILTERS.members, className: 'tabular-nums', render: entry => entry.total},
    ...subjects.map(subject => ({
        key: `support:${subject.qid}`, label: subject.name, className: 'tabular-nums',
        render: entry => <span className="inline-flex items-center gap-1.5"><Swatch fill={candidateFill(subject.color_index)}/>{entry.support[subject.qid] ?? 0}</span>,
    })),
    {key: 'conflicting', label: 'Conflicting', className: 'tabular-nums', render: entry => entry.conflicting},
    {key: 'uncertain', label: 'Uncertain', className: 'tabular-nums', render: entry => entry.uncertain},
    {key: 'none', label: 'No position', className: 'tabular-nums', render: entry => entry.none},
];

// the card of a confederation on a phone
const ConfederationCard = ({entry, subjects, open, onToggle, members, selected, onSelect, onShow}) => (
    <li className="flex flex-col rounded-2xl border border-rule p-5">
        <h3 className="text-[1.25rem] font-semibold tracking-[-0.015em]">{entry.code}</h3>
        <p className="caption">{entry.confederation.name}</p>
        <p className="mt-3 text-[0.875rem]"><PositionCell described={entry.own}/></p>
        <p className="caption mt-1">{entry.confederation.leader ? `${entry.confederation.leader.role}: ${entry.confederation.leader.name}` : 'No president listed'}</p>
        <p className="mt-4 text-[0.875rem] text-ink">{noMembers(entry.total)}</p>
        <ul className="mt-2 space-y-1 text-[0.8125rem]">
            {subjects.filter(subject => (entry.support[subject.qid] ?? 0) > 0).map(subject => (
                <li key={subject.qid} className="flex items-center gap-2">
                    <Swatch fill={candidateFill(subject.color_index)}/><span className="tabular-nums">{entry.support[subject.qid]}</span> support {subject.name}
                </li>
            ))}
            <li><span className="tabular-nums">{entry.conflicting}</span> conflicting · <span className="tabular-nums">{entry.uncertain}</span> uncertain · <span className="tabular-nums">{entry.none}</span> with no position</li>
        </ul>
        {entry.found.active && entry.found.members.length > 0 && <p className="mt-2 text-[0.8125rem] text-action-text">{matching(entry.found.members.length)}</p>}
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={open ? `members-${entry.code}` : undefined} className="link mt-3 cursor-pointer self-start text-[0.875rem]">
            {open ? 'Hide the members' : 'Show the members'}
        </button>
        {open && <div className="mt-3"><Members entry={entry} members={members} selected={selected} onSelect={onSelect} onShow={onShow}/></div>}
    </li>
);

// rows: Map qid -> {member, described} of ALL the associations; members: the map's members, with the votes given on the page (a confederation of the answer of
// the server is read through them); levels, subjects: the ones of the map; url: the useFifaState of the page; onSelect(qid): a sheet; onShow(fifa): the map
// of that confederation
export const ConfederationsView = ({rows, members, levels, subjects, url, selected, onSelect, onShow}) => {
    const phone = usePhone();
    const {status, data, error, reload} = useRemote(FifaApi.confederations);
    // the presidents of the associations: the search finds a member by its president too (the view works without them)
    const presidents = useRemote(FifaApi.presidents);
    // a row opens on its own when the search finds members in it; a click on it says otherwise
    const [chosen, setChosen] = useState({});
    const {search, confederation, level} = url.state;

    const presidentOf = useMemo(() => new Map((presidents.data?.presidents ?? []).map(one => [one.member_qid, one.name])), [presidents.data]);
    const base = useMemo(
        () => data ? confederationItems({confederations: data.confederations ?? [], associations: [...rows.values()], members, levels, subjects}) : [],
        [data, rows, members, levels, subjects],
    );
    // the confederation of the page keeps one; the search of the page finds the confederation or its members
    const items = useMemo(() => base
        .filter(item => confederation === 'all' || item.code === confederation)
        .map(item => ({...item, found: searchConfederation(item, search, presidentOf)}))
        .filter(item => item.found.self || item.found.members.length > 0), [base, confederation, search, presidentOf]);
    const defs = useMemo(() => confederationFilters(subjects), [subjects]);
    const sorts = useMemo(() => confederationSorts(subjects), [subjects]);
    const table = useTableView({url, items, defs, sorts, tie: compareConfederations});

    const isOpen = (entry) => chosen[entry.code] ?? (entry.found.active && entry.found.members.length > 0);
    const toggle = (entry) => setChosen(previous => ({...previous, [entry.code]: !isOpen(entry)}));
    // the members shown in a row: the ones the search found, or all; the position level of the page applies
    const membersOf = (entry) => (entry.found.active ? entry.found.members : entry.rows)
        .filter(row => passes(row.member, row.described, {confederation: 'all', level, search: ''}));
    const columns = columnsOf({subjects, isOpen, toggle});

    if (status === 'loading') return <p className="py-10 text-[1rem] text-ink-mute">Reading the confederations…</p>;
    if (status === 'error') {
        return <p role="alert" className="py-10 text-[1rem] text-accent-ink">{error} <button type="button" onClick={reload} className="link cursor-pointer">Try again</button></p>;
    }

    const empty = (
        <>
            No confederation matches these choices.
            {(table.chips.length > 0 || table.sorted) && <> <button type="button" onClick={table.onClear} className="link cursor-pointer">Clear filters</button></>}
        </>
    );

    return (
        <div>
            <p className="caption max-w-[70ch]">
                Confederations do not vote: each member association has one vote. A confederation&rsquo;s statement shows the direction of its leadership, not of its members.
            </p>
            <TableToolbar searchLabel="Search confederations and their members" searchPlaceholder="Confederation, president, association, country or code" search={search}
                          onSearch={next => url.set({search: next})} count={table.shown.length} total={base.length} noun="confederations" chips={table.chips}
                          onRemove={table.onRemove} sorted={table.sorted} onClear={table.onClear} phone={phone}
                          sortColumns={columns.filter(column => sorts[column.key])} sort={table.sort} dir={table.dir} onSort={table.setSort}
                          defs={defs} selected={table.selected} onFilter={table.onFilter}/>
            <div className="mt-4">
                {phone
                    ? (
                        <>
                            <ul aria-label="Confederations" className="grid gap-4">
                                {table.shown.map(entry => (
                                    <ConfederationCard key={entry.key} entry={entry} subjects={subjects} open={isOpen(entry)} onToggle={() => toggle(entry)} members={membersOf(entry)}
                                                       selected={selected} onSelect={onSelect} onShow={onShow}/>
                                ))}
                            </ul>
                            {table.shown.length === 0 && <p className="py-10 text-center text-[1rem] text-ink-mute">{empty}</p>}
                        </>
                    )
                    : (
                        <DataTable caption="The confederations: sort a column with its heading, filter it with the button beside" columns={columns} items={table.shown}
                                   itemKey={entry => entry.key} sort={table.sort} dir={table.dir} onSort={table.onSort} defs={defs} selected={table.selected}
                                   onFilter={table.onFilter} empty={empty}
                                   renderExtra={entry => isOpen(entry) && (
                                       <tr className="border-b border-rule bg-paper-deep/40 last:border-b-0">
                                           <td colSpan={columns.length} className="px-4 py-4">
                                               <Members entry={entry} members={membersOf(entry)} selected={selected} onSelect={onSelect} onShow={onShow}/>
                                           </td>
                                       </tr>
                                   )}/>
                    )}
            </div>
        </div>
    );
};
