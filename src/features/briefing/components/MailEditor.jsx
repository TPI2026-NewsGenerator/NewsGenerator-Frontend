//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: MailEditor.jsx
//  Description: The editor of the e-mail in three frames (the user, 05.11.2026): the stories in their order, the e-mail as it will be
//               sent, and what the story chosen carries, block by block. "All the stories" is the first of the list: what is set
//               there is set for each of them. On a phone the three frames are three tabs
//

import {useState} from "react";
import {ArrowDown, ArrowUp, SlidersHorizontal} from "lucide-react";
import {IconButton} from "@/components/ui/button.jsx";
import {Notice} from "@/components/ui/text.jsx";
import {AllInspector, StoryInspector} from "@/features/briefing/components/MailInspector.jsx";
import {MailPreview} from "@/features/briefing/components/MailPreview.jsx";
import {MailSettings, MailSheet} from "@/features/briefing/components/MailSheet.jsx";
import {two} from "@/features/briefing/useMailDraft.js";
import {cn} from "@/lib/utils.js";

const FRAMES = [
    {value: 'order', label: 'Order'},
    {value: 'preview', label: 'Preview'},
    {value: 'edit', label: 'Edit'},
];

// the stories in their order, "all the stories" first; onChoose: one was chosen (on a phone, the tab of what it carries opens)
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
                            <IconButton label={`Move “${story.title}” up`} className="size-6" onClick={() => draft.move(at, -1)} disabled={at === 0 || sending}>
                                <ArrowUp aria-hidden className="size-3.5"/>
                            </IconButton>
                            <IconButton label={`Move “${story.title}” down`} className="size-6" onClick={() => draft.move(at, 1)} disabled={at === draft.ordered.length - 1 || sending}>
                                <ArrowDown aria-hidden className="size-3.5"/>
                            </IconButton>
                        </span>
                    )}
                </li>
            ))}
        </ol>
    </nav>
);

// draft: see useMailDraft; onPreview(payload): {html}; onNeutralTitle(storyId): {title}
export const MailEditor = ({draft, sending, onSend, onPreview, onNeutralTitle}) => {
    const [frame, setFrame] = useState('edit');
    const story = draft.selected === 'all' ? null : draft.ordered.find(one => one.storyId === draft.selected) ?? null;
    // a frame is shown beside the others from a tablet, alone on a phone
    const only = (value) => cn(frame === value ? 'flex' : 'hidden', 'md:flex');

    return (
        <MailSheet draft={draft} sending={sending} onSend={onSend}>
            <div role="tablist" aria-label="The frames of the editor" className="flex shrink-0 gap-1 border-b border-rule px-3 py-2 md:hidden">
                {FRAMES.map(one => (
                    <button key={one.value} type="button" role="tab" aria-selected={frame === one.value} onClick={() => setFrame(one.value)}
                            className="h-8 cursor-pointer rounded-full px-4 text-[0.8125rem] text-ink-mute aria-selected:bg-paper-deep aria-selected:text-ink">
                        {one.label}
                    </button>
                ))}
            </div>
            <div className="grid min-h-0 flex-1 md:grid-cols-[16rem_minmax(0,1fr)_23rem] md:divide-x md:divide-rule">
                <div className={cn('min-h-0 flex-col', only('order'))}><Outline draft={draft} sending={sending} onChoose={() => setFrame('edit')}/></div>

                <div className={cn('min-h-0 min-w-0 flex-col', only('preview'))}>
                    <div className="shrink-0 border-b border-rule px-4 py-2.5"><MailSettings draft={draft} sending={sending}/></div>
                    <div className="flex min-h-0 flex-1 flex-col p-3">
                        {onPreview
                            ? <MailPreview payload={draft.payload} onPreview={onPreview} focus={draft.selected}/>
                            : <Notice>The preview is not available.</Notice>}
                    </div>
                </div>

                <div className={cn('min-h-0 min-w-0 flex-col overflow-y-auto px-4 py-3', only('edit'))}>
                    {draft.selected === 'all' || !story
                        ? <AllInspector draft={draft}/>
                        : <StoryInspector key={story.storyId} draft={draft} story={story} onNeutralTitle={onNeutralTitle} disabled={sending}/>}
                </div>
            </div>
        </MailSheet>
    );
};
