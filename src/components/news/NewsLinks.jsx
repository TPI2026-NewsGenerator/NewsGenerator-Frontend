//
//  Author: Fabian Rostello
//  Date: 02.10.2026
//  File: NewsLinks.jsx
//  Description: Where to read a news, the same on the cards of the briefing and of the search: the
//               article the card shows, then the other media that cover it. The card of the briefing puts the first
//               right under its sentences and the second at its very bottom (the user, 06.11.2026)
//

import {useState} from "react";
import {cn} from "@/lib/utils.js";
import {LanguageMark} from "@/components/news/LanguageMark.jsx";

const SHOWN_OTHERS = 8;

const Trusted = ({article}) => article.trusted
    ? <span className="ml-0.5 text-accent-ink" title="A source you trust" aria-label="a source you trust">★</span>
    : null;

// lead: {url, source, trusted, language} the article of the card (its title, its passages); others:
// [{url, source, title, trusted, language}] the other articles of the news, each medium once and never the one of lead. limit: how many
// are named (8 by default); onMore: what "and N more" does instead of naming them all (the card opens its coverage). show: 'both'
// (by default), 'article' (the link to the article only) or 'others' (the media that cover it only)
export const NewsLinks = ({lead, others = [], className, limit = SHOWN_OTHERS, onMore = null, show = 'both'}) => {
    const [all, setAll] = useState(false);
    const seen = new Set([lead.source]);
    const media = others.filter(other => !seen.has(other.source) && seen.add(other.source));
    const shown = all && !onMore ? media : media.slice(0, limit);
    if (show === 'others' && media.length === 0) return null;

    return (
        <div className={cn('mt-4 space-y-2', className)}>
            {show !== 'others' && (
                <a href={lead.url} target="_blank" rel="noreferrer" className="link inline-block text-[0.9375rem]">
                    Read the article at {lead.source}<Trusted article={lead}/><LanguageMark code={lead.language}/>
                </a>
            )}
            {show !== 'article' && media.length > 0 && (
                <p className="caption max-w-[66ch]">
                    Also covered by{' '}
                    {shown.map((other, index) => (
                        <span key={other.url}>
                            {index > 0 && ', '}
                            <a href={other.url} target="_blank" rel="noreferrer" title={other.title} className="medium-link">{other.source}</a>
                            <Trusted article={other}/><LanguageMark code={other.language}/>
                        </span>
                    ))}
                    {media.length > limit && (
                        <>
                            {' '}
                            <button type="button" onClick={() => onMore ? onMore() : setAll(!all)}
                                    className="cursor-pointer underline underline-offset-4 hover:text-ink">
                                {all && !onMore ? 'show less' : `and ${media.length - limit} more`}
                            </button>
                        </>
                    )}
                </p>
            )}
        </div>
    );
};
