//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: AssociationSheet.jsx
//  Description: The sheet of one association, opened from the map, the list or the timeline. It opens on the tab Positions, then Summary (SummaryTab.jsx: plain lines built by the code, then the
//               summary an AI writes when a reader asks for it; information only, no sentence of the news), Leadership profile and Notes. The tab Positions starts with a STRIP of cards, one for every
//               candidate of the map (the ones the news say nothing of too: "No known position"), each with its colour, its status for this association and "Review →": the strip is the
//               filter of the tab, and it is there on EVERY sheet, with positions or without. One line under it says what is shown. With NO card selected ("all"): the rundown, one card
//               after the other for every candidate the news say something of, READ ONLY (its position, since when and what it was before, every sentence of the news behind it with the
//               link, the medium, the date and who spoke, then the dated signals and the key moments); with no news at all on the association, the line says there is no position yet.
//               With ONE card selected (the candidate chosen in the list of the page is selected from the start; a second click unselects it): only the detail of that candidate, with
//               "Confirm this position ✓" and the vote ("Supported by {country}", "Not supported", "No position", "Remove my vote": the last vote of any reader decides for everyone,
//               the reading of the news stays under it) with its field "Add a source (link)", even when the news say nothing of the candidate (the vote and a line that says so). A
//               sentence that is about the election and the association but not known to be a position carries the badge "Uncertain" and the reason, and never colours the map. A reader
//               can join a source (the link of a page that says it) to their vote: the sheet lists the sources under the position of each candidate, with what the AI made of the
//               page, and reads itself again while one is being read. The tab "Notes" has the notes every reader can write and the history of the votes. A reader can also add the
//               link of a PAGE with no candidate chosen ("Add a source", the last thing of the tab Positions): the AI reads it like a news for every candidate and what it finds counts
//               for the positions (the sentences carry "Added by X from a page"); the sheet asks the map again when the AI has finished. The sheet gives the sources; it never gives
//               a verdict on a person
//

import {useEffect, useMemo, useRef, useState} from "react";
import {Tabs} from "radix-ui";
import {CircleHelp, ExternalLink, Megaphone, TriangleAlert, UserCheck} from "lucide-react";
import {Button} from "@/components/ui/button.jsx";
import {Sheet} from "@/components/ui/sheet.jsx";
import {Badge} from "@/components/ui/badge.jsx";
import {FifaApi} from "@/features/fifa/fifaApi.js";
import {CandidateStrip} from "@/features/fifa/components/CandidateStrip.jsx";
import {LeaderNews} from "@/features/fifa/components/LeaderNews.jsx";
import {Notes} from "@/features/fifa/components/Notes.jsx";
import {useAiSummaryRequest} from "@/features/fifa/useAiSummaryRequest.js";
import {SummaryTab} from "@/features/fifa/components/SummaryTab.jsx";
import {PageSources, PagesOfCandidate} from "@/features/fifa/components/PageSources.jsx";
import {PositionTimeline} from "@/features/fifa/components/PositionTimeline.jsx";
import {READING_TAG, isReading} from "@/features/fifa/candidates.js";
import {SourceList} from "@/features/fifa/components/SourceList.jsx";
import {Swatch} from "@/features/fifa/components/Swatch.jsx";
import {VoteControl} from "@/features/fifa/components/VoteControl.jsx";
import {MAX_RECHECKS, RECHECK_AFTER_MS, anyPending, placedUnder} from "@/features/fifa/sourceChecks.js";
import {candidateFill, colouredStrengths, orderBySummary, dotsFill, labelOf, mapFill, patternKeyOf, readEntry, reasonOf, sideOf, strengthOf} from "@/features/fifa/positions.js";
import {languageLabel} from "@/features/briefing/profileWords.js";

const TAB = 'inline-flex h-7 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full px-3.5 text-[0.8125rem] text-ink-mute transition-[color,background-color,box-shadow] duration-200 hover:text-ink data-[state=active]:bg-paper data-[state=active]:text-ink data-[state=active]:shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:data-[state=active]:bg-rule';

const dateOf = (at) => at ? new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '';

const KINDS = {first: 'First position', reversal: 'Reversal', weakened: 'Weakened'};

