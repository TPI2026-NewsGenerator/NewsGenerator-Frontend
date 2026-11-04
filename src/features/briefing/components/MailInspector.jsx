//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: MailInspector.jsx
//  Description: What a story carries in the e-mail, one section for each, the reader putting it on or off: its title, its text, its
//               picture, its countries, its badges, who it is about, its AI analysis (line by line), its angles (line by line),
//               its affair and its coverage. And the same for every story at once, with the presets (the user, 05.11.2026)
//

import {useState} from "react";
import {ChevronDown, ChevronRight} from "lucide-react";
import {Button} from "@/components/ui/button.jsx";
import {Checkbox, Input, Label, Textarea} from "@/components/ui/field.jsx";
import {AngleLines, AnalysisLines, ContestedLines, OfficialLines} from "@/features/briefing/components/MailAside.jsx";
import {MailCountries} from "@/features/briefing/components/MailCountries.jsx";
import {MailNeutralTitle} from "@/features/briefing/components/MailNeutralTitle.jsx";
import {MailPicture} from "@/features/briefing/components/MailPicture.jsx";
import {BLOCKS, countOf, hasBlock, PRESETS} from "@/features/briefing/mailBlocks.js";
import {aiTextOf, editable, two, WAY_NAMES} from "@/features/briefing/useMailDraft.js";
import {languageLabel} from "@/features/briefing/profileWords.js";
import {cn} from "@/lib/utils.js";

