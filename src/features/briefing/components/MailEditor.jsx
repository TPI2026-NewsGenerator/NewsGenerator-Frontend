//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: MailEditor.jsx
//  Description: The editor of the e-mail in three frames (the user, 05.11.2026): the stories in their order, the e-mail as it will be
//               sent, and what the story chosen carries, block by block. "All the stories" is the first of the list: what is set
//               there is set for each of them. On a phone the e-mail alone is shown, the two other frames closed, each opening from its
//               side over 90% of the screen, the e-mail dimmed beside it (the user, 05.11.2026)
//

import {useState} from "react";
import {ArrowDown, ArrowUp, ListOrdered, SlidersHorizontal, X} from "lucide-react";
import {Button, IconButton} from "@/components/ui/button.jsx";
import {Notice} from "@/components/ui/text.jsx";
import {AllInspector, StoryInspector} from "@/features/briefing/components/MailInspector.jsx";
import {MailPreview} from "@/features/briefing/components/MailPreview.jsx";
import {MailSettings, MailSheet} from "@/features/briefing/components/MailSheet.jsx";
import {two} from "@/features/briefing/useMailDraft.js";
import {usePhone} from "@/lib/usePhone.js";
import {cn} from "@/lib/utils.js";

// the stories in their order, "all the stories" first; onChoose: one was chosen (on a phone, the list closes on the e-mail)
const Outline = ({draft, sending, onChoose}) => (
    <nav aria-label="The stories of the e-mail, in their order" className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        <button type="button" onClick={() => { draft.select('all'); onChoose(); }} aria-pressed={draft.selected === 'all'}
                className={cn('flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[0.8125rem] font-normal transition-colors hover:bg-paper-deep',
                    draft.selected === 'all' && 'bg-paper-deep')}>
            <SlidersHorizontal aria-hidden className="size-4 shrink-0 text-ink-mute"/>
            <span className="min-w-0 flex-1">All the stories<span className="caption block">Set what each carries at once</span></span>
        </button>
        <p className="kicker mt-4 mb-1 px-2.5">{draft.ordered.length > 1 ? 'Their order in the e-mail' : 'The story'}</p>
        <ol aria-label={draft.ordered.length > 1 ? 'The stories of the e-mail, in their order' : 'The story of the e-mail'} className="list-none p-0">
            {draft.ordered.map((story, at) => (
                <li key={story.storyId} className="flex items-center gap-1">
                    <button type="button" onClick={() => { draft.select(story.storyId); onChoose(); }} aria-pressed={draft.selected === story.storyId}
                            aria-label={`Edit “${story.title}” in the e-mail`}
                            className={cn('flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 text-left font-normal transition-colors hover:bg-paper-deep',
                                draft.selected === story.storyId && 'bg-paper-deep')}>
                        {draft.ordered.length > 1 && <span aria-hidden className="w-6 shrink-0 tabular text-[0.8125rem] leading-snug font-medium text-ink-mute">{two(at + 1)}</span>}
                        <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-[0.8125rem] leading-snug">{draft.ownTitle(story) ?? story.title}</span>
                            <span className="caption block">{draft.noteOf(story)}</span>
                        </span>
                    </button>
                    {draft.ordered.length > 1 && (
                        <span className="flex shrink-0 flex-col">
                            <IconButton label={`Move “${story.title}” up`} className="size-8 md:size-6" onClick={() => draft.move(at, -1)} disabled={at === 0 || sending}>
                                <ArrowUp aria-hidden className="size-3.5"/>
                            </IconButton>
                            <IconButton label={`Move “${story.title}” down`} className="size-8 md:size-6" onClick={() => draft.move(at, 1)} disabled={at === draft.ordered.length - 1 || sending}>
                                <ArrowDown aria-hidden className="size-3.5"/>
                            </IconButton>
                        </span>
                    )}
                </li>
            ))}
        </ol>
    </nav>
);

// what the frame on the right shows: every story, or the one chosen
const Inspector = ({draft, onNeutralTitle, sending}) => {
    const story = draft.selected === 'all' ? null : draft.ordered.find(one => one.storyId === draft.selected) ?? null;
    return story
        ? <StoryInspector key={story.storyId} draft={draft} story={story} onNeutralTitle={onNeutralTitle} disabled={sending}/>
        : <AllInspector draft={draft}/>;
};

