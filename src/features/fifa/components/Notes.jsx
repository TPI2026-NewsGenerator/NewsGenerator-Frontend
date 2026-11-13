//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: Notes.jsx
//  Description: The notes of readers on an association, in the tab "Notes" of the sheet: every reader sees them, any reader adds one with the "+" button (1 to 500
//               characters), the author deletes theirs (an administrator any). A note is not a position: it never changes a colour. The notes a reader writes
//               with a choice are not here, they stay in the history of the choices
//

import {useId, useState} from "react";
import {Plus, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button.jsx";
import {Label, Textarea} from "@/components/ui/field.jsx";
import {FifaApi} from "@/features/fifa/fifaApi.js";
import {cn} from "@/lib/utils.js";

const NOTE_LENGTH = 500;
const dateOf = (at) => at ? new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '';

// what to tell a reader whose note or whose deletion was refused
const refusalOf = (answer, fallback) => answer?.status === 401 ? 'Sign in to write a note.' : answer?.error ?? fallback;

// onDeleted(id): the page forgets the note once the server deleted it
const Note = ({note, deletable, onDeleted}) => {
    const [state, setState] = useState({asking: false, busy: false, error: null});

    const remove = async () => {
        setState({asking: true, busy: true, error: null});
        let answer;
        try {
            answer = await FifaApi.deleteNote(note.id);
        } catch {
            answer = {error: 'The note could not be deleted. Try again in a moment.'};
        }
        if (answer?.error) setState({asking: true, busy: false, error: refusalOf(answer, 'The note could not be deleted.')});
        else onDeleted(note.id);
    };

    return (
        <li className="border-t border-rule py-3 text-[0.9375rem] first:border-t-0">
            <p className="whitespace-pre-wrap">{note.text}</p>
            <p className="caption mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{note.mine ? `${note.by} (you)` : note.by} · {dateOf(note.at)}</span>
                {deletable && !state.asking && (
                    <button type="button" aria-label={`Delete the note of ${note.by}, ${dateOf(note.at)}`} onClick={() => setState({asking: true, busy: false, error: null})}
                            className="inline-flex cursor-pointer items-center gap-1 text-ink-mute transition-colors hover:text-accent-ink">
                        <Trash2 aria-hidden className="size-3.5"/>Delete
                    </button>
                )}
                {deletable && state.asking && (
                    <span className="inline-flex items-center gap-3">
                        <span>Delete this note?</span>
                        <button type="button" disabled={state.busy} onClick={remove} className="cursor-pointer text-accent-ink hover:underline underline-offset-4 disabled:opacity-50">Yes, delete</button>
                        <button type="button" disabled={state.busy} onClick={() => setState({asking: false, busy: false, error: null})}
                                className="cursor-pointer text-action-text hover:underline underline-offset-4 disabled:opacity-50">Keep it</button>
                    </span>
                )}
            </p>
            {state.error && <p role="alert" className="caption mt-1 !text-accent-ink">{state.error}</p>}
        </li>
    );
};

// qid: the association; notes: [{id, by, at, text, mine}] newest first; admin: the reader is an administrator (any note can be deleted); onAdded(note) /
// onDeleted(id): the sheet keeps its notes
export const Notes = ({qid, notes, admin = false, onAdded, onDeleted}) => {
    const id = useId();
    const [form, setForm] = useState({open: false, text: '', busy: false, error: null});
    const trimmed = form.text.trim();

    const add = async (event) => {
        event.preventDefault();
        if (trimmed === '') return;
        setForm(previous => ({...previous, busy: true, error: null}));
        let answer;
        try {
            answer = await FifaApi.addNote({member: qid, text: trimmed});
        } catch {
            answer = {error: 'The note could not be sent. Try again in a moment.'};
        }
        if (answer?.note) {
            onAdded(answer.note);
            setForm({open: false, text: '', busy: false, error: null});
        } else {
            setForm(previous => ({...previous, busy: false, error: refusalOf(answer, 'The note was not accepted. Try again in a moment.')}));
        }
    };

    return (
        <section aria-labelledby={`${id}-title`}>
            <div className="flex items-center justify-between gap-3">
                <h3 id={`${id}-title`} className="section-title">Notes</h3>
                <button type="button" aria-label="Add a note" aria-expanded={form.open} aria-controls={form.open ? `${id}-form` : undefined}
                        onClick={() => setForm(previous => ({...previous, open: !previous.open, error: null}))}
                        className={cn('inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-rule text-ink transition-colors hover:border-ink-mute',
                            form.open && 'border-action bg-action text-white hover:border-action')}>
                    <Plus aria-hidden className={cn('size-4 transition-transform', form.open && 'rotate-45')}/>
                </button>
            </div>
            <p className="caption mt-1 max-w-[60ch]">A note is visible to every reader. It is not a position: it never changes a colour.</p>

            {form.open && (
                <form id={`${id}-form`} onSubmit={add} className="mt-4 max-w-[34rem]">
                    <Label htmlFor={`${id}-text`} className="!mb-1 !text-[0.8125rem] !text-ink-mute">Your note</Label>
                    <Textarea id={`${id}-text`} rows={3} value={form.text} disabled={form.busy} onChange={event => setForm(previous => ({...previous, text: event.target.value}))}
                              className="!text-[0.9375rem]" aria-describedby={`${id}-count`}/>
                    <p id={`${id}-count`} className={cn('caption mt-1 tabular-nums', trimmed.length > NOTE_LENGTH && '!text-accent-ink')}>{trimmed.length} / {NOTE_LENGTH}</p>
                    <div className="mt-2 flex items-center gap-2">
                        <Button type="submit" variant="primary" size="sm" loading={form.busy} disabled={trimmed === '' || trimmed.length > NOTE_LENGTH}>Add the note</Button>
                        <Button variant="subtle" size="sm" disabled={form.busy} onClick={() => setForm({open: false, text: '', busy: false, error: null})}>Cancel</Button>
                    </div>
                    {form.error && <p role="alert" className="caption mt-2 !text-accent-ink">{form.error}</p>}
                </form>
            )}

            {notes.length === 0
                ? <p className="mt-3 text-[0.9375rem] text-ink-mute">No reader has written a note on this association yet.</p>
                : (
                    <ul aria-label="Notes" className="mt-3">
                        {notes.map(note => <Note key={note.id} note={note} deletable={note.mine || admin} onDeleted={onDeleted}/>)}
                    </ul>
                )}
        </section>
    );
};
