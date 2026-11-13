//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: AiSummary.jsx
//  Description: The summary an AI writes of a sheet, ONLY when a reader asks ("Summarise with the AI": it takes 5 to 20 seconds, 5 an hour at most). It is labelled as
//               what it is, "Written by the AI from the facts below: it can be wrong", with who asked and when; its claims are a short list, each followed by numbered chips
//               that go to the fact it rests on (the facts are the sentences of the news word for word, with their link, and the positions the code read). A summary written
//               before the sheet changed says so and the button turns into "Write it again"; while it is current the button says when it was written and is off (asking
//               again would change nothing). Another reader can see the summary someone else asked for
//

import {useId} from "react";
import {ExternalLink, Sparkles} from "lucide-react";
import {Button} from "@/components/ui/button.jsx";

const dateOf = (at) => at ? new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '';

// aiSummary: the summary the sheet carries or null; available: the AI summary can be asked (something to summarise, and it is not switched off);
// request: what useAiSummaryRequest answers ({busy, error, write}); the sheet owns it (see useAiSummaryRequest.js)
export const AiSummary = ({aiSummary, available, request}) => {
    const id = useId();
    const {busy, error, write} = request;

    // the number of a fact, the way a claim cites it
    const numberOf = (fact) => aiSummary.facts.findIndex(one => one.id === fact) + 1;
    const goTo = (fact) => {
        const target = document.getElementById(`${id}-fact-${fact}`);
        if (!target) return;
        target.scrollIntoView?.({block: 'center', behavior: 'smooth'});
        target.focus({preventScroll: true});
    };

    // nothing to summarise (or the AI summary is switched off) and no summary written: the sheet says nothing of it
    if (!available && !aiSummary) return null;
    const current = aiSummary?.current === true;
    return (
        <section aria-labelledby={`${id}-title`} className="mt-8">
            <h3 id={`${id}-title`} className="section-title">AI summary</h3>

            {available && (
                <div className="mt-2.5 flex flex-wrap items-center gap-3">
                    {aiSummary && current
                        ? <Button size="sm" disabled>Written {dateOf(aiSummary.generated_at)}</Button>
                        : (
                            <Button variant={aiSummary ? 'quiet' : 'primary'} size="sm" loading={busy} onClick={write}>
                                {!busy && <Sparkles aria-hidden className="size-4"/>}
                                {aiSummary ? 'Write it again' : 'Summarise with the AI'}
                            </Button>
                        )}
                    {busy && <p role="status" className="caption">The AI is writing the summary: it takes 5 to 20 seconds.</p>}
                </div>
            )}
            {error && <p role="alert" className="caption mt-2 !text-accent-ink">{error}</p>}

            {aiSummary && (
                <div className="mt-4 rounded-2xl border border-dashed border-ink-mute/60 p-5">
                    <p className="text-[0.875rem] font-medium">Written by the AI from the facts below: it can be wrong</p>
                    <p className="caption mt-0.5">by {aiSummary.by}, {dateOf(aiSummary.generated_at)}</p>
                    {!current && (
                        <p role="status" className="mt-3 rounded-xl border border-accent-ink/30 bg-accent-ink/10 px-3 py-2 text-[0.875rem] text-accent-ink">
                            The sheet has changed since this summary was written.
                        </p>
                    )}
                    <ul aria-label="Claims" className="mt-3 space-y-2.5">
                        {aiSummary.claims.map((claim, i) => (
                            <li key={i} className="text-[0.9375rem] leading-snug">
                                {claim.text}
                                {' '}
                                {claim.facts.map(fact => numberOf(fact) > 0 && (
                                    <button key={fact} type="button" aria-label={`Fact ${numberOf(fact)}`} onClick={() => goTo(fact)}
                                            className="mr-1 inline-flex cursor-pointer items-center rounded-full bg-paper-deep px-2 text-[0.75rem] text-action-text tabular-nums hover:underline underline-offset-4">
                                        [{numberOf(fact)}]
                                    </button>
                                ))}
                            </li>
                        ))}
                    </ul>
                    <p className="kicker mt-5">Facts</p>
                    <ol aria-label="Facts" className="mt-1.5 space-y-2 text-[0.875rem]">
                        {aiSummary.facts.map((fact, i) => (
                            <li key={fact.id} id={`${id}-fact-${fact.id}`} tabIndex={-1} className="scroll-mt-24 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-action/40">
                                <span className="mr-1.5 tabular-nums text-ink-mute">[{i + 1}]</span>
                                {fact.kind === 'sentence' ? <span className="panel-text">“{fact.text}”</span> : <span>{fact.text}</span>}
                                {fact.url && (
                                    <>
                                        {' '}
                                        <a href={fact.url} target="_blank" rel="noopener noreferrer" className="medium-link inline-flex items-center gap-1">{fact.medium ?? fact.url}<ExternalLink aria-hidden className="size-3"/></a>
                                    </>
                                )}
                                {fact.date && <span className="caption"> · {dateOf(fact.date)}</span>}
                            </li>
                        ))}
                    </ol>
                    <p className="caption mt-4">Model: {aiSummary.model}.</p>
                </div>
            )}
        </section>
    );
};
