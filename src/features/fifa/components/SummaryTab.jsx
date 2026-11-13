//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: SummaryTab.jsx
//  Description: The second tab of the sheet of an association (after Positions, which the sheet opens on): what it says of each candidate in a few plain lines, BUILT BY THE CODE from what the sheet holds (no AI writes these
//               lines, the server sends them as data): the position and since when (or "set by a reader", or what it was before), how many sentences of the news say it, in how many
//               media and the last one, who said it (a speaker who binds the association is named as such), the latest change, and where the confederation and the other associations of it
//               stand. Under them, the summary an AI writes when a reader asks for it. It is a summary: the sentences of the news themselves, with their media, are in the tab Positions
//               (the server sends the key sentences too: they are not drawn here). Information only: nothing here confirms or votes (the tab Positions does)
//

import {ExternalLink, UserCheck} from "lucide-react";
import {Badge} from "@/components/ui/badge.jsx";
import {AiSummary} from "@/features/fifa/components/AiSummary.jsx";
import {Swatch} from "@/features/fifa/components/Swatch.jsx";
import {candidateFill, labelOf, mapFill, readEntry, sideOf, strengthOf} from "@/features/fifa/positions.js";

const dateOf = (at) => at ? new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '';

const KINDS = {first: 'First position', reversal: 'Reversal', weakened: 'Weakened'};
const STANCES = {for: 'For', against: 'Against'};

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// a medium as a link to its article (the server sends the address, null when it has none)
const MediumLink = ({url, medium}) => url
    ? <a href={url} target="_blank" rel="noopener noreferrer" className="medium-link inline-flex items-center gap-1">{medium}<ExternalLink aria-hidden className="size-3"/></a>
    : <span>{medium}</span>;

// one side of the news on a candidate: how many sentences, how many media, the last one and who said it
const Side = ({side, name}) => {
    const sentences = side.declared + side.probable;
    return (
        <div role="group" aria-label={`${STANCES[side.stance] ?? side.stance} ${name}`} className="mt-3">
            <p className="text-[0.9375rem]">
                <span className="font-medium">{STANCES[side.stance] ?? side.stance}: </span>
                {side.declared} declared and {side.probable} probable {sentences === 1 ? 'sentence' : 'sentences'} in {side.media} {side.media === 1 ? 'medium' : 'media'}, last on {dateOf(side.last_at)}
            </p>
            {side.speakers.map(speaker => (
                <p key={speaker.name} className="caption mt-1">
                    Said by {speaker.name}{(speaker.role || speaker.binds) && ` (${[speaker.role, speaker.binds ? 'speaks for the association' : null].filter(Boolean).join(', ')})`}
                </p>
            ))}
        </div>
    );
};

// where the confederation stands on a candidate and how many OTHER associations of it are for and against (context: null on the sheet of a confederation)
const ContextLine = ({context, subject}) => {
    const own = context?.own?.[subject];
    const others = context?.associations?.[subject];
    const hasOthers = Boolean(others) && others.for + others.against > 0;
    if (!own && !hasOthers) return null;
    const fifa = context.confederation.fifa;
    return (
        <p className="caption mt-3">
            {fifa} itself: {labelOf(own?.position)}.
            {others && ` Other associations of ${fifa}: ${others.for} for, ${others.against} against (of ${others.total})`}
        </p>
    );
};

// one candidate: what the association holds on it, as lines
const CandidateSummary = ({one, levels, context}) => {
    const {human, position, aiPosition} = readEntry(one, levels);
    const known = sideOf(position) !== 'unknown';
    const holding = one.confirmed ? one.confirmed.by.slice(0, one.confirmed.count) : [];
    const names = holding.length > 3 ? `${holding.slice(0, 3).join(', ')} and ${holding.length - 3} more` : holding.join(', ');
    const sides = one.sides.filter(side => side.declared + side.probable > 0);
    const change = one.latest_change;
    return (
        <section aria-label={`${one.name}: summary`} className="border-t border-rule py-5 first:border-t-0 first:pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-[1.0625rem] font-semibold tracking-[-0.01em]"><Swatch fill={candidateFill(one.color_index)}/>{one.name}</h3>
                <span className="flex flex-wrap items-center gap-2">
                    <Badge tone="quiet" icon={<Swatch fill={mapFill(sideOf(position), one.color_index, strengthOf(position))} ring={false}/>}>{labelOf(position)}</Badge>
                    {human && <Badge tone="quiet" icon={<UserCheck aria-hidden className="size-3.5 shrink-0"/>}>Set by a reader</Badge>}
                </span>
            </div>

            <p className="mt-3 text-[0.9375rem]">
                {known || human
                    ? (
                        <>
                            {known ? `${labelOf(position)} on ${one.name}` : `No position on ${one.name}`}
                            {human
                                ? `, set by a reader (${human.by}) on ${dateOf(human.at)}`
                                : one.since && ` since ${dateOf(one.since)}`}
                            {!human && one.changed && one.previous && `, changed from ${labelOf(one.previous)}`}
                        </>
                    )
                    : `No established position: ${count(one.uncertain_count, 'sentence', 'sentences')} about the election and this association that ${one.uncertain_count === 1 ? 'does' : 'do'} not say one`}
            </p>
            {human && <p className="caption mt-1">AI reading from the news: {labelOf(aiPosition)}</p>}
            {human?.newer_evidence && <p role="status" className="caption mt-1">New evidence since the vote: the news have said more after it.</p>}
            {holding.length > 0 && <p className="caption mt-1">Confirmed by {names}</p>}
            {one.stale && !human && <p className="caption mt-1">Older than 90 days: kept for the record.</p>}
            {one.articles_30d > 0 && <p className="caption mt-1">Last 30 days: {count(one.articles_30d, 'article', 'articles')} in {count(one.media_30d, 'medium', 'media')}</p>}

            {sides.map(side => <Side key={side.stance} side={side} name={one.name}/>)}

            {change && (
                <p className="caption mt-3 flex flex-wrap items-center gap-x-1.5">
                    <span>Latest change, {dateOf(change.date)}: {KINDS[change.kind] ?? change.kind}, {change.from ? `${labelOf(change.from)} → ` : ''}{labelOf(change.to)}</span>
                    {change.medium && <>·<MediumLink url={change.url} medium={change.medium}/></>}
                </p>
            )}
            <ContextLine context={context} subject={one.subject_qid}/>
        </section>
    );
};

// summary: the one the server built; context: where the confederation stands (null for a confederation); aiSummary / aiAvailable / request: the summary an AI writes on demand
export const SummaryTab = ({summary, context, levels, aiSummary, aiAvailable, request}) => {
    const candidates = summary?.candidates ?? [];
    return (
        <>
            <p className="caption max-w-[60ch]">These lines are built by the code from the sheet: no AI wrote them. The sentences of the news, with their media, are in the tab Positions.</p>
            {candidates.length === 0
                ? <p className="mt-4 text-[0.9375rem] text-ink-mute">Nothing to summarise yet: no sentence of the news ties this association to a candidate.</p>
                : <div className="mt-4">{candidates.map(one => <CandidateSummary key={one.subject_qid} one={one} levels={levels} context={context}/>)}</div>}
            <AiSummary aiSummary={aiSummary} available={aiAvailable} request={request}/>
        </>
    );
};
