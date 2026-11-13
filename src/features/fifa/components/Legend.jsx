//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: Legend.jsx
//  Description: What the colours of the map mean, derived from what the server sends: the candidates (one colour each, a strong and a light
//               one only when the server stands behind both a declared and a probable level), a candidate chosen shows the scale from yes
//               to no with the levels enabled; always the grey of unknown, the hatch of conflicting
//               indications and the dotted ring of Uncertain. An entry for each way of drawing a position: Declared is solid, Probable is
//               dots, and there is no entry of Probable when the levels hold no probable level
//

import {HATCH, candidateFill, dotsFill, hasOpposition, labelOf, mapFill, patternKeyOf, scaleOf, sideOf, strengthOf} from "@/features/fifa/positions.js";
import {Swatch} from "@/features/fifa/components/Swatch.jsx";

const Item = ({fill, ring, children}) => (
    <li className="inline-flex items-center gap-2 text-[0.8125rem] text-ink">
        <Swatch fill={fill} ring={ring}/>
        <span>{children}</span>
    </li>
);

// votes: {count, against}: the positions a reader set in this view, and whether one of them is an opposition
export const Legend = ({scope, subjects, levels, votes = {count: 0, against: false}}) => {
    // a way of drawing is in the legend when the server has the level for it
    const declared = levels.some(level => level.endsWith('_declare'));
    const probable = levels.some(level => level.endsWith('_probable'));
    const chosen = scope.mode === 'candidate' ? subjects.find(subject => subject.qid === scope.subject) : null;

    let body;
    if (chosen) {
        body = scaleOf(levels).map(level => {
            return <Item key={level} fill={mapFill(sideOf(level), chosen.color_index, strengthOf(level))}>{labelOf(level)}</Item>;
        });
        // a vote can oppose a candidate when the server reads no opposition: the scale says so
        if (votes.against && !hasOpposition(levels)) body.push(<Item key="voted-against" fill={mapFill('no', 1, 'strong')}>Opposition (set by a reader)</Item>);
    } else {
        body = (
            <>
                {subjects.map(subject => (
                    <li key={subject.qid} className="inline-flex items-center gap-2 text-[0.8125rem] text-ink">
                        <Swatch fill={candidateFill(subject.color_index)}/>
                        {probable && <Swatch fill={dotsFill(patternKeyOf('yes', subject.color_index))} className="-ml-1.5"/>}
                        <span>
                            {subject.name}
                            {subject.status === 'withdrawn' && <span className="text-ink-mute"> (withdrawn)</span>}
                        </span>
                    </li>
                ))}
                {declared && <Item fill="var(--ink-mute)">Declared: solid</Item>}
                {probable && <Item fill={dotsFill('neutral')}>Probable: dots</Item>}
                <Item fill={HATCH}>Conflicting indications</Item>
            </>
        );
    }

    return (
        <div className="mt-4">
            <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {body}
                <Item fill="var(--map-unknown)" ring>Uncertain: signals, no position</Item>
                <Item fill="var(--map-unknown)">Unknown</Item>
            </ul>
            <p className="caption mt-2 max-w-[80ch]">
                {scope.mode === 'candidate' && !hasOpposition(levels) && 'Opposition is not read from the news reliably yet: it shows only where a reader set it.'}
                {scope.mode === 'all' && `The overview shows support only: opposition to one candidate is never given to another.${probable ? ' Solid colour: declared, or confirmed by a reader. Dots: read from the news, not confirmed by a reader.' : ''} Faded: older than 90 days.`}
            </p>
            {votes.count > 0 && (
                <p className="caption mt-1 max-w-[80ch]">
                    {votes.count} {votes.count === 1 ? 'position was' : 'positions were'} set by a reader: the last vote of any reader decides, in the same colour as a position read from the news. The reading of the news stays in the sheet.
                </p>
            )}
        </div>
    );
};
