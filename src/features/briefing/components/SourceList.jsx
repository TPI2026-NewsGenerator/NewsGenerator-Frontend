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
import {FaRegStar, FaShareAlt, FaStar, FaTrash} from "react-icons/fa";
import {Button, IconButton} from "@/components/ui/button.jsx";
import {Meta, MetaLine} from "@/components/ui/text.jsx";
import {ScrollFrame} from "@/components/ui/scroll-area.jsx";
import {ListFilter} from "@/components/ui/list-filter.jsx";
import {cn, feedAddress, matchesQuery} from "@/lib/utils.js";
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

const REMOVE_FOUND_TITLE = 'Remove it: it is no longer read for your briefing and never found for you again. You can bring it back from “Left out”';

// limits: {relevanceDays}. busy: a change in progress. onTrust, onShare, onRemove, onKeep, onRestore(row):
// the changes of a source, told to the page. Memoized: the page asks the profile again every few seconds
// while sources are found, three hundred sources are not drawn again each time
export const SourceList = memo(({found, own, refused, removed, limits, busy, onTrust, onShare, onRemove, onKeep, onRestore}) => {
    const [chosen, setShow] = useState('all');
    const [query, setQuery] = useState('');
    const rows = useMemo(() => sourceRows(found, own, refused, removed), [found, own, refused, removed]);
    const counts = useMemo(() => Object.fromEntries(SHOWS.map(({value}) => [value, rows.filter(isShown(value)).length])), [rows]);
    // the last source left out kept or brought back: its choice is no longer offered, all are shown
    const show = chosen === 'leftOut' && counts.leftOut === 0 ? 'all' : chosen;
    const listed = rows.filter(isShown(show));
    const shown = listed.filter(row => matchesQuery(query, row.site, feedAddress(row.url), row.category));

    if (rows.length === 0) {
        return <p className="caption">No source yet: they are found for your interests, and you can add your own below.</p>;
    }

    return (
        <div>
            {/* the radix group of the ToggleGroup of shadcn: one of them always chosen */}
            <ToggleGroup.Root type="single" value={show} onValueChange={value => value && setShow(value)}
                              aria-label="Which sources to show" className="mb-6 flex flex-wrap gap-2">
                {SHOWS.filter(({value}) => value !== 'leftOut' || counts.leftOut > 0).map(({value, label}) => (
                    <ToggleGroup.Item key={value} value={value}
                                      className={cn('inline-flex h-8 cursor-pointer items-center gap-2 border px-3 text-[0.9375rem] font-semibold tracking-[0.06em] [font-variant-caps:all-small-caps] transition-colors',
                                          'border-rule text-ink-mute hover:border-ink hover:text-ink data-[state=on]:border-ink data-[state=on]:text-ink')}>
                        {label}{' '}
                        <span className="font-normal tabular-nums">{counts[value]}</span>
                    </ToggleGroup.Item>
                ))}
            </ToggleGroup.Root>

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
                            {/* only a source added by hand is shared: the ones found are suggested anyway */}
                            {row.origin === 'user' && (
                                <IconButton label={row.shared ? `Stop sharing ${row.site}` : `Share ${row.site}`}
                                            pressed={Boolean(row.shared)} disabled={busy}
                                            title={row.shared
                                                ? 'Shared: it can be recommended to the other readers who follow its subjects'
                                                : 'Share this source: it can be recommended to the other readers who follow its subjects. Nobody sees it otherwise'}
                                            onClick={() => onShare(row)}>
                                    <FaShareAlt/>
                                </IconButton>
                            )}
                            <span className="min-w-0 flex-1 font-semibold [overflow-wrap:anywhere]">{row.site}</span>
                            <MetaLine>
                                {row.removed
                                    ? <Meta tone="accent" title="You removed it: it is not read for your briefing, and not found for you again">removed by you</Meta>
                                    : <Meta tone={row.origin === 'user' ? 'ink' : undefined}>{row.origin === 'user' ? 'added by you' : 'found for you'}</Meta>}
                                {row.category && <Meta>{row.category}</Meta>}
                                {row.language && <Meta>{row.language}</Meta>}
                                {row.origin === 'profile' && row.relevant !== undefined && (
                                    <Meta tone={row.relevant > 0 ? 'ink' : undefined}
                                          title={`Its news of the last ${limits.relevanceDays} days on your interests: at none, it is removed`}>
                                        {row.relevant > 0 ? `${row.relevant} news on your interests` : 'nothing on your interests lately'}
                                    </Meta>
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
                            <span className="caption hidden max-w-[30%] truncate md:inline" title={feedAddress(row.url)}>{feedAddress(row.url)}</span>
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
                        </li>
                    ))}
                </ul>
            </ScrollFrame>
        </div>
    );
});
SourceList.displayName = 'SourceList';
