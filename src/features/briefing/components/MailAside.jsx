//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: MailAside.jsx
//  Description: The lines of what a story tells beside its key points in the e-mail: its AI analysis, who denies it ("Contested"),
//               its other angles, its official sources and the names of who it is about, each line kept or taken out by the reader
//               before sending. Each list is the body of its block in the editor (see MailInspector)
//

import {Checkbox} from "@/components/ui/field.jsx";

// the places of the ones taken out, in the order of the card
const toggled = (list, index, kept) => kept ? list.filter(other => other !== index) : [...list, index].sort((a, b) => a - b);

// the lines of the AI analysis of a story, by part (see BriefingAnalysis.jsx)
const ANALYSIS_PARTS = ['why', 'next', 'timeline'];
const every = (list) => list.map((line, index) => index);

// removed: {contested: [index], angles: [index], official: [index], names: [index], why: [index], next: [index], timeline: [index]}, the
// places taken out; onChange(removed)
const useLines = (removed, onChange) => {
    const out = (part) => removed[part] ?? [];
    return {out, change: (part, index, kept) => onChange({...removed, [part]: toggled(out(part), index, kept)})};
};

// story.analysis: {why: ['...'], next: [{if, then}], timeline: [{date, title, titleTranslation, medium}]}
export const AnalysisLines = ({story, removed = {}, onChange}) => {
    const analysis = story.analysis ?? null;
    const {out, change} = useLines(removed, onChange);
    // the whole analysis left out, or put back
    const left = ANALYSIS_PARTS.reduce((n, part) => n + (analysis?.[part]?.length ?? 0) - out(part).length, 0);
    const whole = (kept) => onChange({...removed, ...Object.fromEntries(ANALYSIS_PARTS.map(part => [part, kept ? [] : every(analysis?.[part] ?? [])]))});
    if (!analysis) return null;

    return (
        <div role="group" aria-label={`The lines of the analysis of “${story.title}”`}>
            <button type="button" onClick={() => whole(left === 0)} className="caption cursor-pointer underline underline-offset-4 hover:text-ink">
                {left === 0 ? 'Put the whole analysis back' : 'Leave the whole analysis out'}
            </button>
            <div className="flex flex-col">
                {(analysis.why ?? []).map((line, index) => (
                    <Checkbox key={`why-${index}`} checked={!out('why').includes(index)} onChange={event => change('why', index, event.target.checked)}>
                        <span className="text-[0.8125rem]">{line}</span>
                        <span className="caption block">Why it matters</span>
                    </Checkbox>
                ))}
                {(analysis.next ?? []).map((line, index) => (
                    <Checkbox key={`next-${index}`} checked={!out('next').includes(index)} onChange={event => change('next', index, event.target.checked)}>
                        <span className="text-[0.8125rem]"><span className="text-ink-mute">If</span> {line.if}, <span className="text-ink-mute">then</span> {line.then}</span>
                        <span className="caption block">What could come next</span>
                    </Checkbox>
                ))}
                {(analysis.timeline ?? []).map((item, index) => (
                    <Checkbox key={`timeline-${index}`} checked={!out('timeline').includes(index)} onChange={event => change('timeline', index, event.target.checked)}>
                        <span className="text-[0.8125rem]">{item.titleTranslation ?? item.title}</span>
                        <span className="caption block">The story so far · {item.date}{item.medium ? ` · ${item.medium}` : ''}</span>
                    </Checkbox>
                ))}
            </div>
        </div>
    );
};

export const ContestedLines = ({story, removed = {}, onChange}) => {
    const {out, change} = useLines(removed, onChange);
    return (
        <div role="group" aria-label={`The denials of “${story.title}”`} className="flex flex-col">
            {(story.contested ?? []).map((denial, index) => (
                <Checkbox key={index} checked={!out('contested').includes(index)} onChange={event => change('contested', index, event.target.checked)}>
                    <span className="text-[0.8125rem]">{denial.by} denies: “{denial.translation || denial.sentence}”</span>
                    <span className="caption block">— {denial.source}</span>
                </Checkbox>
            ))}
        </div>
    );
};

export const OfficialLines = ({story, removed = {}, onChange}) => {
    const {out, change} = useLines(removed, onChange);
    return (
        <div role="group" aria-label={`The official sources of “${story.title}”`} className="flex flex-col">
            {(story.official ?? []).map((post, index) => (
                <Checkbox key={index} checked={!out('official').includes(index)} onChange={event => change('official', index, event.target.checked)}>
                    <span className="text-[0.8125rem]">{post.party} said it: {post.title}</span>
                </Checkbox>
            ))}
        </div>
    );
};

// story.names: ['FIFA', 'UEFA'], the names of who it is about, in the order of the card (the places of removed.names)
export const NameLines = ({story, removed = {}, onChange}) => {
    const {out, change} = useLines(removed, onChange);
    if ((story.names ?? []).length === 0) return null;
    return (
        <div role="group" aria-label={`The names of “${story.title}”`} className="flex flex-col">
            {(story.names ?? []).map((name, index) => (
                <Checkbox key={index} checked={!out('names').includes(index)} onChange={event => change('names', index, event.target.checked)}>
                    <span className="text-[0.8125rem]">{name}</span>
                </Checkbox>
            ))}
        </div>
    );
};

export const AngleLines = ({story, removed = {}, onChange}) => {
    const {out, change} = useLines(removed, onChange);
    return (
        <div role="group" aria-label={`The other angles of “${story.title}”`} className="flex flex-col">
            {(story.angles ?? []).map((angle, index) => (
                <Checkbox key={index} checked={!out('angles').includes(index)} onChange={event => change('angles', index, event.target.checked)}>
                    <span className="text-[0.8125rem]">{angle.title}</span>
                    <span className="caption block">{angle.source}</span>
                </Checkbox>
            ))}
        </div>
    );
};
