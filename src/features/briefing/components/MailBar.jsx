//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: MailBar.jsx
//  Description: The bar of the cards ticked in the briefing: how many, then their order and their
//               picture in the e-mail, and the address they are sent to, the one of the account
//               written in already
//

import {useState} from "react";
import {ArrowDown, ArrowUp} from "lucide-react";
import {Button, IconButton} from "@/components/ui/button.jsx";
import {FieldError, Input, Label} from "@/components/ui/field.jsx";
import {MailAside} from "@/features/briefing/components/MailAside.jsx";
import {MailPicture, Thumbnail} from "@/features/briefing/components/MailPicture.jsx";
import {fileBytes, MAX_FILES_BYTES, sentPicture, shownPicture} from "@/features/briefing/mailPictures.js";

// one address, as the server checks it (server/services/utils/account-rules.js)
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

const two = (number) => String(number).padStart(2, '0');

// "2 angles taken out", "1 denial taken out", or nothing (see MailAside)
const takenOut = (removed = {}) => [
    [removed.contested?.length ?? 0, 'denial', 'denials'],
    [removed.angles?.length ?? 0, 'angle', 'angles'],
].filter(([count]) => count > 0).map(([count, one, many]) => `${count} ${count === 1 ? one : many} taken out`).join(' · ');

