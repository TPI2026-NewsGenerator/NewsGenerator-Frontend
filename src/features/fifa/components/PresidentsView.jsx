//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: PresidentsView.jsx
//  Description: The presidents of the 211 associations in a table: each with the association he leads and its position, how many articles of the last
//               30 days name him, the latest mention (a link to the article) and where the name comes from (the public page of FIFA, or Wikidata
//               when that page names none). It says who leads and whether the news speak of him, not what he thinks. Each column sorts, the
//               filterable ones have a filter in their head, the search bar finds a president or his association. Default order: the most named
//               first, then the latest mention, then the name. On a phone the rows are cards
//

import {useMemo} from "react";
import {usePhone} from "@/lib/usePhone.js";
import {DataTable} from "@/features/fifa/components/DataTable.jsx";
import {PositionCell} from "@/features/fifa/components/PositionCell.jsx";
import {Swatch} from "@/features/fifa/components/Swatch.jsx";
import {TableToolbar} from "@/features/fifa/components/TableToolbar.jsx";
import {FifaApi} from "@/features/fifa/fifaApi.js";
import {PRESIDENT_COLUMN_FILTERS, PRESIDENT_SORTS, comparePresidents, presidentFilters, presidentItem, presidentMatches} from "@/features/fifa/presidentsModel.js";
import {passes} from "@/features/fifa/positions.js";
import {useRemote} from "@/features/fifa/useRemote.js";
import {useTableView} from "@/features/fifa/useTableView.js";

const dayOf = (at) => at ? String(at).slice(0, 10) : '';
const articles = (n) => n === 1 ? '1 article' : `${n} articles`;

// the source of a name: the page of FIFA (a link), or Wikidata (no page of its own)
const sourceName = (president) => president.source === 'wikidata' ? 'Wikidata' : 'FIFA';
const SourceLink = ({president, children}) => president.source_url
    ? <a href={president.source_url} target="_blank" rel="noreferrer" aria-label={`Source: ${sourceName(president)}`} className="medium-link">{children}</a>
    : <span>{children}</span>;

const MentionLink = ({mention}) => (
    <a href={mention.url} target="_blank" rel="noreferrer" title={mention.title} className="medium-link">{dayOf(mention.at)} · {mention.medium}</a>
);

const columnsOf = ({selected, onSelect}) => [
    {key: 'name', label: 'President', className: 'min-w-36', render: item => <span className="font-medium">{item.name}</span>},
    {
        key: 'assoc', label: 'Association',
        render: item => (
            <>
                <button type="button" onClick={() => onSelect(item.member.qid)} aria-current={item.member.qid === selected ? 'true' : undefined}
                        aria-label={`${item.member.name}, ${item.member.fifa}. Open the sheet`} className="link cursor-pointer text-left">{item.member.name}</button>
                <span className="ml-2 text-ink-mute">{item.member.fifa}</span>
            </>
        ),
    },
    {key: 'conf', label: 'Confederation', filters: PRESIDENT_COLUMN_FILTERS.conf, render: item => item.member.confederation},
    {key: 'pos', label: 'Position', filters: PRESIDENT_COLUMN_FILTERS.pos, className: 'min-w-48', render: item => <PositionCell described={item.described}/>},
    {key: 'articles', label: 'Articles, 30 days', filters: PRESIDENT_COLUMN_FILTERS.articles, className: 'tabular-nums', render: item => item.articles},
    {key: 'latest', label: 'Latest mention', className: 'whitespace-nowrap', render: item => item.president.last_mention ? <MentionLink mention={item.president.last_mention}/> : '—'},
    {key: 'source', label: 'Source', filters: PRESIDENT_COLUMN_FILTERS.source, render: item => <SourceLink president={item.president}>{sourceName(item.president)}</SourceLink>},
    {key: 'since', label: 'Since', className: 'tabular-nums', render: item => item.since ? String(item.since).slice(0, 4) : '—'},
];

// the card of a president on a phone
const PresidentCard = ({item, selected, onSelect}) => {
    const {president, member, described} = item;
    const mention = president.last_mention;
    return (
        <li className="flex flex-col rounded-2xl border border-rule p-5">
            <p className="text-[1.0625rem] leading-snug font-semibold tracking-[-0.01em]">{president.name}</p>
            <p className="caption">{president.role}{president.since && `, since ${String(president.since).slice(0, 4)}`}</p>
            <button type="button" onClick={() => onSelect(member.qid)} aria-current={member.qid === selected ? 'true' : undefined}
                    className="link mt-2 cursor-pointer self-start text-left text-[0.9375rem]">
                {member.name} <span className="text-ink-mute">· {member.confederation} · {member.fifa}</span>
            </button>
            <p className="mt-3 text-[0.9375rem] font-medium">{president.articles_30d > 0 ? articles(president.articles_30d) : 'No mention in 30 days'}</p>
            {mention && <p className="caption mt-0.5">Latest: <MentionLink mention={mention}/></p>}
            <p className="mt-3 flex items-center gap-2 text-[0.8125rem] text-ink"><Swatch fill={described.fill} ring={described.ring}/>{described.label}</p>
            <p className="caption mt-auto pt-3">
                {president.source_url ? <SourceLink president={president}>Source: {sourceName(president)}</SourceLink> : <>Source: {sourceName(president)}</>}
            </p>
        </li>
    );
};

