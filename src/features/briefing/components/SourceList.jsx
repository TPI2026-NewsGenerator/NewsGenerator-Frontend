//
//  Author: Fabian Rostello
//  Date: 02.10.2026
//  File: SourceList.jsx
//  Description: Every source read for the reader, in one list: the ones found for their interests,
//               the ones they added, and the ones their thumbs left out. Three lists of the profile
//               page before, the reader looked for a source in each of them
//

import {memo, useMemo, useState} from "react";
import {ToggleGroup} from "radix-ui";
import {FaRegStar, FaStar, FaTrash} from "react-icons/fa";
import {Button, IconButton} from "@/components/ui/button.jsx";
import {Meta, MetaLine} from "@/components/ui/text.jsx";
import {ScrollFrame} from "@/components/ui/scroll-area.jsx";
import {ListFilter} from "@/components/ui/list-filter.jsx";
import {cn, feedAddress, feedRoute, matchesQuery, percent} from "@/lib/utils.js";
import {sourceRows} from "@/features/briefing/sourceRows.js";

const SHOWS = [
    {value: 'all', label: 'All'},
    {value: 'profile', label: 'Found for you'},
    {value: 'user', label: 'Added by you'},
    {value: 'leftOut', label: 'Left out'},
];

const TRUST_TITLE = {
    on: 'Trusted: its stories come first in your briefing when they fit your interests, and it is never removed',
    off: 'Trust this source: its stories will come first in your briefing when they fit your interests',
};

// a source giving more news a day than the server can follow for one source (see FLOOD_NEWS_PER_DAY
// of server/services/utils/feed-limits.js): its news are prepared after the others
const FLOOD_TITLE = 'This source gives far more news a day than the others (500 or more): its news are prepared for the briefings and the search after those of every other source, they may come later. Remove it if you do not need all of it';

// a source found for the profile and removed by the reader is left out, not found for them
const isShown = (show) => (row) => show === 'all'
    || (show === 'leftOut' ? Boolean(row.leftOut) || Boolean(row.removed) : row.origin === show && !row.removed);

// the list by name, or the sources with the most news on the interests first (the ones to keep, and the ones to look at)
const ORDERS = [
    {value: 'name', label: 'Name'},
    {value: 'relevant', label: 'On your interests'},
];

// the little pill groups: the sources shown, the order
const PILLS = 'inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-paper-deep p-1 [scrollbar-width:none]';
const PILL = cn('inline-flex h-7 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap gap-2 rounded-full px-3.5 text-[0.8125rem] transition-[color,background-color,box-shadow] duration-200',
    'text-ink-mute hover:text-ink data-[state=on]:bg-paper data-[state=on]:text-ink data-[state=on]:shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:data-[state=on]:bg-rule');
const count = (number) => number.toLocaleString('en-GB');

// What a source says of its news of the last days on the interests: "126 of 1,064 news on your interests
// (11.8%)". A source found for the profile before the server told its news says only how many
const interestsText = (row, days) => {
    if (row.news === undefined) return row.relevant > 0 ? `${row.relevant} news on your interests` : 'nothing on your interests lately';
    if (row.news === 0) return `no news in ${days} days`;
    return row.relevant > 0 ? `${count(row.relevant)} of ${count(row.news)} news on your interests (${percent(row.relevant, row.news)})` : 'nothing on your interests lately';
};
const interestsTitle = (row, days) => {
    const numbers = row.news === undefined ? '' : `: ${count(row.relevant)} of ${count(row.news)}${row.news > 0 ? ` (${percent(row.relevant, row.news)})` : ''}`;
    return row.origin === 'profile'
        ? `Its news of the last ${days} days on your interests${numbers}. At none, it is removed`
        : `Its news of the last ${days} days that are on one of your interests${numbers}. To choose between two sources of one site, or to see which ones bring you nothing. A source you added stays, whatever its count`;
};

const REMOVE_FOUND_TITLE ='Remove it: it is no longer read for your briefing and never found for you again. You can bring it back from “Left out”';

