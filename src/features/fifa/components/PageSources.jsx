//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: PageSources.jsx
//  Description: A reader adds the link of a PAGE about an association, with no candidate chosen ("Add a source"). The AI reads it like a news, for every candidate of
//               the map, in the background: what it finds counts for the positions (the sentences it reads are signals like the news', with who added the page), so adding
//               a page can change a colour, and deleting it changes it back. The sheet shows the page under the position of the candidate it speaks of, with what the AI
//               read (the candidate, for or against, the sentence); the pages the AI found nothing clear in (or is still reading, or could not read) are in the list
//               "Sources" at the top of the sheet, an accordion that is closed at first (one line: the title, how many pages and how many are being read) so it takes
//               little room. The author deletes theirs (an administrator any)
//

import {useId, useState} from "react";
import {ChevronDown, ExternalLink, Plus} from "lucide-react";
import {Badge} from "@/components/ui/badge.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Input, Label} from "@/components/ui/field.jsx";
import {FifaApi} from "@/features/fifa/fifaApi.js";
import {Swatch} from "@/features/fifa/components/Swatch.jsx";
import {candidateFill} from "@/features/fifa/positions.js";
import {PAGE_CHECKS, hasReadings, stanceWord} from "@/features/fifa/sourceChecks.js";
import {cn} from "@/lib/utils.js";

const NOTE_LENGTH = 280;
const dateOf = (at) => at ? new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '';

// what to tell a reader whose page or deletion was refused: the words of the server (it says why a link is not accepted and how many a day)
const refusalOf = (answer, fallback) => answer?.status === 401 ? 'Sign in to add a source.' : answer?.error ?? fallback;

// one reading of a page: the candidate, for or against, the sentence the AI found
const Reading = ({reading, subjects}) => {
    const subject = subjects.find(one => one.qid === reading.subject_qid);
    return (
        <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="inline-flex items-center gap-1.5 font-medium">
                {subject && <Swatch fill={candidateFill(subject.color_index)}/>}
                {subject?.name ?? reading.subject_qid}
            </span>
            <span className="text-ink-mute">· {stanceWord(reading)}{reading.level === 'probable' ? ' (probable)' : ''}</span>
            {reading.found && <span className="panel-text basis-full border-l-2 border-rule pl-3.5">“{reading.found}”</span>}
        </li>
    );
};

// A page the reader added: the medium as a link, who added it and when, their note, what the AI made of it, and the delete control of its author (any, for an administrator).
// signals: the signals of the sheet (the ones of this page have its id): when they are all Uncertain the page had no usable date, and the sheet says so;
// onDeleted(id): the sheet forgets the page once the server deleted it (and its signals)
const PageItem = ({source, subjects, signals, admin, onDeleted}) => {
    const [state, setState] = useState({asking: false, busy: false, error: null});
    // 'says' has no badge (its readings say it); a check the page does not know is read as "no clear position"
    const check = source.check in PAGE_CHECKS ? PAGE_CHECKS[source.check] : PAGE_CHECKS.unclear;
    const own = signals.filter(one => one.source_id === source.id);
    const noDate = own.length > 0 && own.every(one => one.certainty === 'uncertain');

    const remove = async () => {
        setState({asking: true, busy: true, error: null});
        let answer;
        try {
            answer = await FifaApi.deleteSource(source.id);
        } catch {
            answer = {error: 'The source could not be deleted. Try again in a moment.'};
        }
        if (answer?.error) setState({asking: true, busy: false, error: refusalOf(answer, 'The source could not be deleted.')});
        else onDeleted(source.id);
    };

    return (
        <li id={`source-${source.id}`} tabIndex={-1} className="scroll-mt-24 rounded-lg text-[0.875rem] outline-none focus-visible:ring-2 focus-visible:ring-action/40">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <a href={source.url} target="_blank" rel="noreferrer" className="medium-link inline-flex items-center gap-1">{source.medium}<ExternalLink aria-hidden className="size-3"/></a>
                <span className="text-ink-mute">Added by {source.mine ? `${source.by} (you)` : source.by} · {dateOf(source.at)}</span>
            </p>
            {source.note && <p className="caption mt-0.5">{source.note}</p>}
            {check && (
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span role={source.check === 'pending' ? 'status' : undefined}><Badge tone={check.tone}>{check.label}</Badge></span>
                </p>
            )}
            {hasReadings(source) && (
                <ul aria-label="What the AI read in the page" className="mt-1.5 space-y-1.5">
                    {source.readings.map(reading => <Reading key={reading.subject_qid} reading={reading} subjects={subjects}/>)}
                </ul>
            )}
            {noDate && <p className="caption mt-1.5">No date found on this page: its sentences are shown as Uncertain.</p>}
            {(source.mine || admin) && (
                <p className="caption mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {!state.asking && (
                        <button type="button" aria-label={`Delete the source ${source.medium} added by ${source.by}`} onClick={() => setState({asking: true, busy: false, error: null})}
                                className="cursor-pointer text-ink-mute transition-colors hover:text-accent-ink">Delete</button>
                    )}
                    {state.asking && (
                        <span className="inline-flex items-center gap-3">
                            <span>Delete this source? What the AI read in it goes too.</span>
                            <button type="button" disabled={state.busy} onClick={remove} className="cursor-pointer text-accent-ink hover:underline underline-offset-4 disabled:opacity-50">Yes, delete</button>
                            <button type="button" disabled={state.busy} onClick={() => setState({asking: false, busy: false, error: null})}
                                    className="cursor-pointer text-action-text hover:underline underline-offset-4 disabled:opacity-50">Keep it</button>
                        </span>
                    )}
                </p>
            )}
            {state.error && <p role="alert" className="caption mt-1 !text-accent-ink">{state.error}</p>}
        </li>
    );
};