// stories: the cards ticked, in the order of the briefing, [{storyId, title, number, thumbnail,
// thumbnailSource, contested, angles}] (number: their place in the briefing); accountEmail: the address
// of the account; onSend(to, storyIds, pictures, titles, removed): sends them in this order with the
// pictures and the titles the reader changed, without the denials and angles they took out, true when
// sent; onPictures(storyId): {pictures}, the ones of a story; onClear: unticks them all
export const MailBar = ({stories, accountEmail, sending, onSend, onPictures, onClear}) => {
    const [to, setTo] = useState(null);         // null: the address is not asked yet
    const [order, setOrder] = useState([]);     // the storyIds in the order of the e-mail
    const [choices, setChoices] = useState({}); // storyId -> the picture chosen (see MailPicture)
    const [titles, setTitles] = useState({});   // storyId -> the title written for the e-mail
    const [removed, setRemoved] = useState({}); // storyId -> {contested, angles}: the places taken out
    const [galleries, setGalleries] = useState({});     // storyId -> its pictures, null while asked
    const [editing, setEditing] = useState(null);       // the storyId whose title and picture are being changed
    const [error, setError] = useState(null);
    const [picturesError, setPicturesError] = useState(null);
    const count = stories.length;
    const byId = new Map(stories.map(story => [story.storyId, story]));
    // a story unticked meanwhile leaves the e-mail
    const ordered = order.filter(storyId => byId.has(storyId)).map(storyId => byId.get(storyId));

    const open = () => {
        setOrder(stories.map(story => story.storyId));
        setChoices({});
        setTitles({});
        setRemoved({});
        setEditing(null);
        setTo(accountEmail ?? '');
    };

    // one place up (-1) or down (+1) in the e-mail
    const move = (at, by) => {
        const next = ordered.map(story => story.storyId);
        [next[at], next[at + by]] = [next[at + by], next[at]];
        setOrder(next);
    };

    // the pictures of the story asked once, its own among them even when the server did not answer
    const edit = async (story) => {
        setEditing(editing === story.storyId ? null : story.storyId);
        if (story.storyId in galleries) return;
        setGalleries(current => ({...current, [story.storyId]: null}));
        const answer = await Promise.resolve().then(() => onPictures?.(story.storyId)).catch(() => null);
        const found = Array.isArray(answer?.pictures) ? answer.pictures : [];
        const own = story.thumbnail && !found.some(picture => picture.url === story.thumbnail)
            ? [{url: story.thumbnail, source: story.thumbnailSource ?? ''}] : [];
        setGalleries(current => ({...current, [story.storyId]: [...own, ...found]}));
    };

    // the title the reader wrote, when it is not the one of the card
    const ownTitle = (story) => {
        const title = (titles[story.storyId] ?? '').replace(/\s+/g, ' ').trim();
        return title && title !== story.title ? title : null;
    };

    const choose = (storyId, choice) => setChoices(current => {
        const next = {...current};
        if (choice === undefined) delete next[storyId];
        else next[storyId] = choice;
        return next;
    });

    const send = async (event) => {
        event.preventDefault();
        const address = to.trim();
        if (!EMAIL.test(address)) {
            setError('An email, like name@example.org');
            return;
        }
        const sent = ordered.filter(story => choices[story.storyId] !== undefined);
        const files = sent.reduce((sum, story) => sum + fileBytes(choices[story.storyId]), 0);
        if (files > MAX_FILES_BYTES) {
            setPicturesError(`Your images weigh ${MAX_FILES_BYTES / 1024 / 1024} MB at most together: take one out, or use its address.`);
            return;
        }
        setError(null);
        setPicturesError(null);
        const pictures = Object.fromEntries(sent.map(story => [story.storyId, sentPicture(choices[story.storyId])]));
        const retitled = Object.fromEntries(ordered.map(story => [story.storyId, ownTitle(story)]).filter(([, title]) => title));
        const left = Object.fromEntries(ordered.filter(story => takenOut(removed[story.storyId]))
            .map(story => [story.storyId, removed[story.storyId]]));
        if (await onSend(address, ordered.map(story => story.storyId), pictures, retitled, left)) setTo(null);
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
                    <div className="mb-3">
                        <p className="kicker">{ordered.length > 1 ? 'Their order, title, picture and asides in the e-mail' : 'Its title, picture and asides in the e-mail'}</p>
                        <ol aria-label={ordered.length > 1 ? 'The stories of the e-mail, in their order' : 'The story of the e-mail'}
                            className="mt-1 max-h-[45vh] list-none overflow-y-auto border-y border-rule p-0">
                            {ordered.map((story, at) => {
                                const choice = choices[story.storyId];
                                return (
                                    <li key={story.storyId} className="border-b border-rule py-1.5 last:border-b-0">
                                        <div className="flex items-center gap-3">
                                            {ordered.length > 1 && <span aria-hidden className="w-7 shrink-0 font-display text-[1.2rem] leading-none text-ink-mute">{two(at + 1)}</span>}
                                            <Thumbnail src={shownPicture(story, choice)}/>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[0.9375rem]">{ownTitle(story) ?? story.title}</span>
                                                <span className="caption block">
                                                    {two(story.number)} in the briefing
                                                    {ownTitle(story) && ' · title changed'}
                                                    {choice?.kind === 'none' && ' · no picture'}
                                                    {choice && choice.kind !== 'none' && ' · picture changed'}
                                                    {takenOut(removed[story.storyId]) && ` · ${takenOut(removed[story.storyId])}`}
                                                </span>
                                            </span>
                                            <Button size="sm" variant="subtle" onClick={() => edit(story)} disabled={sending}
                                                    aria-expanded={editing === story.storyId} aria-label={`Edit “${story.title}” in the e-mail`}>
                                                Edit
                                            </Button>
                                            {ordered.length > 1 && (
                                                <>
                                                    <IconButton label={`Move “${story.title}” up`} onClick={() => move(at, -1)} disabled={at === 0 || sending}>
                                                        <ArrowUp aria-hidden className="size-4"/>
                                                    </IconButton>
                                                    <IconButton label={`Move “${story.title}” down`} onClick={() => move(at, 1)} disabled={at === ordered.length - 1 || sending}>
                                                        <ArrowDown aria-hidden className="size-4"/>
                                                    </IconButton>
                                                </>
                                            )}
                                        </div>
                                        {editing === story.storyId && (
                                            <>
                                                <div className="mt-2">
                                                    <Label htmlFor={`mail-title-${story.storyId}`}>Its title in the e-mail</Label>
                                                    {/* Enter would send the e-mail */}
                                                    <Input id={`mail-title-${story.storyId}`} maxLength={300} value={titles[story.storyId] ?? story.title}
                                                           onChange={event => setTitles(current => ({...current, [story.storyId]: event.target.value}))}
                                                           onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }}/>
                                                    {ownTitle(story) && (
                                                        <Button size="sm" variant="link" className="mt-1"
                                                                onClick={() => setTitles(current => ({...current, [story.storyId]: story.title}))}>
                                                            Back to its own title
                                                        </Button>
                                                    )}
                                                </div>
                                                <MailAside story={story} removed={removed[story.storyId]}
                                                           onChange={next => setRemoved(current => ({...current, [story.storyId]: next}))}/>
                                                <MailPicture story={story} choice={choice} pictures={galleries[story.storyId] ?? null}
                                                             onChoose={next => choose(story.storyId, next)} onClose={() => setEditing(null)}/>
                                            </>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                        {picturesError && <FieldError>{picturesError}</FieldError>}
                    </div>
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
