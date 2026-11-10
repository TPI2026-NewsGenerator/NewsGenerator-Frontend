//
//  Author: Fabian Rostello
//  Date: 10.11.2026
//  File: MailImport.jsx
//  Description: A news of another profile's briefing imported into the e-mail from the editor (the user, 10.11.2026): the button opens a panel
//               with the profiles of the account, then the news of the briefing of the one the reader clicks; a click on a news copies it,
//               as it is in that briefing (with its angles and analysis), into this briefing, ticked and at the end of the e-mail, where it
//               can be changed at once. The panel stays open for the next one
//

import {useEffect, useState} from "react";
import {Popover} from "radix-ui";
import {Check, Loader2, Users} from "lucide-react";
import {Button} from "@/components/ui/button.jsx";
import {Notice} from "@/components/ui/text.jsx";
import {MailSameNews} from "@/features/briefing/components/MailSameNews.jsx";
import {two} from "@/features/briefing/useMailDraft.js";
import {cn} from "@/lib/utils.js";

const when = (at) => new Date(at).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});

// what a row says on its right: the state of the news here
const State = ({busy, added, here}) => {
    if (busy) return <span className="flex shrink-0 items-center gap-1 text-[0.8125rem] text-ink-mute"><Loader2 aria-hidden className="size-3.5 animate-spin"/>Adding…</span>;
    if (added) return <span className="flex shrink-0 items-center gap-1 text-[0.8125rem] text-action-text"><Check aria-hidden className="size-3.5"/>Added</span>;
    if (here) return <span title="Exactly this news, with the same words, is already in this briefing" className="shrink-0 text-[0.8125rem] text-ink-mute">Already here</span>;
    return <span className="shrink-0 text-[0.8125rem] text-action-text">Add</span>;
};

