//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: CandidatesDialog.jsx
//  Description: "Add a candidate": a reader searches a person of Wikidata (two letters at least, asked after a short pause), picks one and adds
//               it; no one has to validate it and no status is asked (the server makes it a declared candidate; the reader then clicks a country to take positions). The
//               candidate appears in the selector, its news of the last 30 days being read. The map holds six candidates;
//               when it is full the server says what to do, and the text is shown as it comes. The list of candidates says where each candidate comes from: the server
//               finds some in the news by itself ("Found in the news", with the words of the news), and says while their news are being read. Any reader can remove a
//               candidate (the system can be wrong) with the cross at the right of its row, after ONE confirmation: what was read for it is deleted and the news do not bring it
//               back; the president in office has no such control unless the reader is an administrator. No place of the page changes the status of a candidate any more
//

import {useEffect, useState} from "react";
import {Plus, X} from "lucide-react";
import {Button, IconButton} from "@/components/ui/button.jsx";
import {Input} from "@/components/ui/field.jsx";
import {Dialog} from "@/components/ui/overlay.jsx";
import {FifaApi} from "@/features/fifa/fifaApi.js";
import {Badge} from "@/components/ui/badge.jsx";
import {FOUND_TAG, READING_TAG, foundLine, isFound, isReading} from "@/features/fifa/candidates.js";
import {toast} from "@/lib/toast.js";
import {cn} from "@/lib/utils.js";

const DEBOUNCE_MS = 300;
const MIN_LETTERS = 2;

// what to say when a call was refused: the text of the server as it comes
const sayError = (answer, fallback) => answer?.error ?? fallback;