const MARKS = {
    official: {label: 'Official', tone: 'official', icon: <Megaphone aria-hidden className="size-3.5 shrink-0"/>},
    reported: {label: 'Reported', tone: 'quiet', icon: <CircleHelp aria-hidden className="size-3.5 shrink-0"/>},
    denied: {label: 'Denied', tone: 'warn', icon: <TriangleAlert aria-hidden className="size-3.5 shrink-0"/>},
};

// grouped: the sentence is under the heading of its group (Declared, Probable, Uncertain): the heading says what the badge would
const Signal = ({signal, subject, grouped = false}) => {
    const [original, setOriginal] = useState(false);
    const mark = MARKS[signal.mark];
    // the sentence of a page a reader added: the tag leads to that page in the list of the sources of the sheet
    const openSource = () => {
        const target = document.getElementById(`source-${signal.source_id}`);
        if (!target) return;
        target.scrollIntoView({block: 'center', behavior: 'smooth'});
        target.focus({preventScroll: true});
    };
    const uncertain = signal.certainty === 'uncertain';
    return (
        <li className="border-t border-rule py-5 first:border-t-0 first:pt-1">
            <div className="flex flex-wrap items-center gap-2">
                {uncertain && !grouped && <Badge tone="uncertain">Uncertain</Badge>}
                {mark && <Badge tone={mark.tone} icon={mark.icon}>{mark.label}</Badge>}
                {signal.added_by && (
                    <Badge tone="quiet" onClick={openSource} title="Go to its source" className="!px-2.5 !py-1 !text-[0.75rem]">Added by {signal.added_by} from a page</Badge>
                )}
                <span className="caption">{grouped ? dateOf(signal.published_at) : `${subject?.name ?? signal.subject_qid} · ${dateOf(signal.published_at)}`}</span>
            </div>
            <blockquote lang={signal.lang} className="panel-text mt-2.5 border-l-2 border-rule pl-3.5">“{signal.sentence}”</blockquote>
            {signal.translation && (
                <p className="caption mt-1.5">
                    <span className="italic">Machine translation from {languageLabel(signal.lang)}: </span>{signal.translation}
                </p>
            )}
            {original && <p lang={signal.lang} className="caption mt-1 italic">{signal.sentence}</p>}
            {uncertain && <p className="panel-text mt-2 text-ink-mute"><span className="text-ink">Why Uncertain: </span>{reasonOf(signal.uncertain_reason)}</p>}
            <p className="caption mt-2">
                {signal.speaker?.name ? <>{signal.speaker.name}{signal.speaker.role && `, ${signal.speaker.role}`}</> : 'Speaker not named'}
                {signal.speaker?.name && (signal.speaker.binds ? ' · speaks for the association' : ' · does not speak for the association')}
            </p>
            <p className="caption mt-1 flex flex-wrap items-center gap-x-3">
                <a href={signal.url} target="_blank" rel="noreferrer" className="medium-link inline-flex items-center gap-1">{signal.medium}<ExternalLink aria-hidden className="size-3"/></a>
                <span>{signal.added_by ? 'Read by the AI in a page a reader added' : 'Read by the AI; the sentence is the article\'s own'}</span>
                {signal.translation && <button type="button" onClick={() => setOriginal(!original)} aria-expanded={original} className="cursor-pointer text-action-text hover:underline underline-offset-4">{original ? 'Hide original' : 'Show original'}</button>}
            </p>
        </li>
    );
};

// The sentences of one candidate in the sheet, apart: Declared and Probable (each with its own badge: the colour of the map, strong and light) and
// below them Uncertain (dotted, never coloured). A probable position is coloured on the map but must not be read as a declared one
const GROUPS = [
    {key: 'declared', title: 'Declared'},
    {key: 'probable', title: 'Probable'},
    {key: 'uncertain', title: 'Uncertain'},
];
const GROUP_SHOWN = 3;
// an established sentence whose level is not declared is not read as declared
const groupOf = (signal) => signal.certainty === 'uncertain' ? 'uncertain' : signal.level === 'declared' ? 'declared' : 'probable';