// One block of the story: its box to put it on or off, what is said beside it (hint), and its details behind a button
// (children, shown while it is open, on or off: a picture can be chosen for a story that has none). Without onChange it is a part that is always there (the title, the text)
const Section = ({label, name, checked, onChange, disabled = false, hint, open, onToggle, children}) => (
    <section className="border-b border-rule py-2.5 last:border-b-0">
        <div className="flex items-center gap-2">
            {onChange
                ? <Checkbox checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} className="min-w-0 flex-1 text-[0.8125rem]">{label}</Checkbox>
                : <p className="kicker flex-1 !text-ink">{label}</p>}
            {hint && <span className="caption shrink-0">{hint}</span>}
            {children && (
                <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} the details of ${name ?? label}`}
                        className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-mute hover:bg-paper-deep hover:text-ink">
                    {open ? <ChevronDown aria-hidden className="size-4"/> : <ChevronRight aria-hidden className="size-4"/>}
                </button>
            )}
        </div>
        {children && open && <div className="mt-2 min-w-0">{children}</div>}
    </section>
);

// the story the reader is changing. draft: see useMailDraft; onNeutralTitle(storyId): the neutral title the AI proposes
export const StoryInspector = ({draft, story, onNeutralTitle, disabled = false}) => {
    const [open, setOpen] = useState({title: true, text: true});
    const toggle = (name) => setOpen(current => ({...current, [name]: !current[name]}));
    const id = story.storyId;
    const choice = draft.choiceOf(story);
    const {shown, way} = draft;
    const aiText = aiTextOf(story, way);
    const blocks = draft.blocksOf(story);
    const has = (key) => hasBlock(story, key);
    const none = (key) => has(key) ? undefined : 'none';
    const set = (key) => (on) => draft.setBlock([story], key, on);
    const removedOf = draft.removed[id];

    return (
        <div aria-label={`What “${story.title}” carries in the e-mail`} role="group">
            {/* whose blocks these are: the story chosen in the list, not every story */}
            <div className="border-b border-rule pb-3">
                <p className="kicker">{draft.ordered.length > 1 ? `Story ${two(draft.ordered.indexOf(story) + 1)}, in the e-mail` : 'The story'}</p>
                <p className="panel-text mt-0.5 line-clamp-2">{story.title}</p>
            </div>
            <Section label="Title" open={open.title} onToggle={() => toggle('title')}>
                <Label htmlFor={`mail-title-${id}`}>Its title in the e-mail</Label>
                {/* Enter would send the e-mail */}
                <Input id={`mail-title-${id}`} maxLength={300} value={draft.titles[id] ?? story.title}
                       onChange={event => draft.setTitle(id, event.target.value)}
                       onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }}/>
                {draft.ownTitle(story) && (
                    <Button size="sm" variant="link" className="mt-1" onClick={() => draft.setTitle(id, story.title)}>Back to its own title</Button>
                )}
                {/* the title of the card is not the one the medium wrote when its bait was taken out or the AI rewrote it
                    (the user, 03.11.2026): the title as published is there to put back, as the medium wrote it (in its
                    language when the card is translated: it is not translated) */}
                {story.titleAsPublished && (
                    <div className="mt-2">
                        <p className="caption">
                            Title as published{story.titleTranslated && story.titleLanguage ? ` (${languageLabel(story.titleLanguage)}, not translated)` : ''}:{' '}
                            <span lang={story.titleLanguage ?? undefined} className="italic">“{story.titleAsPublished}”</span>
                        </p>
                        <Button size="sm" variant="link" className="mt-1" disabled={disabled || (draft.titles[id] ?? story.title) === story.titleAsPublished}
                                onClick={() => draft.setTitle(id, story.titleAsPublished)}>
                            Use the title as published
                        </Button>
                    </div>
                )}
                {/* the AI proposes, the reader reads it against the title and uses it or not */}
                {onNeutralTitle && <MailNeutralTitle story={story} onAsk={onNeutralTitle} disabled={disabled} onUse={title => draft.setTitle(id, title)}/>}
            </Section>

            <Section label="Text" open={open.text} onToggle={() => toggle('text')}>
                {aiText ? (
                    <Checkbox checked={Boolean(draft.inAi[id])} className="mb-2 text-[0.8125rem]" onChange={event => draft.setAi(id, event.target.checked)}>
                        Send its {WAY_NAMES[shown]} in the AI version
                    </Checkbox>
                ) : way && (
                    // the box is not there: said, rather than left to be looked for
                    <p className="caption mb-2">
                        {way === 'passages'
                            ? 'The key passages have no AI version: choose bullet points or the summary (In the e-mail, as) to send one.'
                            : `No AI version of the ${WAY_NAMES[way]} of this card: the AI did not write one the article backs (a figure it does not give, or no answer).`}
                    </p>
                )}
                {/* what the e-mail sends, the reader changing it as they want (the user, 20.10.2026) */}
                <Label htmlFor={`mail-text-${id}`}>Its {WAY_NAMES[shown]} in the e-mail</Label>
                <Textarea id={`mail-text-${id}`} className="mt-1 p-3 text-[0.8125rem]" rows={shown === 'points' ? 4 : 7}
                          value={draft.texts[id]?.[shown] ?? editable(draft.sentOf(story), shown)}
                          aria-describedby={`mail-text-help-${id}`} disabled={disabled}
                          onChange={event => draft.writeText(id, event.target.value)}/>
                <p id={`mail-text-help-${id}`} className="caption mt-1">
                    {draft.inAi[id] && aiText ? 'The AI version' : 'The article’s own sentences'}
                    {draft.ownText(story) ? ', changed by you' : ', as the e-mail sends them'}.
                    {shown === 'points' ? ' One point a line.' : ' A blank line between two paragraphs.'} Left empty, its own are sent.
                </p>
                {draft.ownText(story) && (
                    <Button size="sm" variant="link" className="mt-1" onClick={() => draft.writeText(id, undefined)}>
                        Back to {draft.inAi[id] && aiText ? 'the AI version' : 'the article’s sentences'}
                    </Button>
                )}
            </Section>

            <Section label="Picture" checked={draft.isOn(story, 'picture')} onChange={set('picture')} disabled={Boolean(choice?.small)}
                     hint={choice?.small ? 'too small' : choice?.auto ? 'a sharper one' : undefined} open={open.picture} onToggle={() => toggle('picture')}>
                <MailPicture story={story} choice={choice} pictures={draft.galleries[id] ?? null}
                             onChoose={next => draft.choose(id, next)} onClose={() => toggle('picture')}/>
            </Section>

            <Section label="Countries" checked={draft.isOn(story, 'countries')} onChange={set('countries')} disabled={!has('countries') && draft.countriesOf(story).length === 0}
                     hint={none('countries')} open={open.countries} onToggle={() => toggle('countries')}>
                <MailCountries story={story} chosen={draft.countriesOf(story)} onChange={codes => draft.chooseCountries(story, codes)}/>
            </Section>

            <p className="kicker pt-3">Badges</p>
            <Section label={has('media') ? `Told by ${story.media} ${story.media === 1 ? 'medium' : 'media'}` : 'Told by'} checked={blocks.media} onChange={set('media')}
                     disabled={!has('media')} hint={none('media')}/>
            <Section label="Contested" checked={blocks.contested} onChange={set('contested')} disabled={!has('contested')} hint={none('contested')}
                     open={open.contested} onToggle={() => toggle('contested')}>
                <ContestedLines story={story} removed={removedOf} onChange={next => draft.setRemovedOf(id, next)}/>
            </Section>
            <Section label="Official source" checked={blocks.official} onChange={set('official')} disabled={!has('official')} hint={none('official')}
                     open={open.official} onToggle={() => toggle('official')}>
                <OfficialLines story={story} removed={removedOf} onChange={next => draft.setRemovedOf(id, next)}/>
            </Section>
            <Section label="Unconfirmed" checked={blocks.unconfirmed} onChange={set('unconfirmed')} disabled={!has('unconfirmed')} hint={none('unconfirmed')}/>

            <p className="kicker pt-3">Around the story</p>
            <Section label="Who it is about" checked={blocks.names} onChange={set('names')} disabled={!has('names')} hint={none('names')}
                     open={open.names} onToggle={() => toggle('names')}>
                <p className="caption">{(story.names ?? []).join(' · ')}</p>
            </Section>
            <Section label="AI analysis" checked={blocks.analysis} onChange={set('analysis')} disabled={!has('analysis')} hint={none('analysis')}
                     open={open.analysis} onToggle={() => toggle('analysis')}>
                <AnalysisLines story={story} removed={removedOf} onChange={next => draft.setRemovedOf(id, next)}/>
            </Section>
            <Section label="Angles" checked={blocks.angles} onChange={set('angles')} disabled={!has('angles')} hint={none('angles')}
                     open={open.angles} onToggle={() => toggle('angles')}>
                <AngleLines story={story} removed={removedOf} onChange={next => draft.setRemovedOf(id, next)}/>
            </Section>
            <Section label="This affair" checked={blocks.affair} onChange={set('affair')} disabled={!has('affair')}
                     hint={has('affair') ? 'about 20 s the first time' : 'not an affair'}/>
            <Section label="Coverage" checked={blocks.coverage} onChange={set('coverage')} disabled={!has('coverage')} hint={none('coverage')}/>
        </div>
    );
};

// the same blocks for every story at once: a preset, or one block put on or off for all of those that have it
export const AllInspector = ({draft}) => {
    const stories = draft.ordered;
    return (
        <div role="group" aria-label="What every story carries in the e-mail">
            <p className="caption">Set for every story, then change one in particular by choosing it.</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Presets">
                {PRESETS.map(preset => (
                    <Button key={preset.value} size="sm" variant="subtle" title={preset.means} onClick={() => draft.applyPreset(preset.on)}>{preset.label}</Button>
                ))}
            </div>
            <div className="mt-3">
                {BLOCKS.map(block => {
                    const {having, on} = countOf(stories, block.key, draft.isOn);
                    return (
                        <div key={block.key} className="flex items-center gap-2 border-b border-rule py-1.5 last:border-b-0">
                            <Checkbox checked={having > 0 && on === having} disabled={having === 0} className="min-w-0 flex-1 text-[0.8125rem]"
                                      onChange={event => draft.setBlock(stories, block.key, event.target.checked)}>
                                {block.label}{block.badge && <span className="sr-only"> badge</span>}
                            </Checkbox>
                            <span className={cn('caption shrink-0 tabular-nums', having === 0 && 'opacity-60')}>{having === 0 ? 'none' : `${on} of ${having}`}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
