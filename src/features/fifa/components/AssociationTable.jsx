//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: AssociationTable.jsx
//  Description: The view List: the associations in a table, each column sortable and the filterable ones with a filter in their head, a search bar and the
//               filters on as chips. The default order puts what has something to say first (a candidate indicated, conflicting, Uncertain, Unknown;
//               the last signal, newest first; the articles; the name). The filters of the page (candidate, confederation, position level) and
//               the ones of the columns combine with AND. On a phone the rows are cards and the sort is a select
//

import {useMemo, useState} from "react";
import {usePhone} from "@/lib/usePhone.js";
import {AssociationList} from "@/features/fifa/components/AssociationList.jsx";
import {DataTable} from "@/features/fifa/components/DataTable.jsx";
import {PositionCell} from "@/features/fifa/components/PositionCell.jsx";
import {Swatch} from "@/features/fifa/components/Swatch.jsx";
import {TableToolbar} from "@/features/fifa/components/TableToolbar.jsx";
import {LIST_COLUMN_FILTERS, LIST_SORTS, compareList, itemOf, listFilters} from "@/features/fifa/listModel.js";
import {candidateFill} from "@/features/fifa/positions.js";
import {useTableView} from "@/features/fifa/useTableView.js";

const dayOf = (time) => time === null ? '—' : new Date(time).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});

// the candidate it leans toward; with a candidate chosen in the list, the position on it
const CandidateCell = ({item, scope, subjects}) => {
    if (scope.mode === 'candidate') {
        return item.candidateText ? <span className="flex items-center gap-2"><Swatch fill={item.described.fill} ring={item.described.ring}/>{item.candidateText}</span> : '—';
    }
    const chosen = item.lean?.subject_qid ? subjects.find(subject => subject.qid === item.lean.subject_qid) : null;
    if (chosen) return <span className="flex items-center gap-2"><Swatch fill={candidateFill(chosen.color_index)}/>{chosen.name}</span>;
    return item.candidateText ?? '—';
};

const columnsOf = ({scope, subjects, selected, onSelect}) => [
    {
        key: 'name', label: 'Association',
        render: item => (
            <>
                <button type="button" onClick={() => onSelect(item.member.qid)} aria-current={item.member.qid === selected ? 'true' : undefined}
                        aria-label={`${item.member.name}, ${item.member.fifa}. Open the sheet`} className="link cursor-pointer text-left font-medium">
                    {item.member.name}
                </button>
                <span className="ml-2 text-ink-mute">{item.member.fifa}</span>
            </>
        ),
    },
    {key: 'conf', label: 'Confederation', filters: LIST_COLUMN_FILTERS.conf, render: item => item.member.confederation},
    {key: 'cand', label: 'Candidate', filters: LIST_COLUMN_FILTERS.cand, render: item => <CandidateCell item={item} scope={scope} subjects={subjects}/>},
    {key: 'pos', label: 'Position', filters: LIST_COLUMN_FILTERS.pos, className: 'min-w-48', render: item => <PositionCell described={item.described}/>},
    {key: 'last', label: 'Last signal', filters: LIST_COLUMN_FILTERS.last, className: 'tabular-nums whitespace-nowrap', render: item => dayOf(item.lastSignal)},
    {key: 'articles', label: 'Articles, 30 days', filters: LIST_COLUMN_FILTERS.articles, className: 'tabular-nums', render: item => item.articles},
    {key: 'established', label: 'Established signals', className: 'tabular-nums', render: item => item.established},
    {key: 'uncertain', label: 'Uncertain signals', className: 'tabular-nums', render: item => item.uncertain},
];

// rows: Map qid -> {member, described, visible} (the filters of the page apply, the search too); scope, levels, subjects: the ones of the page; url: the
// useFifaState of the page; selected: the qid whose sheet is open; onSelect(qid)
export const AssociationTable = ({rows, scope, levels, subjects, url, selected, onSelect}) => {
    const phone = usePhone();
    // the day the page was read: what "the last 7 days" counts from
    const [now] = useState(Date.now);
    const items = useMemo(() => [...rows.values()].filter(row => row.visible).map(row => itemOf(row, scope, levels, subjects, now)), [rows, scope, levels, subjects, now]);
    const defs = useMemo(() => listFilters(subjects), [subjects]);
    const table = useTableView({url, items, defs, sorts: LIST_SORTS, tie: compareList});
    const columns = useMemo(() => columnsOf({scope, subjects, selected, onSelect}), [scope, subjects, selected, onSelect]);

    return (
        <div>
            <TableToolbar searchLabel="Search associations" searchPlaceholder="Association, country or FIFA code" search={url.state.search} onSearch={search => url.set({search})}
                          count={table.shown.length} total={rows.size} noun="associations" chips={table.chips} onRemove={table.onRemove} sorted={table.sorted} onClear={table.onClear}
                          phone={phone} sortColumns={columns.filter(column => LIST_SORTS[column.key])} sort={table.sort} dir={table.dir}
                          onSort={table.setSort} defs={defs} selected={table.selected} onFilter={table.onFilter}/>
            <div className="mt-4">
                {phone
                    ? <AssociationList rows={table.shown} presorted selected={selected} onSelect={onSelect}/>
                    : (
                        <DataTable caption="The associations: sort a column with its heading, filter it with the button beside" columns={columns} items={table.shown} itemKey={item => item.key}
                                   sort={table.sort} dir={table.dir} onSort={table.onSort} defs={defs} selected={table.selected} onFilter={table.onFilter}
                                   rowClass={item => item.key === selected && 'bg-paper-deep'}
                                   empty={(
                                       <>
                                           No association matches these choices.
                                           {(table.chips.length > 0 || table.sorted) && <> <button type="button" onClick={table.onClear} className="link cursor-pointer">Clear filters</button></>}
                                       </>
                                   )}/>
                    )}
            </div>
        </div>
    );
};
