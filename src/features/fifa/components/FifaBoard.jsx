//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: FifaBoard.jsx
//  Description: The body of the page "The FIFA presidency": it asks the server for the map, turns what the reader chose (in the address)
//               into the colour and the visibility of each association, and shows it in the view chosen: the map, the map with the list,
//               the list, the timeline, the confederations or the presidents, with the sheet of the association open on top
//

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Tabs} from "radix-ui";
import {Notice, Working} from "@/components/ui/text.jsx";
import {FifaApi} from "@/features/fifa/fifaApi.js";
import {loadTopology, layoutOf, shapesOf} from "@/features/fifa/geometry.js";
import {describe, passes, summarise, withVote} from "@/features/fifa/positions.js";
import {TABLE_VIEWS, useFifaState} from "@/features/fifa/useFifaState.js";
import {useMapRefresh} from "@/features/fifa/useMapRefresh.js";
import {useRemote} from "@/features/fifa/useRemote.js";
import {AssociationList, SmallAssociations} from "@/features/fifa/components/AssociationList.jsx";
import {AssociationTable} from "@/features/fifa/components/AssociationTable.jsx";
import {AssociationSheet} from "@/features/fifa/components/AssociationSheet.jsx";
import {ConfederationsView} from "@/features/fifa/components/ConfederationsView.jsx";
import {FiltersBar} from "@/features/fifa/components/FiltersBar.jsx";
import {Legend} from "@/features/fifa/components/Legend.jsx";
import {PresidentsView} from "@/features/fifa/components/PresidentsView.jsx";
import {TimelineView} from "@/features/fifa/components/TimelineView.jsx";
import {ViewTabs} from "@/features/fifa/components/ViewTabs.jsx";
import {WorldMap} from "@/features/fifa/components/WorldMap.jsx";

// stable when the server sends nothing, so what depends on them is not computed again
const NO_SUBJECTS = [];
const NO_MEMBERS = [];
const ONLY_UNKNOWN = ['inconnue'];

const Stat = ({value, children}) => (
    <div>
        <dt className="sr-only">{children}</dt>
        <dd className="text-[1.75rem] leading-none font-semibold tracking-[-0.02em] tabular-nums md:text-[2rem]">{value}</dd>
        <p aria-hidden className="caption mt-1.5">{children}</p>
    </div>
);

// what to tell a reader whose vote was refused; with a source joined, the server's own words are said (it limits the sources a day, 429, and says why a link
// is not accepted, 400 / 422)
const refusalOf = (answer, withSource = false) => answer?.status === 401 ? 'Sign in to vote.'
    : answer?.status === 429 && !(withSource && answer.error) ? 'Too many votes in a short time. Wait a moment and try again.'
        : answer?.error ?? 'The vote was not accepted. Try again in a moment.';

