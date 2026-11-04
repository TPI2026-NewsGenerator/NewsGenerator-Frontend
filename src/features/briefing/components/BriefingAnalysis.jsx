//
//  Author: Fabian Rostello
//  Date: 15.10.2026
//  File: BriefingAnalysis.jsx
//  Description: The AI analysis of the cards that merit one (see server/services/utils/card-analysis.js): a line
//               on top of the briefing says which stories have one, each of them shows it in a tab: why the
//               news matters, what may come next, and the earlier stories of its affair. It comes a minute or
//               more after the cards: said to be prepared until then
//

import {Fragment} from "react";
import {Working} from "@/components/ui/text.jsx";
import {hasAnalysisNote} from "@/features/briefing/analysis.js";

const number = (n) => String(n).padStart(2, '0');

// Which stories have an analysis, or that it is being written: in the panel of the toolbar (the user, 05.11.2026: a line over the cards
// took a band of the page). analysis: {status: 'running' | 'ready' | 'failed', picked: [{storyId, reason}], cards: {storyId: {why,
// next, timeline}}}, null for a briefing written before it (15.10.2026), see hasAnalysisNote. items: the cards, in their order;
// onPick: a link to a card was followed
export const AnalysisNote = ({analysis, items, onPick}) => {
    if (!hasAnalysisNote(analysis)) return null;
    const numbers = new Map(items.map((item, i) => [String(item.storyId), i + 1]));
    const stories = (storyIds) => storyIds.filter(storyId => numbers.has(String(storyId)))
        .sort((a, b) => numbers.get(String(a)) - numbers.get(String(b))).map(storyId => (
        <a key={storyId} href={`#card-${storyId}`} onClick={onPick} className="underline underline-offset-4 hover:text-ink">{number(numbers.get(String(storyId)))}</a>
    ));
    const list = (links) => links.map((link, i) => <Fragment key={i}>{i > 0 && ' · '}{link}</Fragment>);

    if (analysis.status === 'running') {
        const picked = stories((analysis.picked ?? []).map(entry => entry.storyId));
        return (
            <Working>
                {analysis.picked
                    ? picked.length > 0
                        ? <>The AI is writing an analysis of the stories that need one ({list(picked)}), about a minute each. Your stories are below already.</>
                        : <>No story of this briefing needs an analysis.</>
                    : <>The AI is choosing the stories that need an analysis. Your stories are below already.</>}
            </Working>
        );
    }
    if (analysis.status !== 'ready') return <p className="caption">The AI analysis could not be written for this briefing.</p>;
    const written = stories(Object.keys(analysis.cards));
    return written.length > 0
        ? <p className="caption">The AI wrote an analysis of the stories that need one, in their first tab: {list(written)}.</p>
        : <p className="caption">No story of this briefing needed an AI analysis.</p>;
};

const Part = ({title, children}) => (
    <div>
        <p className="kicker">{title}</p>
        {children}
    </div>
);

const when = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});

// The analysis of one card, the panel of its first tab, plain like the other tabs (no box of its own, the user, 05.11.2026).
// analysis: {why: ['...'], next: [{if, then}], timeline: [{date, title, titleTranslation, medium, url}]};
// pending: the card was picked, its analysis not written yet
export const CardAnalysis = ({id, analysis, pending, model}) => {
    if (pending) return <p className="caption">AI analysis being prepared…</p>;
    if (!analysis) return null;
    return (
        // one width for the whole panel: a max width in "ch" is the one of the font of each element, the note (12 px) stopped short of the lines (15 px)
        <div id={id} className="max-w-[40rem] space-y-6">
            {analysis.why.length > 0 && (
                <Part title="Why it matters">
                    <ul className="panel-text mt-2 list-disc space-y-2 pl-5 marker:text-ink-mute">
                        {analysis.why.map((line, i) => <li key={i}>{line}</li>)}
                    </ul>
                </Part>
            )}
            {analysis.next.length > 0 && (
                <Part title="What could come next">
                    <ul className="panel-text mt-2 list-disc space-y-2 pl-5 marker:text-ink-mute">
                        {analysis.next.map((line, i) => (
                            <li key={i}><span className="text-ink-mute">If</span> {line.if}, <span className="text-ink-mute">then</span> {line.then}</li>
                        ))}
                    </ul>
                </Part>
            )}
            {analysis.timeline?.length > 0 && (
                <Part title="The story so far">
                    <ol className="mt-2 list-none divide-y divide-rule p-0">
                        {analysis.timeline.map((item, i) => (
                            <li key={i} className="panel-text grid grid-cols-[4.5rem_1fr] items-baseline gap-x-3 py-1.5">
                                <time dateTime={item.date} className="caption">{when(item.date)}</time>
                                <span>
                                    {item.url
                                        ? <a href={item.url} target="_blank" rel="noreferrer" className="panel-link">{item.titleTranslation ?? item.title}</a>
                                        : item.titleTranslation ?? item.title}
                                    {item.medium && <span className="text-ink-mute"> · {item.medium}</span>}
                                </span>
                            </li>
                        ))}
                    </ol>
                </Part>
            )}
            <p className="footnote">
                Written by the AI ({(model ?? '').replace(/:.*$/, '')}) from the articles of this story and the earlier news of its
                affair, each line from what they say. It can get a fact wrong: the articles are the reference.
            </p>
        </div>
    );
};
