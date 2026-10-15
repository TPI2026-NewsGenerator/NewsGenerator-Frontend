//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: MailAside.jsx
//  Description: What a story tells beside its key points in the e-mail of the briefing, its AI analysis, who
//               denies it ("Contested"), its other angles and its official sources, each line kept or taken
//               out by the reader before sending
//

import {Checkbox} from "@/components/ui/field.jsx";

// the places of the ones taken out, in the order of the card
const toggled = (list, index, kept) => kept ? list.filter(other => other !== index) : [...list, index].sort((a, b) => a - b);

// the lines of the AI analysis of a story, by part (see BriefingAnalysis.jsx)
const ANALYSIS_PARTS = ['why', 'next', 'timeline'];
const every = (list) => list.map((line, index) => index);

// story: {storyId, title, analysis: {why: ['...'], next: [{if, then}], timeline: [{date, title,
// titleTranslation, medium}]} | null, contested: [{by, sentence, translation, source}], angles: [{title,
// source}], official: [{party, title}]} (the title translated); removed: {contested: [index], angles:
// [index], official: [index], why: [index], next: [index], timeline: [index]}, the ones taken out;
// onChange(removed)
export const MailAside = ({story, removed = {}, onChange}) => {
    const contested = story.contested ?? [];
    const angles = story.angles ?? [];
    const official = story.official ?? [];
    const analysis = story.analysis ?? null;
    const lines = analysis ? ANALYSIS_PARTS.reduce((n, part) => n + (analysis[part]?.length ?? 0), 0) : 0;
    if (contested.length === 0 && angles.length === 0 && official.length === 0 && lines === 0) return null;
    const out = (part) => removed[part] ?? [];
    const change = (part, index, kept) => onChange({...removed, [part]: toggled(out(part), index, kept)});
    // the whole analysis left out, or put back
    const analysisLeft = ANALYSIS_PARTS.reduce((n, part) => n + (analysis?.[part]?.length ?? 0) - out(part).length, 0);
    const wholeAnalysis = (kept) => onChange({...removed, ...Object.fromEntries(ANALYSIS_PARTS.map(part => [part, kept ? [] : every(analysis?.[part] ?? [])]))});

    return (
        <div role="group" aria-label={`What “${story.title}” tells beside it in the e-mail`} className="mt-2 border border-rule p-3">
            <p className="caption">Untick what the e-mail leaves out. A part with nothing left goes out with its title.</p>
            {lines > 0 && (
                <fieldset className="mt-2 min-w-0 border-0 p-0">
                    <legend className="kicker !text-accent-ink">AI analysis</legend>
                    <button type="button" onClick={() => wholeAnalysis(analysisLeft === 0)}
                            className="caption cursor-pointer underline underline-offset-4 hover:text-ink">
                        {analysisLeft === 0 ? 'Put the whole analysis back' : 'Leave the whole analysis out'}
                    </button>
                    <div className="flex flex-col">
                        {(analysis.why ?? []).map((line, index) => (
                            <Checkbox key={`why-${index}`} checked={!out('why').includes(index)}
                                      onChange={event => change('why', index, event.target.checked)}>
                                <span className="text-[0.9375rem]">{line}</span>
                                <span className="caption block">Why it matters</span>
                            </Checkbox>
                        ))}
                        {(analysis.next ?? []).map((line, index) => (
                            <Checkbox key={`next-${index}`} checked={!out('next').includes(index)}
                                      onChange={event => change('next', index, event.target.checked)}>
                                <span className="text-[0.9375rem]"><b>If</b> {line.if}, <b>then</b> {line.then}</span>
                                <span className="caption block">What could come next</span>
                            </Checkbox>
                        ))}
                        {(analysis.timeline ?? []).map((item, index) => (
                            <Checkbox key={`timeline-${index}`} checked={!out('timeline').includes(index)}
                                      onChange={event => change('timeline', index, event.target.checked)}>
                                <span className="text-[0.9375rem]">{item.titleTranslation ?? item.title}</span>
                                <span className="caption block">The story so far · {item.date}{item.medium ? ` · ${item.medium}` : ''}</span>
                            </Checkbox>
                        ))}
                    </div>
                </fieldset>
            )}
            {contested.length > 0 && (
                <fieldset className="mt-2 min-w-0 border-0 p-0">
                    <legend className="kicker !text-accent-ink">Contested</legend>
                    <div className="flex flex-col">
                        {contested.map((denial, index) => (
                            <Checkbox key={index} checked={!out('contested').includes(index)}
                                      onChange={event => change('contested', index, event.target.checked)}>
                                <span className="text-[0.9375rem]"><b>{denial.by} denies:</b> “{denial.translation || denial.sentence}”</span>
                                <span className="caption block">— {denial.source}</span>
                            </Checkbox>
                        ))}
                    </div>
                </fieldset>
            )}
            {angles.length > 0 && (
                <fieldset className="mt-2 min-w-0 border-0 p-0">
                    <legend className="kicker">Same affair, other angles</legend>
                    <div className="flex flex-col">
                        {angles.map((angle, index) => (
                            <Checkbox key={index} checked={!out('angles').includes(index)}
                                      onChange={event => change('angles', index, event.target.checked)}>
                                <span className="text-[0.9375rem]">{angle.title}</span>
                                <span className="caption block">{angle.source}</span>
                            </Checkbox>
                        ))}
                    </div>
                </fieldset>
            )}
            {official.length > 0 && (
                <fieldset className="mt-2 min-w-0 border-0 p-0">
                    <legend className="kicker">Official source</legend>
                    <div className="flex flex-col">
                        {official.map((post, index) => (
                            <Checkbox key={index} checked={!out('official').includes(index)}
                                      onChange={event => change('official', index, event.target.checked)}>
                                <span className="text-[0.9375rem]"><b>{post.party}</b> said it: {post.title}</span>
                            </Checkbox>
                        ))}
                    </div>
                </fieldset>
            )}
        </div>
    );
};
