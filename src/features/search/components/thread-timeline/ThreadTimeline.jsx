//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: ThreadTimeline.jsx
//  Description: The facts of one affair on a card of the search, in their order: the preview, the
//               result, the reactions. Each fact can be chosen for its key passages
//

import {useState} from "react";
import {Meta, MetaLine} from "@/components/ui/text.jsx";
import {Button} from "@/components/ui/button.jsx";
import {cn} from "@/lib/utils.js";
import {useTranslation} from "../../translation.js";
import {languageLabel} from "@/features/briefing/profileWords.js";

// past this many facts the affair is folded: the card is still read for its news first
const OPEN_UP_TO = 4;

const when = new Intl.DateTimeFormat('en', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
const dateOf = (fact) => fact.publishedAt ? when.format(new Date(fact.publishedAt)) : '';

const Fact = ({fact, lead, onSelect}) => {
    const [isChecked, setIsChecked] = useState(false);
    const media = fact.corroboration?.media ?? 1;
    // its title only, in the language searched
    const {ref, translation} = useTranslation(fact.url, fact.language, {withDescription: false});

    const toggle = () => {
        const nextChecked = !isChecked;
        if (onSelect(fact.url, nextChecked)) setIsChecked(nextChecked);
    };

    return (
        <li ref={ref} className="grid grid-cols-[1.5rem_1fr] gap-x-3 py-2.5">
            <div className="pt-1">
                {!lead && (
                    <input type="checkbox" checked={isChecked} onChange={toggle}
                           aria-label={`Select “${fact.title}” for its key passages`}
                           className="size-4 cursor-pointer accent-[var(--accent-ink)]"/>
                )}
            </div>
            <div>
                <MetaLine>
                    <Meta tone="ink"><time dateTime={fact.publishedAt}>{dateOf(fact)}</time></Meta>
                    <Meta>{fact.source}</Meta>
                    <Meta>{media === 1 ? 'Only one medium' : `Told by ${media} media`}</Meta>
                    {lead && <Meta tone="accent">this news</Meta>}
                    {!lead && !fact.found && <Meta title="Not in the results of your search, part of the same affair">also in the affair</Meta>}
                    {translation?.title && (
                        <Meta title="Machine translation: it may contain errors">translated from {languageLabel(translation.language)}</Meta>
                    )}
                </MetaLine>
                <a href={fact.url} target="_blank" rel="noreferrer"
                   className={cn('mt-1 block max-w-[62ch] leading-snug hover:underline', lead ? 'font-medium' : '')}>
                    {translation?.title ?? fact.title}
                </a>
                {translation?.title && <p lang={translation.language} className="caption mt-0.5 italic">“{fact.title}”</p>}
            </div>
        </li>
    );
};

// facts: the facts of the affair in time order, the card's own among them (leadUrl)
export const ThreadTimeline = ({facts, leadUrl, onSelect}) => {
    const [open, setOpen] = useState(facts.length <= OPEN_UP_TO);
    if (facts.length < 2) return null;

    const first = dateOf(facts[0]);
    const last = dateOf(facts[facts.length - 1]);

    return (
        <section className="mt-5 max-w-[70ch] border-l border-ink/40 pl-4" aria-label="The affair">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <p className="kicker">The affair · {facts.length} facts, {first} to {last}</p>
                <Button variant="link" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
                    {open ? 'Fold' : 'Follow it'}
                </Button>
            </div>
            {open && (
                <ol className="mt-1 list-none divide-y divide-rule p-0">
                    {facts.map(fact => <Fact key={fact.url} fact={fact} lead={fact.url === leadUrl} onSelect={onSelect}/>)}
                </ol>
            )}
        </section>
    );
};