// promoted: a reader's confirmation made the position solid, so the sentences read as probable are no longer drawn as dots
const SignalGroup = ({group, subject, signals, levels, promoted = false}) => {
    const [more, setMore] = useState(false);
    const colours = colouredStrengths(levels);
    // the map draws a probable position with dots when the server has a probable level (a merged level is solid)
    const dotted = levels.some(level => level.endsWith('_probable'));
    const shown = more ? signals : signals.slice(0, GROUP_SHOWN);
    const badge = group.key === 'uncertain'
        ? <Badge tone="uncertain">{group.title}</Badge>
        : <Badge tone="quiet" icon={<Swatch fill={group.key === 'probable' ? dotsFill(patternKeyOf('yes', subject.color_index)) : candidateFill(subject.color_index)}/>}>{group.title}</Badge>;
    const caption = group.key === 'uncertain'
        ? 'Never coloured: about the election and the association, not known to be a position.'
        : group.key === 'probable' && promoted
            ? 'Read as probable from the news; drawn solid on the map: a reader confirmed this position.'
            : !colours[group.key]
            ? 'Not coloured on the map: it colours declared positions only.'
            : dotted ? (group.key === 'declared' ? 'Solid colour on the map.' : 'Dots on the map.') : 'Coloured on the map.';
    return (
        <div className="mt-4" role="group" aria-label={`${group.title} sentences on ${subject.name}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h4>{badge}</h4>
                <span className="caption">{signals.length} {signals.length === 1 ? 'sentence' : 'sentences'} · {caption}</span>
            </div>
            <ul className="mt-2">
                {shown.map(signal => <Signal key={signal.id} signal={signal} subject={subject} grouped/>)}
            </ul>
            {!more && signals.length > shown.length && (
                <button type="button" onClick={() => setMore(true)} className="link cursor-pointer text-[0.875rem]">Show the other {signals.length - shown.length}</button>
            )}
        </div>
    );
};

const VOTES = {for: 'For', against: 'Against', unknown: 'No position', withdraw: 'Took the vote back', confirm: 'Confirmed ✓'};

// the fill of a position, as the map draws it
const fillOf = (subject, position) => mapFill(sideOf(position), subject.color_index, strengthOf(position));

// "Confirm this position ✓": the main action of a card. A reader validates by hand the position the news give: the heaviest word there is, so the map draws
// it solid (the declared level of its side) while it holds; it is no decision (no "Set by a reader": a vote still wins over it). The server records which
// position of the news they saw, so a confirmation older than the news that changed it is told apart (outdated) and counts no more.
// confirmed: {count, by, at, outdated} | null, the readers whose confirmation still holds first; position: the one shown
const ConfirmBlock = ({position, confirmed, reader, onVote}) => {
    const [state, setState] = useState({busy: false, error: null});
    const holding = confirmed ? confirmed.by.slice(0, confirmed.count) : [];
    const mine = reader !== '' && holding.includes(reader);
    const before = Boolean(confirmed) && confirmed.count === 0 && (confirmed.outdated ?? 0) > 0;
    const names = holding.length > 3 ? `${holding.slice(0, 3).join(', ')} and ${holding.length - 3} more` : holding.join(', ');

    const confirm = async () => {
        setState({busy: true, error: null});
        const answer = await onVote('confirm');
        setState({busy: false, error: answer?.error ?? null});
    };

    return (
        <div className="mt-4">
            {mine
                ? <Button variant="quiet" disabled>Confirmed ✓</Button>
                : <Button variant="primary" onClick={confirm} loading={state.busy}>{position === 'inconnue' ? 'Confirm: no position' : 'Confirm this position ✓'}</Button>}
            {before && <p className="caption mt-2">Confirmed before the latest news</p>}
            {holding.length > 0 && <p className="caption mt-2">Confirmed by {names}{confirmed.at && ` · ${dateOf(confirmed.at)}`}</p>}
            {state.error && <p role="alert" className="caption mt-2 !text-accent-ink">{state.error}</p>}
        </div>
    );
};

// mine: this reader's last decision on this candidate, removable: they have one or a confirmation to take back; reader: their name; sources: the sources joined
// to the choices that stand on this candidate; pages: the pages readers added that speak of it (the AI read a position in them), pageContext: {subjects, signals, admin,
// onDeleted} for them; onVote(value, extra): the vote, resolves {ok} or {error} (extra: {source}). A candidate of the rundown: its position and what the news hold. interactive: it is the
// candidate SELECTED in the strip, so the button that confirms the position shown and the vote ("Supported by {country}", "Not supported", "No position") are there too; for a candidate
// the news say nothing of, only the vote and a line that says so. In the rundown of "all" the cards are read only (interactive false): the strip is how a reader goes to the vote
const PositionCard = ({subject, member, entry, levels, history, signals, sources, pages, pageContext, mine, removable, reader, onVote, interactive = true}) => {
    const {human, position, aiPosition, confirmedByReader} = readEntry(entry, levels);
    const quiet = !entry && signals.length === 0 && history.length === 0 && sources.length === 0 && pages.length === 0;
    const side = sideOf(position);
    // a confirmation made the position of the news solid: it is drawn at the declared level, the news read less
    const promoted = confirmedByReader && sideOf(aiPosition) !== 'unknown' && aiPosition !== position;
    const events = [
        // a key moment is a link to the article of the signal that made the change (the server sends its url and medium, null when it has none)
        ...history.map(one => ({
            id: `h-${one.date}-${one.kind}`, at: one.date, kind: 'key', label: `${KINDS[one.kind] ?? one.kind}: ${labelOf(one.to)}`, url: one.url ?? null,
            title: `${dateOf(one.date)}: ${KINDS[one.kind] ?? one.kind}, ${labelOf(one.to)}${one.url && one.medium ? `, ${one.medium}` : ''}`, fill: candidateFill(subject.color_index), weight: 4,
        })),
        ...signals.map(one => ({
            id: `s-${one.id}`, at: one.published_at, kind: 'minor', url: one.url ?? null,
            title: `${dateOf(one.published_at)}: ${one.medium}${one.certainty === 'uncertain' ? ' (Uncertain)' : ''}`, fill: candidateFill(subject.color_index), hollow: one.certainty === 'uncertain',
        })),
    ];
    return (
        <section className="border-t border-rule py-5 first:border-t-0 first:pt-1" aria-label={subject.name}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-[1.0625rem] font-semibold tracking-[-0.01em]"><Swatch fill={candidateFill(subject.color_index)}/>{subject.name}</h3>
                <span className="flex flex-wrap items-center gap-2">
                    {isReading(subject) && <Badge tone="uncertain">{READING_TAG}</Badge>}
                    <Badge tone="quiet" icon={<Swatch fill={fillOf(subject, position)} ring={false}/>}>{labelOf(position)}</Badge>
                    {human && <Badge tone="quiet" icon={<UserCheck aria-hidden className="size-3.5 shrink-0"/>}>Set by a reader</Badge>}
                    {confirmedByReader && <Badge tone="quiet" icon={<UserCheck aria-hidden className="size-3.5 shrink-0"/>}>Confirmed by a reader</Badge>}
                </span>
            </div>
            {(human || confirmedByReader) && (
                <div className="mt-3 text-[0.875rem]">
                    {human && <p>Set by {human.by} · {dateOf(human.at)}</p>}
                    <p className="mt-0.5 flex items-center gap-2 text-ink-mute">
                        <span>AI reading from the news:</span><Swatch fill={fillOf(subject, aiPosition)}/><span className="text-ink">{labelOf(aiPosition)}</span>
                    </p>
                    {human?.newer_evidence && (
                        <p role="status" className="mt-2 rounded-xl border border-accent-ink/30 bg-accent-ink/10 px-3 py-2 text-accent-ink">
                            <span className="font-medium">New evidence since the vote.</span> The news have said more after it. The colour does not change on its own: vote again if the vote no longer holds.
                        </p>
                    )}
                </div>
            )}
            <SourceList sources={sources} name={subject.name}/>
            <PagesOfCandidate pages={pages} name={subject.name} {...pageContext}/>
            {interactive && !quiet && <ConfirmBlock position={position} confirmed={entry?.confirmed ?? null} reader={reader} onVote={onVote}/>}
            {interactive && <VoteControl subject={subject} member={member} mine={mine} removable={removable} onVote={onVote}/>}
            {quiet && <p className="caption mt-4 max-w-[60ch]">No news name this association with {subject.name} yet.</p>}
            {!quiet && <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 text-[0.875rem]">
                {entry?.since && sideOf(aiPosition) !== 'unknown' && <><dt className="text-ink-mute">Since</dt><dd>{dateOf(entry.since)}</dd></>}
                {entry?.previous && entry.previous !== aiPosition && <><dt className="text-ink-mute">Before</dt><dd>{labelOf(entry.previous)}</dd></>}
                {entry?.last_signal_at && <><dt className="text-ink-mute">Last signal</dt><dd>{dateOf(entry.last_signal_at)}</dd></>}
                <dt className="text-ink-mute">Established</dt><dd>{entry?.signals_count ?? 0} {entry?.signals_count === 1 ? 'signal' : 'signals'}</dd>
                <dt className="text-ink-mute">Uncertain</dt><dd>{entry?.uncertain_count ?? 0}</dd>
            </dl>}
            {entry?.stale && !human && <p className="caption mt-2">Older than 90 days: kept for the record, greyed on the map.</p>}
            {(entry?.uncertain_count ?? 0) > 0 && side === 'unknown' && !human && (
                <p className="caption mt-2">No position is established: the sentences below are about the election and this association, but they do not say what it will do.</p>
            )}
            {GROUPS.map(group => {
                const inGroup = signals.filter(signal => groupOf(signal) === group.key);
                return inGroup.length > 0 ? <SignalGroup key={group.key} group={group} subject={subject} signals={inGroup} levels={levels} promoted={promoted}/> : null;
            })}
            {events.length > 0 && <div className="mt-4"><PositionTimeline events={events} lanes={2} opensOn="start" label={`${subject.name}: dated signals`}/></div>}
            {history.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-[0.875rem]">
                    {history.map(one => (
                        <li key={`${one.date}-${one.kind}`} className="flex flex-wrap gap-x-2">
                            <span className="text-ink-mute tabular-nums">{dateOf(one.date)}</span>
                            <span>{KINDS[one.kind] ?? one.kind}: {one.from ? `${labelOf(one.from)} → ` : ''}{labelOf(one.to)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};

// the votes of readers on the association, newest first: who, when, what (the ones taken back too)
const VoteHistory = ({votes, subjects}) => (
    <section aria-labelledby="vote-history">
        <h3 id="vote-history" className="section-title">Position history</h3>
        <p className="caption mt-1 max-w-[60ch]">The last vote of any reader decides the position for everyone; the reading of the news stays visible under it.</p>
        {votes.length === 0
            ? <p className="mt-3 text-[0.9375rem] text-ink-mute">No reader has voted on this association yet.</p>
            : (
                <ul className="mt-3">
                    {votes.map((vote, i) => (
                        <li key={`${vote.at}-${vote.by}-${i}`} className="flex flex-wrap items-baseline gap-x-3 border-t border-rule py-2 text-[0.875rem] first:border-t-0">
                            <span className="w-28 shrink-0 text-ink-mute tabular-nums">{dateOf(vote.at)}</span>
                            <span className="min-w-0 flex-1">
                                <span className="font-medium">{vote.by}</span> · {VOTES[vote.value] ?? vote.value}{vote.value === 'confirm' && vote.seen && ` (saw: ${labelOf(vote.seen)})`} · {subjects.find(one => one.qid === vote.subject_qid)?.name ?? vote.subject_qid}
                                {vote.note && <span className="block text-ink-mute">{vote.note}</span>}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
    </section>
);

// The content of the sheet of one association; the page gives it a key, so the tab and the list start over with each association
// reader: the name of the reader (whose vote is "mine"); admin: they are an administrator (they can delete any note); onVote(member, subject, value, extra): the
// vote, resolves {ok} or {error} (extra: {source}); onMapStale(): the page asks the map again (a page the AI read changed the positions, or was deleted)
const SheetBody = ({qid, member: known, subjects, levels, candidate, reader, admin, onVote, onMapStale}) => {
    const [loaded, setLoaded] = useState({data: null, error: null});
    // the sheet opens on the tab Positions (the user's choice, 13.11.2026), then the Summary (information only)
    const [tab, setTab] = useState('positions');
    const [round, setRound] = useState(0);
    // how many times the sheet read itself again for a source the AI was still reading
    const rechecks = useRef(0);
    // the pages (added on their own) the AI was reading at the last reading: one that is not any more has been read, and what it found counts for the positions
    const reading = useRef(new Set());

    // read again after a vote, the sheet staying as it is until the new answer comes
    useEffect(() => {
        let current = true;
        FifaApi.association(qid)
            .then(data => {
                if (!current) return;
                setLoaded({data: data?.error ? null : data, error: data?.error ?? null});
                const pending = new Set((data?.error ? [] : data?.sources ?? []).filter(one => one.kind === 'page' && one.check === 'pending').map(one => one.id));
                const finished = [...reading.current].some(id => !pending.has(id));
                reading.current = pending;
                if (finished) onMapStale?.();
            })
            .catch(() => { if (current) setLoaded({data: null, error: 'The sheet could not be read. Try again in a moment.'}); });
        return () => { current = false; };
    }, [qid, round, onMapStale]);

    const {data, error} = loaded;
    const votes = useMemo(() => data?.votes ?? [], [data]);
    // the last DECISION of this reader on a candidate (for, against, no position), none when they took it back: a confirmation is no decision
    const mineOn = (subject) => {
        const last = votes.find(vote => vote.subject_qid === subject && vote.by === reader && vote.value !== 'confirm');
        return last && last.value !== 'withdraw' ? last.value : null;
    };
    // this reader has something to take back: a decision, or a confirmation (their last row is not a withdrawal)
    const removableOn = (subject) => {
        const last = votes.find(vote => vote.subject_qid === subject && vote.by === reader);
        return Boolean(last) && last.value !== 'withdraw';
    };
    // the sheet is read again after a choice (a new source starts being read: the count of rereadings starts over)
    const readAgain = () => { rechecks.current = 0; setRound(one => one + 1); };
    const vote = async (subject, value, extra) => {
        const answer = await onVote(data?.member ?? known, subject, value, extra);
        if (answer?.ok) readAgain();
        return answer;
    };
    const member = data?.member ?? known;
    const signals = useMemo(() => data?.signals ?? [], [data]);
    // the cards of the strip: EVERY candidate of the map, in the order of the summary of the sheet (the ones it lists first, supported ones first, then the ones the news say
    // nothing of in their order). The strip is the filter of the tab: with one card selected, the detail under it is the one of that candidate (with the vote, even when the news say
    // nothing of it); with none, the rundown of the candidates the news say something of (withNews, below), read only. The candidate chosen
    // in the list of the page is selected from the start; a candidate that is no longer on the map selects nothing
    const ordered = useMemo(() => orderBySummary(subjects, data?.summary?.candidates ?? null, data?.positions, levels), [subjects, data, levels]);
    const [selected, setSelected] = useState(candidate ?? null);
    const current = ordered.find(subject => subject.qid === selected) ?? null;
    // The sources of the choices that stand, newest first; while the AI reads one the sheet says so and reads itself again after a while (the AI takes 10 to 60 s)
    const sources = useMemo(() => data?.sources ?? [], [data]);
    const waiting = anyPending(sources);
    // the wait starts from what the sheet has just read (a new `data`), not from the call it makes: a slow answer never brings a second call forward
    useEffect(() => {
        if (!waiting || rechecks.current >= MAX_RECHECKS) return undefined;
        const timer = setTimeout(() => { rechecks.current += 1; setRound(one => one + 1); }, RECHECK_AFTER_MS);
        return () => clearTimeout(timer);
    }, [waiting, data]);
    // the sources of the choices go under the position of their candidate; the pages readers added on their own go under the candidate the AI read a position
    // about, or in the list "Sources" of the sheet (being read, nothing clear in them, unreadable)
    const choiceSources = useMemo(() => sources.filter(one => one.kind !== 'page'), [sources]);
    const pageSources = useMemo(() => sources.filter(one => one.kind === 'page'), [sources]);
    const keepSources = (change) => setLoaded(previous => previous.data ? {...previous, data: {...previous.data, sources: change(previous.data.sources ?? [])}} : previous);
    // a page added is being read: the count of readings starts over
    // (and it is one the AI is reading: when a reading of the sheet finds it read, the map is asked again)
    const addPage = (source) => {
        rechecks.current = 0;
        if (source.check === 'pending') reading.current = new Set([...reading.current, source.id]);
        keepSources(list => [source, ...list]);
    };
    // a page deleted takes the signals it gave with it: the sheet and the map are read again
    const dropPage = (id) => { keepSources(list => list.filter(one => one.id !== id)); readAgain(); onMapStale?.(); };
    const pageContext = {subjects, signals, admin, onDeleted: dropPage};
    // The candidates of the rundown of "all": the ones the news (or a reader) say something of. The server keeps an association on the map when anything was read at all, even a
    // passage it left out, so an entry can hold nothing to show (no position, no signal, nothing Uncertain, no vote, no source): such a candidate has a card in the strip and none here
    const withNews = useMemo(() => ordered.filter(subject => {
        const entry = data?.positions?.[subject.qid];
        if (!entry) return false;
        const {human, position, confirmedByReader} = readEntry(entry, levels);
        return sideOf(position) !== 'unknown' || Boolean(human) || confirmedByReader || entry.signals_count > 0 || entry.uncertain_count > 0
            || signals.some(one => one.subject_qid === subject.qid) || (data.history ?? []).some(one => one.subject_qid === subject.qid)
            || sources.some(one => one.subject_qid === subject.qid);
    }), [ordered, data, levels, signals, sources]);
    // the card of a candidate: interactive for the one selected in the strip (its vote), read only in the rundown of all
    const cardOf = (subject, interactive) => (
        <PositionCard key={subject.qid} subject={subject} member={member} entry={data.positions?.[subject.qid]} levels={levels}
                      history={(data.history ?? []).filter(one => one.subject_qid === subject.qid)}
                      signals={signals.filter(one => one.subject_qid === subject.qid)} sources={choiceSources.filter(one => one.subject_qid === subject.qid)}
                      pages={pageSources.filter(one => placedUnder(one, subjects) && one.subject_qid === subject.qid)} pageContext={pageContext}
                      mine={mineOn(subject.qid)} removable={removableOn(subject.qid)} reader={reader} onVote={(value, extra) => vote(subject.qid, value, extra)} interactive={interactive}/>
    );
    // the notes of readers: kept in what the sheet has read (a note added or deleted is there at once), read again with the sheet
    const keepNotes = (change) => setLoaded(previous => previous.data ? {...previous, data: {...previous.data, notes: change(previous.data.notes ?? [])}} : previous);
    // the summary an AI wrote when this reader asked: kept in what the sheet has read (the request lives here, so it goes on when another tab is open)
    const request = useAiSummaryRequest(qid, aiSummary => setLoaded(previous => previous.data ? {...previous, data: {...previous.data, ai_summary: aiSummary}} : previous));

    return (
        <>
            {member?.association && <p className="caption mb-3">{member.association}</p>}
            {data?.mock && <p className="caption mb-3 rounded-xl bg-paper-deep px-3 py-2">Mock data: nothing here is a real position.</p>}
            <Tabs.Root value={tab} onValueChange={setTab}>
                <Tabs.List aria-label="Sheet" className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-paper-deep p-1 [scrollbar-width:none]">
                    <Tabs.Trigger value="positions" className={TAB}>Positions</Tabs.Trigger>
                    <Tabs.Trigger value="summary" className={TAB}>Summary</Tabs.Trigger>
                    <Tabs.Trigger value="leadership" className={TAB}>Leadership profile</Tabs.Trigger>
                    <Tabs.Trigger value="notes" className={TAB}>Notes</Tabs.Trigger>
                </Tabs.List>
                {error && <p role="alert" className="mt-6 text-[0.9375rem] text-accent-ink">{error}</p>}
                {!data && !error && <p className="mt-6 text-[0.9375rem] text-ink-mute">Reading the sheet…</p>}
                {data && (
                    <>
                        <Tabs.Content value="summary" className="mt-6 outline-none">
                            <SummaryTab summary={data.summary} context={data.context ?? null} levels={levels} aiSummary={data.ai_summary ?? null}
                                        aiAvailable={data.ai_summary_available === true} request={request}/>
                        </Tabs.Content>
                        <Tabs.Content value="positions" className="mt-6 outline-none">
                            <CandidateStrip subjects={ordered} positions={data.positions} levels={levels} selected={current?.qid ?? null} onSelect={setSelected}/>
                            {ordered.length === 0
                                ? <p className="mt-4 text-[0.9375rem] text-ink-mute">No candidate is on the map yet.</p>
                                : (
                                    <p className="caption mt-3 max-w-[60ch]">
                                        {current
                                            ? `Only ${current.name}. Select its card again to see all the candidates.`
                                            : withNews.length > 0
                                                ? 'All the candidates the news name with this association. Select a card to see one alone and to take a position.'
                                                : `No position is known for ${member?.name ?? 'this association'} yet. Select a candidate above to take one.`}
                                    </p>
                                )}
                            {(current || withNews.length > 0) && <div className="mt-5">{current ? cardOf(current, true) : withNews.map(subject => cardOf(subject, false))}</div>}
                            <div className="mt-6">
                                <PageSources qid={qid} pages={pageSources.filter(one => !placedUnder(one, subjects))} subjects={subjects} signals={signals} admin={admin}
                                             onAdded={addPage} onDeleted={dropPage}/>
                            </div>
                        </Tabs.Content>
                        <Tabs.Content value="leadership" className="mt-6 outline-none">
                            {data.leader
                                ? (
                                    <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-[0.9375rem]">
                                        <dt className="text-ink-mute">Name</dt><dd>{data.leader.name}</dd>
                                        <dt className="text-ink-mute">Role</dt><dd>{data.leader.role}</dd>
                                        {data.leader.since && <><dt className="text-ink-mute">Since</dt><dd>{dateOf(data.leader.since)}</dd></>}
                                    </dl>
                                )
                                : <p className="text-[0.9375rem] text-ink-mute">No president is listed for this association.</p>}
                            {/* all the news that name the president: asked now, when the tab is opened (the content of a tab is not there before) */}
                            {data.leader && <LeaderNews qid={qid}/>}
                            <p className="caption mt-8 max-w-[60ch]">
                                The president is read from Wikidata once a day. This sheet says who leads the association, not what they think:
                                a position counts only when a sentence of the news says it, and only a speaker who binds the association
                                makes it the association's.
                            </p>
                        </Tabs.Content>
                        <Tabs.Content value="notes" className="mt-6 outline-none">
                            <Notes qid={member?.qid ?? qid} notes={data.notes ?? []} admin={admin}
                                   onAdded={note => keepNotes(notes => [note, ...notes])} onDeleted={id => keepNotes(notes => notes.filter(one => one.id !== id))}/>
                            <div className="mt-8"><VoteHistory votes={votes} subjects={subjects}/></div>
                            <div className="caption mt-6 max-w-[60ch] space-y-1.5 border-t border-rule pt-4">
                                <p>A public statement is not a guaranteed vote.</p>
                                <p>Positions are read from the news by an AI and checked by rules; the sentence and its link are the source. The news are kept for 30 days: older signals are the ones saved here.</p>
                                <p>The borders of the map are indicative.</p>
                            </div>
                        </Tabs.Content>
                    </>
                )}
            </Tabs.Root>
        </>
    );
};

// qid: the association (a member of the map), '' when the sheet is closed; row: what the map knows of it already (the title does not wait)
export const AssociationSheet = ({qid, row, subjects, levels, candidate, reader, admin = false, onVote, onMapStale, onClose}) => {
    const member = row?.member;
    // the focus goes back to the association on the map, the list or the timeline, where the sheet was opened
    const last = useRef('');
    useEffect(() => { if (qid) last.current = qid; }, [qid]);
    const giveBack = (event) => {
        const place = [...document.querySelectorAll('[data-qid]')].find(element => element.dataset.qid === last.current);
        if (place) { event.preventDefault(); place.focus(); }
    };
    return (
        <Sheet open={Boolean(qid)} onOpenChange={open => { if (!open) onClose(); }} onCloseAutoFocus={giveBack}
               kicker={member ? `${member.level === 'confederation' ? 'Confederation' : 'Association'} · ${member.fifa}${member.level === 'association' ? ` · ${member.confederation}` : ''}` : 'Association'}
               title={member?.name ?? 'Association'} description={member?.association ?? member?.name}>
            {qid && <SheetBody key={qid} qid={qid} member={member} subjects={subjects} levels={levels} candidate={candidate} reader={reader} admin={admin} onVote={onVote} onMapStale={onMapStale}/>}
        </Sheet>
    );
};