// onChanged(select): the page asks the map again (and chooses the candidate select, when given); resolves {ok} or {error}; onRemoved(qid): the page asks the map again and
// leaves the candidate removed if it was chosen; admin: the reader may remove the president in office too
const Panel = ({subjects, admin, onChanged, onRemoved, onClose}) => {
    const [query, setQuery] = useState('');
    // what the server answered to the search of `q`: shown only while it is the search of what is typed
    const [found, setFound] = useState({q: '', people: [], error: null});
    const [picked, setPicked] = useState('');
    const [adding, setAdding] = useState({busy: false, error: null});
    // the candidate the reader is asked to confirm the removal of (or being removed), and what the server refused
    const [removing, setRemoving] = useState({qid: '', busy: false, error: null});

    const typed = query.trim();
    const searching = typed.length >= MIN_LETTERS && found.q !== typed;

    // asked a moment after the last letter, the answer of an older search dropped
    useEffect(() => {
        if (typed.length < MIN_LETTERS) return undefined;
        let current = true;
        const timer = setTimeout(() => {
            FifaApi.people(typed)
                .then(answer => { if (current) setFound(answer?.people ? {q: typed, people: answer.people, error: null} : {q: typed, people: [], error: sayError(answer, 'The search did not answer.')}); })
                .catch(() => { if (current) setFound({q: typed, people: [], error: 'The search did not answer. Try again in a moment.'}); });
        }, DEBOUNCE_MS);
        return () => { current = false; clearTimeout(timer); };
    }, [typed]);

    const people = typed.length >= MIN_LETTERS && found.q === typed ? found.people : [];
    const person = people.find(one => one.qid === picked);

    const add = async () => {
        setAdding({busy: true, error: null});
        let answer;
        try {
            answer = await FifaApi.addSubject({qid: person.qid});
        } catch {
            return setAdding({busy: false, error: 'The candidate could not be added. Try again in a moment.'});
        }
        if (!answer?.subject) return setAdding({busy: false, error: sayError(answer, 'The candidate was not added.')});
        // the map is asked again, and the new candidate chosen
        const done = await onChanged(answer.subject.qid);
        if (done?.error) return setAdding({busy: false, error: `${person.name} was added, but the map could not be read again: ${done.error}`});
        if (answer.already) toast(`${answer.subject.name ?? person.name} is already on the map.`);
        else toast.success(`${answer.subject.name ?? person.name} was added: the news of the last 30 days are being read.`);
        return onClose();
    };

    // the president in office (the seed, or the status incumbent) is removed by an administrator only
    const removable = (subject) => admin || !(subject.origin === 'seed' || subject.status === 'incumbent');
    const remove = async (subject) => {
        setRemoving({qid: subject.qid, busy: true, error: null});
        let answer;
        try {
            answer = await FifaApi.removeSubject(subject.qid);
        } catch {
            return setRemoving({qid: subject.qid, busy: false, error: 'The candidate could not be removed. Try again in a moment.'});
        }
        if (answer?.error) return setRemoving({qid: subject.qid, busy: false, error: answer.status === 401 ? 'Sign in to remove a candidate.' : sayError(answer, 'The candidate was not removed.')});
        // the map is asked again; the candidate of the page that was removed is not chosen any more
        const done = await onRemoved(subject.qid);
        if (done?.error) return setRemoving({qid: subject.qid, busy: false, error: `${subject.name} was removed, but the map could not be read again: ${done.error}`});
        toast.success(`${subject.name} was removed from the map.`);
        return setRemoving({qid: '', busy: false, error: null});
    };

    return (
        <div className="space-y-8">
            <section aria-labelledby="add-candidate">
                <h3 id="add-candidate" className="section-title">Search a person</h3>
                <p className="caption mt-1 max-w-[56ch]">
                    Anyone can add a candidate; no one has to validate it. The news of the last 30 days are then read for them, and the map fills in as it goes.
                    The map holds six candidates.
                </p>
                <Input type="search" aria-label="Search a person" placeholder="A name, two letters at least" className="mt-3" value={query} autoComplete="off"
                       onChange={event => { setQuery(event.target.value); setAdding({busy: false, error: null}); }}/>
                <div aria-live="polite" className="mt-3 min-h-6 text-[0.9375rem]">
                    {typed.length > 0 && typed.length < MIN_LETTERS && <p className="text-ink-mute">Two letters at least.</p>}
                    {searching && <p className="text-ink-mute">Searching…</p>}
                    {found.error && found.q === typed && <p role="alert" className="text-accent-ink">{found.error}</p>}
                    {typed.length >= MIN_LETTERS && !searching && !found.error && people.length === 0 && <p className="text-ink-mute">No person found.</p>}
                </div>
                {people.length > 0 && (
                    <ul aria-label="People found" className="mt-1 max-h-60 overflow-y-auto rounded-xl border border-rule">
                        {people.map(one => (
                            <li key={one.qid} className="border-b border-rule last:border-b-0">
                                <button type="button" aria-pressed={one.qid === picked} onClick={() => { setPicked(one.qid); setAdding({busy: false, error: null}); }}
                                        className={cn('block w-full cursor-pointer px-4 py-2.5 text-left transition-colors hover:bg-paper-deep', one.qid === picked && 'bg-paper-deep')}>
                                    <span className="block text-[0.9375rem] font-medium text-ink">{one.name}</span>
                                    {one.description && <span className="block text-[0.8125rem] text-ink-mute">{one.description}</span>}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="mt-4">
                    <Button variant="primary" onClick={add} disabled={!person} loading={adding.busy}>Add</Button>
                </div>
                {adding.error && <p role="alert" className="mt-3 text-[0.9375rem] text-accent-ink">{adding.error}</p>}
            </section>

            <section aria-labelledby="candidate-list">
                <h3 id="candidate-list" className="section-title">List of candidates</h3>
                <p className="caption mt-1 max-w-[56ch]">Take a candidate off with the cross if the news named a person who is not a candidate.</p>
                <ul className="mt-3">
                    {subjects.map(subject => (
                        <li key={subject.qid} className="flex flex-wrap items-center justify-between gap-3 border-t border-rule py-2.5 first:border-t-0">
                            <span className="min-w-0 text-[0.9375rem]">
                                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    {subject.name}
                                    {isFound(subject) && <Badge tone="quiet" className="!px-2 !py-0.5 !text-[0.75rem]" title={foundLine(subject) ?? undefined}>{FOUND_TAG}</Badge>}
                                    {isReading(subject) && <Badge tone="uncertain" className="!px-2 !py-0.5 !text-[0.75rem]">{READING_TAG}</Badge>}
                                </span>
                                {foundLine(subject) && <span className="caption mt-0.5 block max-w-[44ch]">{foundLine(subject)}</span>}
                            </span>
                            {removable(subject) && (
                                <IconButton label={`Remove ${subject.name}`} disabled={removing.qid === subject.qid} aria-expanded={removing.qid === subject.qid}
                                            className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
                                            onClick={() => setRemoving({qid: subject.qid, busy: false, error: null})}>
                                    <X aria-hidden className="size-4"/>
                                </IconButton>
                            )}
                            {removing.qid === subject.qid && (
                                <div role="group" aria-label={`Remove ${subject.name} from the map?`} className="basis-full rounded-xl bg-paper-deep px-4 py-3">
                                    <p className="text-[0.875rem]">
                                        Remove {subject.name} from the map? What was read for this candidate (positions, votes, sources) is deleted and the news will not bring the candidate back.
                                        You can add the candidate again by hand.
                                    </p>
                                    <div className="mt-2.5 flex items-center gap-2">
                                        <Button variant="primary" size="sm" loading={removing.busy} onClick={() => remove(subject)}>Remove</Button>
                                        <Button variant="subtle" size="sm" disabled={removing.busy} onClick={() => setRemoving({qid: '', busy: false, error: null})}>Cancel</Button>
                                    </div>
                                    {removing.error && <p role="alert" className="mt-2 text-[0.875rem] text-accent-ink">{removing.error}</p>}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
};

export const CandidatesDialog = ({subjects, admin = false, onChanged, onRemoved}) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button size="sm" onClick={() => setOpen(true)}>
                <Plus aria-hidden className="size-4"/>
                Add a candidate
            </Button>
            <Dialog open={open} onOpenChange={setOpen} title="Add a candidate" kicker="The FIFA presidency" description="Search a person and add them as a candidate, or take one off the list.">
                <Panel subjects={subjects} admin={admin} onChanged={onChanged} onRemoved={onRemoved} onClose={() => setOpen(false)}/>
            </Dialog>
        </>
    );
};