// limits: {relevanceDays}. counting: the server still counts the news of the sources added on the interests.
// busy: a change in progress. onTrust, onRemove, onKeep, onRestore(row): the
// changes of a source, told to the page. Memoized: the page asks the profile again every few seconds
// while sources are found, three hundred sources are not drawn again each time. Every source is read
// for every reader (8.10.2026): there is nothing to share
export const SourceList = memo(({found, own, refused, removed, limits, busy, counting = false, onTrust, onRemove, onKeep, onRestore}) => {
    const [chosen, setShow] = useState('all');
    const [order, setOrder] = useState('name');
    const [query, setQuery] = useState('');
    const rows = useMemo(() => sourceRows(found, own, refused, removed), [found, own, refused, removed]);
    const counts = useMemo(() => Object.fromEntries(SHOWS.map(({value}) => [value, rows.filter(isShown(value)).length])), [rows]);
    // the last source left out kept or brought back: its choice is no longer offered, all are shown
    const show = chosen === 'leftOut' && counts.leftOut === 0 ? 'all' : chosen;
    const listed = rows.filter(isShown(show));
    const matching = listed.filter(row => matchesQuery(query, row.site, feedAddress(row.url), row.category));
    // a source not counted yet comes last
    const shown = order === 'relevant'
        ? [...matching].sort((a, b) => (b.relevant ?? -1) - (a.relevant ?? -1) || a.site.localeCompare(b.site))
        : matching;
    const counted = rows.some(row => row.relevant !== undefined);

    if (rows.length === 0) {
        return <p className="caption">No source yet: they are found for your interests, and you can add your own below.</p>;
    }

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                {/* the radix group of the ToggleGroup of shadcn: one of them always chosen */}
                <ToggleGroup.Root type="single" value={show} onValueChange={value => value && setShow(value)}
                                  aria-label="Which sources to show" className={PILLS}>
                    {SHOWS.filter(({value}) => value !== 'leftOut' || counts.leftOut > 0).map(({value, label}) => (
                        <ToggleGroup.Item key={value} value={value} className={PILL}>
                            {label}{' '}
                            <span className="tabular-nums text-ink-mute">{counts[value]}</span>
                        </ToggleGroup.Item>
                    ))}
                </ToggleGroup.Root>
                {counted && (
                    <div className="flex items-center gap-2">
                        <span className="caption">Sort by</span>
                        <ToggleGroup.Root type="single" value={order} onValueChange={value => value && setOrder(value)}
                                          aria-label="How to sort the sources" className={PILLS}>
                            {ORDERS.map(({value, label}) => <ToggleGroup.Item key={value} value={value} className={PILL}>{label}</ToggleGroup.Item>)}
                        </ToggleGroup.Root>
                    </div>
                )}
            </div>

            <ListFilter id="source-filter" label="Find a source" value={query} onChange={setQuery}
                        shown={shown.length} total={listed.length}/>
            {shown.length === 0 && <p className="caption">No source matches “{query.trim()}”.</p>}
            <ScrollFrame label={`Your ${listed.length} sources`}>
                <ul className="[&>li:last-child]:border-b-0">
                    {shown.map(row => (
                        <li key={row.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule py-2.5">
                            {row.id !== undefined && (
                                <IconButton label={row.trusted ? `Stop trusting ${row.site}` : `Trust ${row.site}`}
                                            pressed={Boolean(row.trusted)} disabled={busy}
                                            title={row.trusted ? TRUST_TITLE.on : TRUST_TITLE.off}
                                            onClick={() => onTrust(row)}>
                                    {row.trusted ? <FaStar/> : <FaRegStar/>}
                                </IconButton>
                            )}
                            {/* the route of the feed under the name: a site can have several feeds, 20min.ch has three */}
                            <span className="min-w-0 flex-[1_1_14rem]">
                                <span className="block font-semibold [overflow-wrap:anywhere]">{row.site}</span>
                                <span className="caption block [overflow-wrap:anywhere]" title={feedAddress(row.url)}>{feedRoute(row.url, row.site)}</span>
                            </span>
                            {/* the marks and the buttons stay together on the right, the marks wrap inside their own box */}
                            <div className="flex min-w-0 max-w-full items-center gap-3 max-md:w-full max-md:justify-between md:ml-auto md:justify-end">
                                <MetaLine className="min-w-0 md:justify-end">
                                    {row.removed
                                        ? <Meta tone="accent" title="You removed it: it is not read for your briefing, and not found for you again">removed by you</Meta>
                                        : <Meta tone={row.origin === 'user' ? 'ink' : undefined}>{row.origin === 'user' ? 'added by you' : 'found for you'}</Meta>}
                                    {row.category && <Meta>{row.category}</Meta>}
                                    {row.language && <Meta>{row.language}</Meta>}
                                    {row.relevant !== undefined && (
                                        <Meta tone={row.relevant > 0 ? 'ink' : undefined} title={interestsTitle(row, limits.relevanceDays)}>
                                            {interestsText(row, limits.relevanceDays)}
                                        </Meta>
                                    )}
                                    {row.origin === 'user' && row.news === undefined && counting && (
                                        <Meta title="The server counts how many of its news of the last days are on your interests: about a minute for a long list">counting…</Meta>
                                    )}
                                    {row.leftOut && (
                                        <Meta tone="accent" title="Its stories were not for you again and again: no longer read for your briefing, and not found again">
                                            left out: {row.leftOut.refused} not for me
                                        </Meta>
                                    )}
                                    {row.error && <Meta tone="accent" title={row.error}>not working</Meta>}
                                    {row.flood && (
                                        <Meta tone="accent" title={FLOOD_TITLE}>
                                            {row.newsPerDay.toLocaleString('en-GB')} news a day: prepared last
                                        </Meta>
                                    )}
                                </MetaLine>
                                {row.leftOut && (
                                    <Button size="sm" disabled={busy} onClick={() => onKeep(row)}
                                            title="Bring it back for good: it is never left out again">
                                        Keep it
                                    </Button>
                                )}
                                {row.removed && (
                                    <Button size="sm" disabled={busy} onClick={() => onRestore(row)}
                                            title="Bring it back among the sources found for you">
                                        Bring it back
                                    </Button>
                                )}
                                {/* a source found for the profile only when it is listed: one the thumbs left out stays kept or not */}
                                {row.id !== undefined && (
                                    <IconButton label={`Remove ${row.site}`} className="hover:text-accent-ink" disabled={busy}
                                                title={row.origin === 'profile' ? REMOVE_FOUND_TITLE : undefined}
                                                onClick={() => onRemove(row)}>
                                        <FaTrash/>
                                    </IconButton>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </ScrollFrame>
        </div>
    );
});
SourceList.displayName = 'SourceList';
