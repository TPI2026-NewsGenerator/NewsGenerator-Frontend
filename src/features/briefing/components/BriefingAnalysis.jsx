//
//  Author: Fabian Rostello
//  Date: 15.10.2026
//  File: BriefingAnalysis.jsx
//  Description: The analysis on top of a briefing, written by the AI from its cards only (see
//               server/services/utils/briefing-analysis.js): what changed, a line per story, and what could
//               happen next. It comes a few minutes after the cards: shown as being prepared until then
//

import {Fragment} from "react";
import {Working} from "@/components/ui/text.jsx";
import {spanOf} from "@/features/briefing/windows.js";

// the stories a line cites, by their number in the briefing, each one leading to its card
const Cited = ({storyIds, numbers}) => (
    <span className="folio ml-2 whitespace-nowrap">
        {storyIds.map((storyId, i) => (
            <Fragment key={storyId}>
                {i > 0 && ' · '}
                <a href={`#card-${storyId}`} className="underline underline-offset-4 hover:text-ink">{String(numbers.get(storyId)).padStart(2, '0')}</a>
            </Fragment>
        ))}
    </span>
);

const Part = ({title, children}) => (
    <div className="mt-6">
        <h3 className="font-display text-[1.35rem] leading-tight">{title}</h3>
        {children}
    </div>
);

// analysis: {status: 'running' | 'ready' | 'failed', model, changed: [{text, storyIds}], risks: [{if, then,
// storyIds}]}, null for a briefing written before it (15.10.2026). items: the cards, a line keeps the ones
// still in the briefing and is left out with none. hours: of news the briefing was written from
export const BriefingAnalysis = ({analysis, items, hours}) => {
    if (!analysis) return null;
    if (analysis.status === 'running') {
        return (
            <Working>
                The AI analysis is being prepared: what changed and what could happen next, in about three minutes.
                Your stories are below already.
            </Working>
        );
    }
    if (analysis.status !== 'ready') return <p className="caption">The AI analysis could not be written for this briefing.</p>;

    const numbers = new Map(items.map((item, i) => [item.storyId, i + 1]));
    const inBriefing = (lines) => lines.map(line => ({...line, storyIds: line.storyIds.filter(storyId => numbers.has(storyId))}))
        .filter(line => line.storyIds.length > 0);
    const changed = inBriefing(analysis.changed ?? []);
    const risks = inBriefing(analysis.risks ?? []);
    if (changed.length === 0 && risks.length === 0) return null;

    return (
        <section aria-labelledby="analysis-title" className="border-l-2 border-accent-ink/60 pl-5">
            <p id="analysis-title" className="kicker !text-accent-ink">AI analysis</p>
            {changed.length > 0 && (
                <Part title={`What changed · last ${spanOf(hours)}`}>
                    <ul className="body-text mt-3 list-disc space-y-2 pl-5 marker:text-ink-mute">
                        {changed.map((line, i) => <li key={i}>{line.text}<Cited storyIds={line.storyIds} numbers={numbers}/></li>)}
                    </ul>
                </Part>
            )}
            <Part title="What could break next">
                {risks.length > 0 ? (
                    <ul className="body-text mt-3 list-disc space-y-2 pl-5 marker:text-ink-mute">
                        {risks.map((risk, i) => (
                            <li key={i}><span className="font-semibold">If</span> {risk.if}, <span className="font-semibold">then</span> {risk.then}
                                <Cited storyIds={risk.storyIds} numbers={numbers}/></li>
                        ))}
                    </ul>
                ) : <p className="caption mt-2">No decision, deadline or threat in these stories says what could come next.</p>}
            </Part>
            <p className="caption mt-5">
                Written by the AI ({(analysis.model ?? '').replace(/:.*$/, '')}) from the stories below only, each line with the numbers of
                its stories. It can get a fact wrong: the stories are the reference.
            </p>
        </section>
    );
};