// pages: the page sources the AI read something in, that speak of this candidate (the first of their readings); name: the candidate
export const PagesOfCandidate = ({pages, name, subjects, signals, admin, onDeleted}) => {
    if (pages.length === 0) return null;
    return (
        <div className="mt-4" role="group" aria-label={`Pages added about ${name}`}>
            <p className="kicker">Pages added by readers</p>
            <ul className="mt-1.5 space-y-3.5">
                {pages.map(source => <PageItem key={source.id} source={source} subjects={subjects} signals={signals} admin={admin} onDeleted={onDeleted}/>)}
            </ul>
        </div>
    );
};

// "Add a source": a link, an optional note, no candidate to choose. onAdded(source): the sheet puts it first in its sources (it is being read)
const AddPage = ({qid, onAdded}) => {
    const id = useId();
    const [form, setForm] = useState({open: false, link: '', note: '', busy: false, error: null});
    const link = form.link.trim();
    const note = form.note.trim();

    const add = async (event) => {
        event.preventDefault();
        if (link === '') return;
        setForm(previous => ({...previous, busy: true, error: null}));
        let answer;
        try {
            answer = await FifaApi.addSource({member: qid, source: link, ...(note !== '' ? {note} : {})});
        } catch {
            answer = {error: 'The source could not be sent. Try again in a moment.'};
        }
        if (answer?.source) {
            onAdded(answer.source);
            setForm({open: false, link: '', note: '', busy: false, error: null});
        } else {
            // the link stays in the field so the reader corrects it
            setForm(previous => ({...previous, busy: false, error: refusalOf(answer, 'The source was not accepted. Try again in a moment.')}));
        }
    };

    return (
        <div className="mt-2">
            <Button size="sm" aria-expanded={form.open} aria-controls={form.open ? `${id}-form` : undefined}
                    onClick={() => setForm(previous => ({...previous, open: !previous.open, error: null}))}>
                <Plus aria-hidden className={cn('size-4 transition-transform', form.open && 'rotate-45')}/>
                Add a source
            </Button>
            <p className="caption mt-2 max-w-[60ch]">The AI reads the page like a news: what it finds about this association counts for the positions.</p>
            {form.open && (
                <form id={`${id}-form`} onSubmit={add} className="mt-3 max-w-[34rem] space-y-3">
                    <div>
                        <Label htmlFor={`${id}-link`} className="!mb-1 !text-[0.8125rem] !text-ink-mute">Link of the page</Label>
                        <Input id={`${id}-link`} type="text" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://…" value={form.link} disabled={form.busy}
                               onChange={event => setForm(previous => ({...previous, link: event.target.value}))} className="!h-9 !text-[0.9375rem]"/>
                    </div>
                    <div>
                        <Label htmlFor={`${id}-note`} className="!mb-1 !text-[0.8125rem] !text-ink-mute">Note (optional)</Label>
                        <Input id={`${id}-note`} type="text" autoComplete="off" value={form.note} disabled={form.busy} aria-describedby={`${id}-count`}
                               onChange={event => setForm(previous => ({...previous, note: event.target.value}))} className="!h-9 !text-[0.9375rem]"/>
                        <p id={`${id}-count`} className={cn('caption mt-1 tabular-nums', note.length > NOTE_LENGTH && '!text-accent-ink')}>{note.length} / {NOTE_LENGTH}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="submit" variant="primary" size="sm" loading={form.busy} disabled={link === '' || note.length > NOTE_LENGTH}>Add the source</Button>
                        <Button variant="subtle" size="sm" disabled={form.busy} onClick={() => setForm({open: false, link: '', note: '', busy: false, error: null})}>Cancel</Button>
                    </div>
                    {form.error && <p role="alert" className="caption !text-accent-ink">{form.error}</p>}
                </form>
            )}
        </div>
    );
};

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// The accordion "Sources" at the top of the Positions tab, closed at first: one line (the title, what is in it, a chevron). Open, it has the control that adds a page and the pages
// that are not under a candidate yet or at all (the AI is reading them, found no clear position in them, or could not read them). pages: those page sources
export const PageSources = ({qid, pages, subjects, signals, admin, onAdded, onDeleted}) => {
    const id = useId();
    const [open, setOpen] = useState(false);
    const reading = pages.filter(source => source.check === 'pending').length;
    // what the closed line says: the pages in the list, and how many of them the AI is still reading
    const summary = pages.length === 0 ? 'Add a page about this association' : [count(pages.length, 'page', 'pages'), reading > 0 && `${reading} being read`].filter(Boolean).join(' · ');
    return (
        <section aria-label="Sources" className="mb-4 rounded-2xl border border-rule">
            <h3 className="m-0">
                <button type="button" aria-expanded={open} aria-controls={open ? `${id}-body` : undefined} onClick={() => setOpen(!open)}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-left transition-colors hover:bg-paper-deep">
                    <span className="flex min-w-0 flex-wrap items-baseline gap-x-2.5">
                        <span className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">Sources</span>
                        <span className="caption">{summary}</span>
                    </span>
                    <ChevronDown aria-hidden className={cn('size-4 shrink-0 text-ink-mute transition-transform', open && 'rotate-180')}/>
                </button>
            </h3>
            {open && (
                <div id={`${id}-body`} className="px-4 pb-4">
                    <AddPage qid={qid} onAdded={onAdded}/>
                    {pages.length > 0 && (
                        <ul aria-label="Pages added" className="mt-4 space-y-3.5">
                            {pages.map(source => <PageItem key={source.id} source={source} subjects={subjects} signals={signals} admin={admin} onDeleted={onDeleted}/>)}
                        </ul>
                    )}
                </div>
            )}
        </section>
    );
};
