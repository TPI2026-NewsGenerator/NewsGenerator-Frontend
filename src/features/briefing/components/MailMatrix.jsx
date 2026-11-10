//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: MailMatrix.jsx
//  Description: The editor of the e-mail as a matrix (the user, 05.11.2026): the stories in rows, what each carries in columns, a box
//               at each crossing, and under it the story chosen, to change its title, its text, its picture or the lines of its
//               analysis and angles, or the e-mail as it will be sent. On a phone eleven columns do not fit: a card for each
//               story, its blocks as buttons that are on or off, and its details opening in it
//

import {useState} from "react";
import {ArrowDown, ArrowUp} from "lucide-react";
import {IconButton} from "@/components/ui/button.jsx";
import {Checkbox} from "@/components/ui/field.jsx";
import {Notice} from "@/components/ui/text.jsx";
import {StoryInspector} from "@/features/briefing/components/MailInspector.jsx";
import {MailPreview} from "@/features/briefing/components/MailPreview.jsx";
import {MailSettings, MailSheet} from "@/features/briefing/components/MailSheet.jsx";
import {BLOCKS, countOf, hasBlock} from "@/features/briefing/mailBlocks.js";
import {two} from "@/features/briefing/useMailDraft.js";
import {usePhone} from "@/lib/usePhone.js";
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

// a block of a story on a phone: a button that is on or off, the ones the story has only
const Pill = ({on, label, disabled = false, onClick, children}) => (
    <button type="button" aria-pressed={on} aria-label={label} disabled={disabled} onClick={onClick}
            className={cn('inline-flex h-8 cursor-pointer items-center rounded-full px-3 text-[0.8125rem] transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                on ? 'bg-action/10 text-action-text ring-1 ring-action/40' : 'bg-paper-deep text-ink-mute')}>
        {children}
    </button>
);

// the stories as cards (a phone): its place, its title, the arrows of its order, its blocks, and its details when it is the one chosen
const StoryCards = ({draft, sending, onNeutralTitle}) => (
    <ol aria-label="What each story carries in the e-mail" className="list-none space-y-3 p-0">
        {draft.ordered.map((one, at) => {
            const open = draft.selected === one.storyId;
            return (
                <li key={one.storyId} className="rounded-2xl ring-1 ring-rule">
                    <div className="flex items-start gap-1 p-3 pb-2">
                        <button type="button" onClick={() => draft.select(open ? 'all' : one.storyId)} aria-pressed={open}
                                aria-label={`Edit “${one.title}” in the e-mail`}
                                className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded-lg text-left font-normal">
                            {draft.ordered.length > 1 && <span aria-hidden className="w-6 shrink-0 tabular text-[0.8125rem] leading-snug font-medium text-ink-mute">{two(at + 1)}</span>}
                            <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 text-[0.875rem] leading-snug">{draft.ownTitle(one) ?? one.title}</span>
                                <span className="caption block">{draft.noteOf(one)}</span>
                            </span>
                        </button>
                        {draft.ordered.length > 1 && (
                            <span className="flex shrink-0">
                                <IconButton label={`Move “${one.title}” up`} className="size-8" onClick={() => draft.move(at, -1)} disabled={at === 0 || sending}>
                                    <ArrowUp aria-hidden className="size-4"/>
                                </IconButton>
                                <IconButton label={`Move “${one.title}” down`} className="size-8" onClick={() => draft.move(at, 1)} disabled={at === draft.ordered.length - 1 || sending}>
                                    <ArrowDown aria-hidden className="size-4"/>
                                </IconButton>
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                        {BLOCKS.filter(block => hasBlock(one, block.key) || (block.key === 'countries' && draft.countriesOf(one).length > 0)).map(block => (
                            <Pill key={block.key} on={draft.isOn(one, block.key)} label={`${block.label}, ${one.title}`}
                                  disabled={block.key === 'picture' && Boolean(draft.choiceOf(one)?.small)}
                                  onClick={() => draft.setBlock([one], block.key, !draft.isOn(one, block.key))}>
                                {block.label}
                            </Pill>
                        ))}
                        {/* no country found: any can be added, in the details of the story, where its countries are open */}
                        {!hasBlock(one, 'countries') && draft.countriesOf(one).length === 0 && (
                            <Pill on={false} label={`Add a country, ${one.title}`} onClick={() => draft.select(one.storyId)}>+ Country</Pill>
                        )}
                    </div>
                    {open && (
                        <div className="border-t border-rule px-3 py-3">
                            <StoryInspector key={one.storyId} draft={draft} story={one} onNeutralTitle={onNeutralTitle} disabled={sending}/>
                        </div>
                    )}
                </li>
            );
        })}
    </ol>
);

// the matrix on a phone: the stories as cards, or the e-mail as it will be sent, in two tabs
const PhoneMatrix = ({draft, sending, onSend, onPreview, onNeutralTitle}) => {
    const [tab, setTab] = useState('stories');
    return (
        <MailSheet draft={draft} sending={sending} onSend={onSend}>
            <div role="tablist" aria-label="The e-mail" className="flex shrink-0 gap-1 border-b border-rule px-3 py-2">
                {[['stories', 'Stories'], ['preview', 'Preview']].map(([value, label]) => (
                    <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}
                            className="h-8 cursor-pointer rounded-full px-4 text-[0.8125rem] text-ink-mute aria-selected:bg-paper-deep aria-selected:text-ink">
                        {label}
                    </button>
                ))}
            </div>
            {tab === 'preview'
                ? (
                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="shrink-0 border-b border-rule px-4 py-2"><MailSettings draft={draft} sending={sending}/></div>
                        <div className="flex min-h-0 flex-1 flex-col p-3">
                            {onPreview ? <MailPreview payload={draft.payload} onPreview={onPreview} focus={draft.selected}/> : <Notice>The preview is not available.</Notice>}
                        </div>
                    </div>
                )
                : (
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                        <div><StoryCards draft={draft} sending={sending} onNeutralTitle={onNeutralTitle}/></div>
                    </div>
                )}
        </MailSheet>
    );
};

// draft: see useMailDraft; onPreview(payload): {html}; onNeutralTitle(storyId): {title}
export const MailMatrix = (props) => {
    const phone = usePhone();
    return phone ? <PhoneMatrix {...props}/> : <WideMatrix {...props}/>;
};

const WideMatrix = ({draft, sending, onSend, onPreview, onNeutralTitle}) => {
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
                                            {hasBlock(one, block.key) || (block.key === 'countries' && draft.countriesOf(one).length > 0)
                                                ? (
                                                    <Checkbox checked={draft.isOn(one, block.key)} className="justify-center py-0"
                                                              disabled={block.key === 'picture' && Boolean(draft.choiceOf(one)?.small)}
                                                              onChange={event => draft.setBlock([one], block.key, event.target.checked)}>
                                                        <span className="sr-only">{block.label}, {one.title}</span>
                                                    </Checkbox>
                                                )
                                                : block.key === 'countries'
                                                    // none found: any country can be added, in the details of the story
                                                    ? <button type="button" aria-label={`Add a country to “${one.title}”`} title="No country found: add one" onClick={() => choose(one.storyId)}
                                                              className="cursor-pointer rounded-full px-2 text-[0.8125rem] text-ink-mute hover:bg-paper-deep hover:text-ink">+</button>
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