// onRefresh(): asks the map again without leaving the page; resolves {ok} or {error}; fresh: the time (ms) the map was last asked again by itself, what the
// reader did before that is in the map already
const Board = ({data, topology, reader, admin, fresh, onRefresh}) => {
    const navigate = useNavigate();
    const subjects = data.subjects ?? NO_SUBJECTS;
    const candidates = useMemo(() => subjects.map(subject => subject.qid), [subjects]);
    const url = useFifaState(candidates);
    const {state, set, reset, filtered} = url;
    const levels = data.levels ?? ONLY_UNKNOWN;
    const sent = data.members ?? NO_MEMBERS;

    // The votes given on this page, put in the map as the server answered them (the vote that decides now, or none), so the colour follows
    // without asking for the whole map again: {'memberQid|subjectQid': {human: the vote that decides | null, confirmed: the confirmations | null | undefined, at}}
    const [decided, setDecided] = useState({});
    // The choices of a candidate given on this page ("which candidate does it lean towards"): the entries the server answered, for the member: {at, entries}
    const [leaned, setLeaned] = useState({});
    const members = useMemo(() => {
        // what the reader did before the map was last asked again is in that map: the server's answer is the newer one (another reader may have voted since)
        const votes = Object.entries(decided).filter(([, answer]) => answer.at >= fresh);
        const choices = Object.fromEntries(Object.entries(leaned).filter(([, choice]) => choice.at >= fresh).map(([qid, choice]) => [qid, choice.entries]));
        if (votes.length === 0 && Object.keys(choices).length === 0) return sent;
        return sent.map(member => {
            // the entries of a choice replace the ones of the map, the votes given after it come on top
            const chosen = choices[member.qid] ? {...member, positions: {...member.positions, ...choices[member.qid]}} : member;
            return votes.reduce((one, [key, answer]) => {
                const [qid, subject] = key.split('|');
                return qid === member.qid ? withVote(one, subject, answer.human, answer.confirmed) : one;
            }, chosen);
        });
    }, [sent, decided, leaned, fresh]);

    // a reader says which candidate an association leans toward: sent, then the entries the server answered replace the ones of the map (a choice that
    // already stands writes nothing). Resolves {ok} or {error: what to say}
    // extra: {source} the link a reader joined to the candidate they choose
    const lean = useCallback(async (member, subject, extra = {}) => {
        let answer;
        try {
            answer = await FifaApi.lean({member: member.qid, subject, ...extra});
        } catch {
            return {error: 'The choice could not be sent. Try again in a moment.'};
        }
        if (!answer || answer.error || answer.ok !== true) return {error: refusalOf(answer, Boolean(extra.source))};
        setLeaned(previous => ({...previous, [member.qid]: {at: Date.now(), entries: {...previous[member.qid]?.entries, ...answer.positions}}}));
        // a vote given before on one of its candidates is older than this answer: the answer says what stands
        setDecided(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => !key.startsWith(`${member.qid}|`))));
        return {ok: true};
    }, []);

    // a reader's vote: sent, then taken into the map. Resolves {ok} or {error: what to say}
    // extra: {source} the link a reader joined to a for or an against
    const vote = useCallback(async (member, subject, value, extra = {}) => {
        let answer;
        try {
            answer = await FifaApi.vote({subject, member: member.qid, value, ...extra});
        } catch {
            return {error: 'The vote could not be sent. Try again in a moment.'};
        }
        if (!answer || answer.error || answer.ok !== true) return {error: refusalOf(answer, Boolean(extra.source))};
        // a confirmation is no decision (the vote that decides stays what it was); the confirmations are the ones the server says, and withVote draws the
        // position they make solid
        setDecided(previous => ({...previous, [`${member.qid}|${subject}`]: {human: answer.human ?? null, confirmed: answer.confirmed, at: Date.now()}}));
        return {ok: true};
    }, []);

    // the candidate chosen colours the map; none (or one the server does not list: useFifaState says 'all') is the overview
    const scope = useMemo(() => {
        const subject = subjects.find(one => one.qid === state.candidate);
        return subject ? {mode: 'candidate', subject: subject.qid} : {mode: 'all'};
    }, [state.candidate, subjects]);

    const filters = useMemo(() => ({confederation: state.confederation, level: state.level, search: state.search}), [state.confederation, state.level, state.search]);
    const rows = useMemo(() => new Map(members.filter(member => member.level === 'association').map(member => {
        const described = describe(member, scope, levels, subjects);
        return [member.qid, {member, described, visible: passes(member, described, filters)}];
    })), [members, scope, levels, subjects, filters]);

    // the AI finished reading a page a reader added (what it read counts for the positions), or a page was deleted: the colours may have changed, the map is asked again
    const mapStale = useCallback(() => { onRefresh(); }, [onRefresh]);

    // a candidate was removed: the map is asked again, and the candidate of the list (or of the address) that was removed is not chosen any more: All candidates
    const candidateRemoved = useCallback(async (qid) => {
        const done = await onRefresh();
        if (state.candidate === qid) set({candidate: 'all'});
        return done;
    }, [onRefresh, set, state.candidate]);

    // a candidate was added or its status changed: the map is asked again (the page stays as it is), then the new candidate is chosen
    const candidatesChanged = useCallback(async (select) => {
        const done = await onRefresh();
        if (done.error) return done;
        if (select) set({candidate: select});
        return done;
    }, [onRefresh, set]);

    const counts = useMemo(() => summarise(members, scope, levels, subjects), [members, scope, levels, subjects]);
    // what a reader decided in this view: how many positions, and whether one is an opposition (the legend says so)
    const votes = useMemo(() => {
        const decidedRows = [...rows.values()].filter(row => row.described.byReader);
        return {count: decidedRows.length, against: decidedRows.some(row => row.described.candidates.some(one => one.human && one.side === 'no'))};
    }, [rows]);
    const shown = useMemo(() => [...rows.values()].filter(row => row.visible), [rows]);
    const markers = useMemo(() => {
        const layout = layoutOf(members, shapesOf(topology));
        return layout.markers.map(({member}) => rows.get(member.qid)).filter(Boolean);
    }, [members, topology, rows]);

    // the sheet: a step of the history, so Back closes it; closed by its own button it takes that step back
    const opened = useRef(false);
    const open = useCallback((qid) => { opened.current = true; set({association: qid}); }, [set]);
    const close = useCallback(() => {
        if (opened.current) { opened.current = false; navigate(-1); } else set({association: ''});
    }, [navigate, set]);
    useEffect(() => { opened.current = false; }, [state.view]);

    const selectedRow = state.association ? rows.get(state.association) ?? {member: members.find(member => member.qid === state.association)} : null;
    const showConfederation = (fifa) => set({confederation: fifa, view: 'map'});
    const unreadKnown = counts.known;

    return (
        <>
            <div className="page mt-8">
                {data.mock && (
                    <Notice title="Mock data" className="mb-6">Every position, candidate and sentence on this page is made up, to build the page before the server answers. Nothing here is real.</Notice>
                )}
                <dl className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-4">
                    <Stat value={counts.total}>member associations</Stat>
                    <Stat value={unreadKnown}>{unreadKnown === 1 ? 'position known' : 'positions known'}</Stat>
                    <Stat value={counts.uncertain}>with Uncertain signals, no position</Stat>
                    <Stat value={counts.unknown}>unknown</Stat>
                </dl>
                <p className="mt-6 max-w-[70ch] text-[0.9375rem] text-ink-mute">
                    {counts.known} {counts.known === 1 ? 'position' : 'positions'} known · {counts.uncertain} {counts.uncertain === 1 ? 'association' : 'associations'} with Uncertain signals · the rest unknown.
                    {' '}Most of the map is grey by design: the page shows what the news say and nothing more. A public statement is not a guaranteed vote.
                </p>
            </div>

            <FiltersBar state={state} set={set} reset={reset} filtered={filtered} subjects={subjects} admin={admin} onCandidates={candidatesChanged} onRemoved={candidateRemoved}/>

            <Tabs.Root value={state.view} onValueChange={view => set({view})}>
                <div className="page mt-6">
                    <ViewTabs/>
                    {subjects.some(subject => subject.state === 'computing') && (
                        <p role="status" className="caption mt-3">{subjects.filter(subject => subject.state === 'computing').map(subject => subject.name).join(', ')} {subjects.filter(subject => subject.state === 'computing').length === 1 ? 'is' : 'are'} still being read from the news of the last 30 days: the map fills in as it goes.</p>
                    )}
                    {!TABLE_VIEWS.includes(state.view) && <p className="caption mt-3" aria-live="polite">{shown.length} of {rows.size} associations match.</p>}

                    <Tabs.Content value="map" className="mt-4 outline-none">
                        <WorldMap topology={topology} rows={rows} selected={state.association} onSelect={open}/>
                        <Legend scope={scope} subjects={subjects} levels={levels} votes={votes}/>
                        <SmallAssociations rows={markers} selected={state.association} onSelect={open}/>
                    </Tabs.Content>

                    <Tabs.Content value="maplist" className="mt-4 outline-none">
                        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                            <div className="min-w-0">
                                <WorldMap topology={topology} rows={rows} selected={state.association} onSelect={open}/>
                                <Legend scope={scope} subjects={subjects} levels={levels} votes={votes}/>
                                <SmallAssociations rows={markers} selected={state.association} onSelect={open}/>
                            </div>
                            <div className="min-w-0 lg:max-h-[42rem] lg:overflow-y-auto lg:overscroll-contain">
                                <AssociationList rows={shown} selected={state.association} onSelect={open} compact/>
                            </div>
                        </div>
                    </Tabs.Content>

                    <Tabs.Content value="list" className="mt-4 outline-none">
                        <AssociationTable rows={rows} scope={scope} levels={levels} subjects={subjects} url={url} selected={state.association} onSelect={open}/>
                    </Tabs.Content>

                    <Tabs.Content value="timeline" className="mt-4 outline-none">
                        <TimelineView rows={rows} scope={scope} levels={levels} subjects={subjects} onSelect={open}/>
                    </Tabs.Content>

                    <Tabs.Content value="confederations" className="mt-4 outline-none">
                        <ConfederationsView rows={rows} members={members} levels={levels} subjects={subjects} url={url}
                                            selected={state.association} onSelect={open} onShow={showConfederation}/>
                    </Tabs.Content>

                    <Tabs.Content value="presidents" className="mt-4 outline-none">
                        <PresidentsView rows={rows} url={url} selected={state.association} onSelect={open}/>
                    </Tabs.Content>
                </div>
            </Tabs.Root>

            <AssociationSheet qid={selectedRow?.member ? state.association : ''} row={selectedRow} subjects={subjects} levels={levels}
                              candidate={scope.mode === 'candidate' ? scope.subject : null} reader={reader} admin={admin} onVote={vote} onLean={lean} onMapStale={mapStale} onClose={close}/>
        </>
    );
};