// draft: see useMailDraft (profilesNews(): {profiles, added, max}, importNews(fromBriefingId, storyId): {storyId, title, source, similar} or null,
// foldNews(keep, drop)); a news that tells the same news as a card of the briefing (similar) opens the message that lets the reader choose which
// of the two they use (see MailSameNews); disabled: the e-mail is being sent
export const MailImport = ({draft, disabled = false}) => {
    const [open, setOpen] = useState(false);
    const [loaded, setLoaded] = useState({status: 'loading', profiles: [], added: 0, max: 0, error: null});
    const [chosen, setChosen] = useState(null);     // the idProfile whose news are listed
    const [busy, setBusy] = useState(null);         // 'briefingId:storyId' being copied
    const [copied, setCopied] = useState([]);       // the ones copied since the panel opened
    const [same, setSame] = useState(null);         // the news just copied that tells the same news as a card here, the reader being asked
    const [folding, setFolding] = useState(null);   // 'similar' or 'imported': the version kept while the two are made one

    // asked each time the panel opens: the briefings change, and the news added since are known
    useEffect(() => {
        if (!open) return undefined;
        let current = true;
        setLoaded({status: 'loading', profiles: [], added: 0, max: 0, error: null});
        setCopied([]);
        Promise.resolve().then(() => draft.profilesNews()).then(data => {
            if (!current) return;
            if (data?.error) throw new Error(data.error);
            const profiles = data?.profiles ?? [];
            setLoaded({status: 'ready', profiles, added: data?.added ?? 0, max: data?.max ?? 10, error: null});
            setChosen(profiles[0]?.idProfile ?? null);
        }).catch(err => {
            if (current) setLoaded({status: 'error', profiles: [], added: 0, max: 0, error: err.message});
        });
        return () => { current = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once each time the panel opens
    }, [open]);

    const profile = loaded.profiles.find(one => one.idProfile === chosen) ?? null;
    const full = loaded.status === 'ready' && loaded.added + copied.length >= loaded.max;

    const copy = async (from, news) => {
        const key = `${from.briefingId}:${news.storyId}`;
        if (busy !== null) return;
        setBusy(key);
        try {
            const added = await draft.importNews(from.briefingId, news.storyId);
            if (added !== null) {
                setCopied(current => [...current, key]);
                if (added.similar && draft.canFold) setSame({...added, profile: from.profile});
            }
        } finally {
            setBusy(null);
        }
    };

    // the version the reader keeps: the card of this briefing ('similar') or the news imported ('imported'); the other is folded into it
    const keep = async (which) => {
        setFolding(which);
        try {
            const done = which === 'similar' ? await draft.foldNews(same.similar.storyId, same.storyId) : await draft.foldNews(same.storyId, same.similar.storyId);
            if (done) setSame(null);
        } finally {
            setFolding(null);
        }
    };

    return (
        <>
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <Button size="sm" variant="quiet" disabled={disabled} aria-label="Import from a profile" aria-haspopup="dialog" title="Import a news from the briefing of another profile"
                        className="data-[state=open]:bg-rule/60">
                    <Users aria-hidden className="size-4"/>
                    <span className="max-md:hidden">Import from a profile</span>
                    <span className="md:hidden">Import</span>
                </Button>
            </Popover.Trigger>
            <Popover.Portal>
                {/* the editor changes behind the panel when a news is imported (the story chosen, its frame, the e-mail drawn again) and takes the focus:
                    the panel is not closed by that, only by a click outside it, Escape or its button */}
                <Popover.Content align="end" sideOffset={8} collisionPadding={16} aria-label="Import a news from a profile"
                                 onFocusOutside={event => event.preventDefault()}
                                 className="raised z-50 w-[27rem] max-w-[calc(100vw-2rem)] rounded-2xl bg-paper p-4 shadow-[0_12px_40px_rgba(0,0,0,0.16)] ring-1 ring-rule/60 outline-none animate-in fade-in-0 zoom-in-[0.98]">
                    <p className="text-[0.9375rem] font-medium">Import a news from a profile</p>
                    <p className="caption mt-0.5">The news of its briefing, as it shows them: it is added at the end of this briefing, ticked, with its angles and analysis.</p>

                    {loaded.status === 'loading' && <p role="status" className="caption mt-4 flex items-center gap-2"><Loader2 aria-hidden className="size-3.5 animate-spin"/>Reading the briefings of your other profiles…</p>}
                    {loaded.status === 'error' && <Notice type="error" className="mt-3">{loaded.error}</Notice>}
                    {loaded.status === 'ready' && loaded.profiles.length === 0 && (
                        <p className="caption mt-4">No other profile of your account has a briefing of the last 7 days, written for a reader of this language.</p>
                    )}

                    {loaded.profiles.length > 0 && (
                        <>
                            <div role="group" aria-label="Profiles" className="mt-3 flex flex-wrap gap-1.5">
                                {loaded.profiles.map(one => (
                                    <button key={one.idProfile} type="button" aria-pressed={one.idProfile === chosen} onClick={() => setChosen(one.idProfile)}
                                            className={cn('cursor-pointer rounded-full px-3.5 py-1.5 text-left text-[0.875rem] transition-colors',
                                                one.idProfile === chosen ? 'bg-action text-white' : 'bg-paper-deep text-ink hover:bg-rule/60')}>
                                        {one.profile ?? 'Another profile'}
                                    </button>
                                ))}
                            </div>
                            {profile && <p className="caption mt-2">Its briefing of {when(profile.createdAt)}: {profile.news.length} news.</p>}
                            {full && <p className="caption mt-1 text-accent-ink">{loaded.max} news are added to this briefing: no more can be.</p>}
                            {profile && (
                                <ul aria-label={`The news of ${profile.profile ?? 'the profile'}`} className="mt-2 -mx-1 max-h-[min(22rem,50vh)] list-none overflow-y-auto p-0">
                                    {profile.news.map(news => {
                                        const key = `${profile.briefingId}:${news.storyId}`;
                                        const added = copied.includes(key);
                                        const here = news.inBriefing || added;
                                        return (
                                            <li key={news.storyId}>
                                                <button type="button" onClick={() => copy(profile, news)} disabled={here || full || busy !== null}
                                                        aria-label={`Import “${news.title}” into the e-mail`}
                                                        className="flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-paper-deep disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent">
                                                    <span aria-hidden className="w-6 shrink-0 tabular text-[0.8125rem] leading-snug font-medium text-ink-mute">{news.imported ? '+' : two(news.number)}</span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="line-clamp-2 text-[0.8125rem] leading-snug">{news.title}</span>
                                                        {/* the same news told by a card of this briefing is said, never a reason to refuse it: it can be the better version */}
                                                        <span className="caption block">{news.source ?? ''}{news.imported ? ' · added by the profile' : ''}{news.similarTo ? ` · same news as ${two(news.similarTo)} here` : ''}</span>
                                                    </span>
                                                    <State busy={busy === key} added={added} here={news.inBriefing && !added}/>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </>
                    )}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
        {same && <MailSameNews same={same} busy={folding} onKeep={keep} onClose={() => setSame(null)}/>}
        </>
    );
};
