//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: MailBar.jsx
//  Description: The bar of the cards ticked in the briefing: how many, then their order in the e-mail
//               and the address they are sent to, the one of the account written in already
//

import {useState} from "react";
import {ArrowDown, ArrowUp} from "lucide-react";
import {Button, IconButton} from "@/components/ui/button.jsx";
import {FieldError, Input, Label} from "@/components/ui/field.jsx";

// one address, as the server checks it (server/services/utils/account-rules.js)
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

const two = (number) => String(number).padStart(2, '0');

// stories: the cards ticked, in the order of the briefing, [{storyId, title, number}] (number: their
// place in the briefing); accountEmail: the address of the account; onSend(to, storyIds): sends them in
// this order, true when sent; onClear: unticks them all
export const MailBar = ({stories, accountEmail, sending, onSend, onClear}) => {
    const [to, setTo] = useState(null);         // null: the address is not asked yet
    const [order, setOrder] = useState([]);     // the storyIds in the order of the e-mail
    const [error, setError] = useState(null);
    const count = stories.length;
    const byId = new Map(stories.map(story => [story.storyId, story]));
    // a story unticked meanwhile leaves the e-mail
    const ordered = order.filter(storyId => byId.has(storyId)).map(storyId => byId.get(storyId));

    const open = () => {
        setOrder(stories.map(story => story.storyId));
        setTo(accountEmail ?? '');
    };

    // one place up (-1) or down (+1) in the e-mail
    const move = (at, by) => {
        const next = ordered.map(story => story.storyId);
        [next[at], next[at + by]] = [next[at + by], next[at]];
        setOrder(next);
    };

    const send = async (event) => {
        event.preventDefault();
        const address = to.trim();
        if (!EMAIL.test(address)) {
            setError('An email, like name@example.org');
            return;
        }
        setError(null);
        if (await onSend(address, ordered.map(story => story.storyId))) setTo(null);
    };

    return (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink bg-paper">
            {to === null ? (
                <div className="page flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                    <p className="folio !text-ink">{count} {count === 1 ? 'story' : 'stories'} ticked</p>
                    <div className="flex gap-2">
                        <Button variant="subtle" size="sm" onClick={onClear}>Untick all</Button>
                        <Button variant="primary" size="sm" onClick={open}>Send email</Button>
                    </div>
                </div>
            ) : (
                <form className="page py-3" onSubmit={send} noValidate>
                    {ordered.length > 1 && (
                        <div className="mb-3">
                            <p className="kicker">Their order in the e-mail</p>
                            <ol aria-label="The stories of the e-mail, in their order" className="mt-1 max-h-[38vh] list-none overflow-y-auto border-y border-rule p-0">
                                {ordered.map((story, at) => (
                                    <li key={story.storyId} className="flex items-center gap-3 border-b border-rule py-1.5 last:border-b-0">
                                        <span aria-hidden className="w-7 shrink-0 font-display text-[1.2rem] leading-none text-ink-mute">{two(at + 1)}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[0.9375rem]">{story.title}</span>
                                            <span className="caption block">{two(story.number)} in the briefing</span>
                                        </span>
                                        <IconButton label={`Move “${story.title}” up`} onClick={() => move(at, -1)} disabled={at === 0 || sending}>
                                            <ArrowUp aria-hidden className="size-4"/>
                                        </IconButton>
                                        <IconButton label={`Move “${story.title}” down`} onClick={() => move(at, 1)} disabled={at === ordered.length - 1 || sending}>
                                            <ArrowDown aria-hidden className="size-4"/>
                                        </IconButton>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0 flex-1 basis-64">
                            <Label htmlFor="mail-to">Send the {count === 1 ? 'story' : `${count} stories`} to</Label>
                            <Input id="mail-to" type="email" autoComplete="email" autoFocus value={to}
                                   onChange={event => setTo(event.target.value)} invalid={Boolean(error)}
                                   aria-describedby={error ? 'mail-to-error' : 'mail-to-help'}/>
                            {error
                                ? <FieldError id="mail-to-error">{error}</FieldError>
                                : <p id="mail-to-help" className="caption mt-1">One address. Sent to another than yours, the e-mail says it comes from you, and the answers come to you.</p>}
                        </div>
                        <div className="flex gap-2 pb-6">
                            <Button variant="subtle" size="sm" onClick={() => setTo(null)} disabled={sending}>Cancel</Button>
                            <Button type="submit" variant="primary" size="sm" loading={sending}>Send</Button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
};