// the map and the base map are asked together; the page says so while they come and why when they do not
// reader: the name of the signed in reader (their votes are "mine" in the sheet); admin: the reader is an administrator (they can delete any note)
export const FifaBoard = ({reader = '', admin = false}) => {
    const map = useRemote(FifaApi.map);
    const topology = useRemote(loadTopology);
    // the list of candidates can grow between two visits (the server adds the ones it finds in the news): the map is asked again when the page is focused and
    // every five minutes; `fresh` is when, so the page forgets what it patched in the map before
    const [fresh, setFresh] = useState(0);
    useMapRefresh(map.refresh, setFresh);
    const failed = map.status === 'error' ? map : topology.status === 'error' ? topology : null;

    if (failed) {
        return (
            <div className="page mt-8">
                <Notice type="error" title="The map did not load">
                    {failed.error} <button type="button" onClick={() => { map.reload(); topology.reload(); }} className="link cursor-pointer">Try again</button>
                </Notice>
            </div>
        );
    }
    if (map.status !== 'ready' || topology.status !== 'ready') {
        return <div className="page mt-10"><Working>Reading the map of the 211 associations…</Working></div>;
    }
    return <Board data={map.data} topology={topology.data} reader={reader} admin={admin} fresh={fresh} onRefresh={map.refresh}/>;
};