// rows: Map qid -> {member, described} of the associations; url: the useFifaState of the page (the search, the filters of the page, the sort and the
// filters of the columns); onSelect(qid): the sheet of an association
export const PresidentsView = ({rows, url, selected, onSelect}) => {
    const phone = usePhone();
    const {status, data, error, reload} = useRemote(FifaApi.presidents);
    const {search, confederation, level} = url.state;

    // the presidents of an association the map knows
    const all = useMemo(() => (data?.presidents ?? [])
        .map(president => ({president, row: rows.get(president.member_qid)}))
        .filter(({row}) => row)
        .map(({president, row}) => presidentItem(president, row)), [data, rows]);
    const withMentions = all.filter(item => item.articles > 0).length;
    // the filters of the page (the confederation, the position level) and the search of the page, which finds a president or his association
    const items = useMemo(() => all.filter(item => passes(item.member, item.described, {confederation, level, search: ''}) && presidentMatches(item, search)), [all, confederation, level, search]);
    const defs = useMemo(() => presidentFilters(), []);
    const table = useTableView({url, items, defs, sorts: PRESIDENT_SORTS, tie: comparePresidents});
    const columns = useMemo(() => columnsOf({selected, onSelect}), [selected, onSelect]);

    if (status === 'loading') return <p className="py-10 text-[1rem] text-ink-mute">Reading the presidents…</p>;
    if (status === 'error') {
        return <p role="alert" className="py-10 text-[1rem] text-accent-ink">{error} <button type="button" onClick={reload} className="link cursor-pointer">Try again</button></p>;
    }

    const empty = (
        <>
            No president matches these choices.
            {(table.chips.length > 0 || table.sorted) && <> <button type="button" onClick={table.onClear} className="link cursor-pointer">Clear filters</button></>}
        </>
    );

    return (
        <div>
            <dl className="flex flex-wrap gap-x-10 gap-y-3">
                <div className="flex flex-col">
                    <dd className="order-1 text-[1.75rem] leading-none font-semibold tracking-[-0.02em] tabular-nums">{withMentions}</dd>
                    <dt className="caption order-2 mt-1.5">presidents with mentions</dt>
                </div>
                <div className="flex flex-col">
                    <dd className="order-1 text-[1.75rem] leading-none font-semibold tracking-[-0.02em] tabular-nums">{all.length} / {rows.size}</dd>
                    <dt className="caption order-2 mt-1.5">associations with a president</dt>
                </div>
            </dl>
            <p className="caption mt-4 max-w-[70ch]">
                They are the head of an association, not its position: what an association thinks is what a sentence of the news says and who it binds. An article counts when
                it names him, in the news of the last 30 days.
            </p>
            <TableToolbar searchLabel="Search presidents" searchPlaceholder="President, association, country or code" search={search} onSearch={next => url.set({search: next})}
                          count={table.shown.length} total={all.length} noun="presidents" chips={table.chips} onRemove={table.onRemove} sorted={table.sorted} onClear={table.onClear}
                          phone={phone} sortColumns={columns.filter(column => PRESIDENT_SORTS[column.key])} sort={table.sort} dir={table.dir}
                          onSort={table.setSort} defs={defs} selected={table.selected} onFilter={table.onFilter}/>
            <div className="mt-4">
                {phone
                    ? (
                        <>
                            <ul aria-label="Presidents" className="grid gap-4">
                                {table.shown.map(item => <PresidentCard key={item.key} item={item} selected={selected} onSelect={onSelect}/>)}
                            </ul>
                            {table.shown.length === 0 && <p className="py-10 text-center text-[1rem] text-ink-mute">{empty}</p>}
                        </>
                    )
                    : (
                        <DataTable caption="The presidents: sort a column with its heading, filter it with the button beside" columns={columns} items={table.shown} itemKey={item => item.key}
                                   sort={table.sort} dir={table.dir} onSort={table.onSort} defs={defs} selected={table.selected} onFilter={table.onFilter}
                                   rowClass={item => item.member.qid === selected && 'bg-paper-deep'} empty={empty}/>
                    )}
            </div>
        </div>
    );
};