// the e-mail as it will be sent, its story shown when one is chosen
const Preview = ({draft, onPreview}) => (
    <div className="flex min-h-0 flex-1 flex-col p-3">
        {onPreview
            ? <MailPreview payload={draft.payload} onPreview={onPreview} focus={draft.selected}/>
            : <Notice>The preview is not available.</Notice>}
    </div>
);

// a screen, three frames side by side
const WideEditor = ({draft, sending, onSend, onPreview, onNeutralTitle}) => (
    <MailSheet draft={draft} sending={sending} onSend={onSend}>
        <div className="grid min-h-0 flex-1 grid-cols-[16rem_minmax(0,1fr)_23rem] divide-x divide-rule">
            <div className="flex min-h-0 flex-col"><Outline draft={draft} sending={sending} onChoose={() => {}}/></div>

            <div className="flex min-h-0 min-w-0 flex-col">
                <div className="shrink-0 border-b border-rule px-4 py-2.5"><MailSettings draft={draft} sending={sending}/></div>
                <Preview draft={draft} onPreview={onPreview}/>
            </div>

            <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto px-4 py-3">
                <Inspector draft={draft} onNeutralTitle={onNeutralTitle} sending={sending}/>
            </div>
        </div>
    </MailSheet>
);

// a frame opened from its side over 90% of the screen of a phone, the e-mail dimmed on the rest of it: a tap there, or the button, closes it
const Drawer = ({label, side, onClose, children}) => (
    <div className="absolute inset-0 z-10">
        <div aria-hidden data-drawer-backdrop onClick={onClose} className="absolute inset-0 bg-black/45 animate-in fade-in-0"/>
        <section aria-label={label}
                 className={cn('absolute inset-y-0 flex w-[90%] flex-col bg-paper shadow-[0_0_40px_rgba(0,0,0,0.3)] animate-in duration-200',
                     side === 'left' ? 'left-0 slide-in-from-left' : 'right-0 slide-in-from-right')}>
            <header className="flex shrink-0 items-center gap-3 border-b border-rule px-4 py-2.5">
                <h2 className="text-[1.0625rem] font-medium tracking-[-0.01em]">{label}</h2>
                <IconButton label={`Close ${label.toLowerCase()}`} className="ml-auto bg-paper-deep" onClick={onClose}>
                    <X aria-hidden className="size-4"/>
                </IconButton>
            </header>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
        </section>
    </div>
);

// a phone: the e-mail alone, always; the list of the stories (on the left of a screen) and what the story carries (on the right) are closed,
// a button each opens them from their side. A story chosen in the list closes it on the e-mail, scrolled to that story
const PhoneEditor = ({draft, sending, onSend, onPreview, onNeutralTitle}) => {
    const [open, setOpen] = useState(null);

    return (
        <MailSheet draft={draft} sending={sending} onSend={onSend}>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-rule px-3 py-2">
                <Button size="sm" variant="subtle" onClick={() => setOpen('order')} aria-haspopup="dialog">
                    <ListOrdered aria-hidden className="size-4"/>Stories
                </Button>
                <Button size="sm" variant="subtle" onClick={() => setOpen('edit')} aria-haspopup="dialog">
                    Edit<SlidersHorizontal aria-hidden className="size-4"/>
                </Button>
            </div>
            <div className="shrink-0 border-b border-rule px-4 py-2"><MailSettings draft={draft} sending={sending}/></div>
            <Preview draft={draft} onPreview={onPreview}/>

            {open === 'order' && (
                <Drawer label="The stories" side="left" onClose={() => setOpen(null)}>
                    <Outline draft={draft} sending={sending} onChoose={() => setOpen(null)}/>
                </Drawer>
            )}
            {open === 'edit' && (
                <Drawer label="What the e-mail carries" side="right" onClose={() => setOpen(null)}>
                    <div className="px-4 py-3"><Inspector draft={draft} onNeutralTitle={onNeutralTitle} sending={sending}/></div>
                </Drawer>
            )}
        </MailSheet>
    );
};

// draft: see useMailDraft; onPreview(payload): {html}; onNeutralTitle(storyId): {title}
export const MailEditor = (props) => usePhone() ? <PhoneEditor {...props}/> : <WideEditor {...props}/>;
