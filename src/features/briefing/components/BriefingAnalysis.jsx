//
//  Author: Fabian Rostello
//  Date: 15.10.2026
//  File: BriefingAnalysis.jsx
//  Description: The AI analysis of the cards that merit one (see server/services/utils/card-analysis.js): a line
//               on top of the briefing says which stories have one, each of them shows it on demand: why the
//               news matters, what may come next, and the earlier stories of its affair. It comes a minute or
//               more after the cards: said to be prepared until then
//

import {Fragment, useState} from "react";
import {Working} from "@/components/ui/text.jsx";

const number = (n) => String(n).padStart(2, '0');

// analysis: {status: 'running' | 'ready' | 'failed', picked: [{storyId, reason}], cards: {storyId: {why,
// next, timeline}}}, null for a briefing written before it (15.10.2026); one of the first days, of
// another shape (changed, risks), is left aside. items: the cards, in their order
export const AnalysisNote = ({analysis, items}) => {
    if (!analysis || (analysis.status === 'ready' && !analysis.cards)) return null;
    const numbers = new Map(items.map((item, i) => [String(item.storyId), i + 1]));
    const stories = (storyIds) => storyIds.filter(storyId => numbers.has(String(storyId)))
        .sort((a, b) => numbers.get(String(a)) - numbers.get(String(b))).map(storyId => (
        <a key={storyId} href={`#card-${storyId}`} className="underline underline-offset-4 hover:text-ink">{number(numbers.get(String(storyId)))}</a>
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
        ? <p className="caption">AI analysis of the stories that need one: {list(written)}, under their passages.</p>
        : <p className="caption">No story of this briefing needed an AI analysis.</p>;
};

const Part = ({title, children}) => (
    <div className="mt-4">
        <p className="kicker">{title}</p>
        {children}
    </div>
);

const when = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});

// The analysis of one card, opened by the reader. analysis: {why: ['...'], next: [{if, then}], timeline:
// [{date, title, titleTranslation, medium, url}]}; pending: the card was picked, its analysis not written yet
export const CardAnalysis = ({id, analysis, pending, model}) => {
    const [open, setOpen] = useState(false);
    if (pending) return <p className="caption mt-4 italic">AI analysis being prepared…</p>;
    if (!analysis) return null;
    return (
        <>
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id}
                    className="caption mt-4 cursor-pointer font-semibold tracking-[0.06em] text-accent-ink [font-variant-caps:all-small-caps] underline underline-offset-4 hover:text-ink">
                {open ? 'Hide the AI analysis' : 'Show the AI analysis'}
            </button>
            {open && (
                <div id={id} className="mt-3 border-l-2 border-accent-ink/60 pl-5">
                    {analysis.why.length > 0 && (
                        <Part title="Why it matters">
                            <ul className="body-text mt-2 list-disc space-y-2 pl-5 marker:text-ink-mute">
                                {analysis.why.map((line, i) => <li key={i}>{line}</li>)}
                            </ul>
                        </Part>
                    )}
                    {analysis.next.length > 0 && (
                        <Part title="What could come next">
                            <ul className="body-text mt-2 list-disc space-y-2 pl-5 marker:text-ink-mute">
                                {analysis.next.map((line, i) => (
                                    <li key={i}><span className="font-semibold">If</span> {line.if}, <span className="font-semibold">then</span> {line.then}</li>
                                ))}
                            </ul>
                        </Part>
                    )}
                    {analysis.timeline?.length > 0 && (
                        <Part title="The story so far">
                            <ol className="mt-2 space-y-1.5">
                                {analysis.timeline.map((item, i) => (
                                    <li key={i} className="caption !text-ink">
                                        <span className="folio mr-2">{when(item.date)}</span>
                                        {item.url
                                            ? <a href={item.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">{item.titleTranslation ?? item.title}</a>
                                            : item.titleTranslation ?? item.title}
                                        {item.medium && <span className="text-ink-mute"> · {item.medium}</span>}
                                    </li>
                                ))}
                            </ol>
                        </Part>
                    )}
                    <p className="caption mt-4">
                        Written by the AI ({(model ?? '').replace(/:.*$/, '')}) from the articles of this story and the earlier news of its
                        affair, each line from what they say. It can get a fact wrong: the articles are the reference.
                    </p>
                </div>
            )}
        </>
    );
};
