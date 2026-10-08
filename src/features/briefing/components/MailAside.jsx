//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: MailAside.jsx
//  Description: What a story tells beside its key points in the e-mail of the briefing, who denies it
//               ("Contested") and its other angles, each kept or taken out by the reader before sending
//

import {Checkbox} from "@/components/ui/field.jsx";

// the places of the ones taken out, in the order of the card
const toggled = (list, index, kept) => kept ? list.filter(other => other !== index) : [...list, index].sort((a, b) => a - b);

// story: {storyId, title, contested: [{by, sentence, translation, source}], angles: [{title, source}]}
// (the title translated); removed: {contested: [index], angles: [index]}, the ones taken out;
// onChange(removed)
export const MailAside = ({story, removed = {}, onChange}) => {
    const contested = story.contested ?? [];
    const angles = story.angles ?? [];
    if (contested.length === 0 && angles.length === 0) return null;
    const out = (part) => removed[part] ?? [];
    const change = (part, index, kept) => onChange({...removed, [part]: toggled(out(part), index, kept)});

    return (
        <div role="group" aria-label={`What “${story.title}” tells beside it in the e-mail`} className="mt-2 border border-rule p-3">
            <p className="caption">Untick what the e-mail leaves out. A part with nothing left goes out with its title.</p>
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
        </div>
    );
};
