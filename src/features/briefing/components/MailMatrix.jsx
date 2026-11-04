//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: MailMatrix.jsx
//  Description: The editor of the e-mail as a matrix (the user, 05.11.2026): the stories in rows, what each carries in columns, a box
//               at each crossing, and under it the story chosen, to change its title, its text, its picture or the lines of its
//               analysis and angles, or the e-mail as it will be sent
//

import {useState} from "react";
import {ArrowDown, ArrowUp} from "lucide-react";
import {Button, IconButton} from "@/components/ui/button.jsx";
import {Checkbox} from "@/components/ui/field.jsx";
import {Notice} from "@/components/ui/text.jsx";
import {StoryInspector} from "@/features/briefing/components/MailInspector.jsx";
import {MailPreview} from "@/features/briefing/components/MailPreview.jsx";
import {MailSettings, MailSheet} from "@/features/briefing/components/MailSheet.jsx";
import {BLOCKS, countOf, hasBlock, PRESETS} from "@/features/briefing/mailBlocks.js";
import {two} from "@/features/briefing/useMailDraft.js";
import {cn} from "@/lib/utils.js";

// the head of a column: what it is, how many stories have it on, and the button that puts it on (or off) for all of them
const ColumnHead = ({block, draft}) => {
    const {having, on} = countOf(draft.ordered, block.key, draft.isOn);
    const all = having > 0 && on === having;
    return (
        <th scope="col" className="px-1 pt-2 pb-1 text-center align-bottom text-[0.75rem] leading-tight font-normal text-ink-mute">
            <span className="block">{block.label}</span>
            {having === 0
                ? <span className="mt-1 block text-[0.6875rem] opacity-60">none</span>
                : (
                    <button type="button" onClick={() => draft.setBlock(draft.ordered, block.key, !all)}
                            aria-label={`${all ? 'Put off' : 'Put on'} “${block.label}” for every story`}
                            className="mt-1 cursor-pointer rounded-full px-2 text-[0.6875rem] tabular-nums underline-offset-2 hover:bg-paper-deep hover:text-ink">
                        {on}/{having}
                    </button>
                )}
        </th>
    );
};

// draft: see useMailDraft; onPreview(payload): {html}; onNeutralTitle(storyId): {title}
export const MailMatrix = ({draft, sending, onSend, onPreview, onNeutralTitle}) => {
    const [panel, setPanel] = useState('story');
    const stories = draft.ordered;
    const story = draft.selected === 'all' ? null : stories.find(one => one.storyId === draft.selected) ?? null;
    const choose = (storyId) => {
        draft.select(storyId);
        setPanel('story');
    };

    return (
        <MailSheet draft={draft} sending={sending} onSend={onSend}>
            <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-rule px-5 py-2.5">
                    <MailSettings draft={draft} sending={sending}/>
                    <div role="group" aria-label="Presets" className="flex flex-wrap items-center gap-2 md:ml-auto">
                        <span className="kicker">Set every story to</span>
                        {PRESETS.map(preset => (
                            <Button key={preset.value} size="sm" variant="subtle" title={preset.means} onClick={() => draft.applyPreset(preset.on)}>{preset.label}</Button>
                        ))}
                    </div>
                </div>

                <div className="max-h-[45%] shrink-0 overflow-auto border-b border-rule">
                    <table aria-label="What each story carries in the e-mail" className="w-full min-w-[56rem] border-collapse">
                        <thead>
                            <tr className="border-b border-rule">
                                <th scope="col" className="px-5 pt-2 pb-1 text-left align-bottom text-[0.75rem] font-normal text-ink-mute">
                                    {stories.length > 1 ? 'Stories, in their order' : 'The story'}
                                </th>
                                {BLOCKS.map(block => <ColumnHead key={block.key} block={block} draft={draft}/>)}
                            </tr>
                        </thead>
                        <tbody>
                            {stories.map((one, at) => (
                                <tr key={one.storyId} className={cn('border-b border-rule last:border-b-0', draft.selected === one.storyId && 'bg-paper-deep')}>
                                    <th scope="row" className="py-1.5 pr-2 pl-5 text-left font-normal">
                                        <div className="flex items-center gap-1">
                                            <button type="button" onClick={() => choose(one.storyId)} aria-pressed={draft.selected === one.storyId}
                                                    aria-label={`Edit “${one.title}” in the e-mail`}
                                                    className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded-lg px-1.5 py-1 text-left font-normal hover:bg-paper-deep">
                                                {stories.length > 1 && <span aria-hidden className="w-6 shrink-0 tabular text-[0.8125rem] leading-snug font-medium text-ink-mute">{two(at + 1)}</span>}
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[0.8125rem] leading-snug">{draft.ownTitle(one) ?? one.title}</span>
                                                    <span className="caption block truncate">{draft.noteOf(one)}</span>
                                                </span>
                                            </button>
                                            {stories.length > 1 && (
                                                <>
                                                    <IconButton label={`Move “${one.title}” up`} className="size-6" onClick={() => draft.move(at, -1)} disabled={at === 0 || sending}>
                                                        <ArrowUp aria-hidden className="size-3.5"/>
                                                    </IconButton>
                                                    <IconButton label={`Move “${one.title}” down`} className="size-6" onClick={() => draft.move(at, 1)} disabled={at === stories.length - 1 || sending}>
                                                        <ArrowDown aria-hidden className="size-3.5"/>
                                                    </IconButton>
                                                </>
                                            )}
                                        </div>
                                    </th>
                                    {BLOCKS.map(block => (
                                        <td key={block.key} className="px-1 py-1 text-center">
                                            {hasBlock(one, block.key)
                                                ? (
                                                    <Checkbox checked={draft.isOn(one, block.key)} className="justify-center py-0"
                                                              disabled={block.key === 'picture' && Boolean(draft.choiceOf(one)?.small)}
                                                              onChange={event => draft.setBlock([one], block.key, event.target.checked)}>
                                                        <span className="sr-only">{block.label}, {one.title}</span>
                                                    </Checkbox>
                                                )
                                                : <span aria-hidden className="text-ink-mute opacity-50">·</span>}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex shrink-0 items-center gap-1 px-5 pt-2" role="tablist" aria-label="Under the matrix">
                    {[['story', 'Story'], ['preview', 'Preview']].map(([value, label]) => (
                        <button key={value} type="button" role="tab" aria-selected={panel === value} onClick={() => setPanel(value)}
                                className="h-8 cursor-pointer rounded-full px-4 text-[0.8125rem] text-ink-mute aria-selected:bg-paper-deep aria-selected:text-ink">
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-3">
                    {panel === 'preview'
                        ? onPreview ? <MailPreview payload={draft.payload} onPreview={onPreview} focus={draft.selected}/> : <Notice>The preview is not available.</Notice>
                        : story
                            ? <div className="max-w-2xl"><StoryInspector key={story.storyId} draft={draft} story={story} onNeutralTitle={onNeutralTitle} disabled={sending}/></div>
                            : <p className="caption">Choose a story in the matrix to change its title, its text, its picture, or the lines of its analysis and its angles.</p>}
                </div>
            </div>
        </MailSheet>
    );
};
