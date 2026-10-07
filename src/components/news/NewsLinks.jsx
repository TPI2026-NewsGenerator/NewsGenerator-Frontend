//
//  Author: Fabian Rostello
//  Date: 02.10.2026
//  File: NewsLinks.jsx
//  Description: Where to read a news, the same on the cards of the briefing and of the search: the
//               article the card shows, then the other media that cover it
//

import {useState} from "react";
import {cn} from "@/lib/utils.js";
import {LanguageMark} from "@/components/news/LanguageMark.jsx";

const SHOWN_OTHERS = 8;

const Trusted = ({article}) => article.trusted
    ? <span className="ml-0.5 text-accent-ink" title="A source you trust" aria-label="a source you trust">★</span>
    : null;

// lead: {url, source, trusted, language} the article of the card (its title, its passages); others:
// [{url, source, title, trusted, language}] the other articles of the news, each medium once and never the one of lead
export const NewsLinks = ({lead, others = [], className}) => {
    const [all, setAll] = useState(false);
    const seen = new Set([lead.source]);
    const media = others.filter(other => !seen.has(other.source) && seen.add(other.source));
    const shown = all ? media : media.slice(0, SHOWN_OTHERS);

    return (
        <div className={cn('mt-4 space-y-2', className)}>
            <a href={lead.url} target="_blank" rel="noreferrer" className="link inline-block text-[0.9375rem]">
                Read the article at {lead.source}<Trusted article={lead}/><LanguageMark code={lead.language}/> ↗
            </a>
            {media.length > 0 && (
                <p className="caption max-w-[66ch]">
                    Also covered by{' '}
                    {shown.map((other, index) => (
                        <span key={other.url}>
                            {index > 0 && ', '}
                            <a href={other.url} target="_blank" rel="noreferrer" title={other.title}
                               className="underline decoration-rule underline-offset-4 hover:text-ink">{other.source}</a>
                            <Trusted article={other}/><LanguageMark code={other.language}/>
                        </span>
                    ))}
                    {media.length > SHOWN_OTHERS && (
                        <>
                            {' '}
                            <button type="button" onClick={() => setAll(!all)}
                                    className="cursor-pointer underline underline-offset-4 hover:text-ink">
                                {all ? 'show less' : `and ${media.length - SHOWN_OTHERS} more`}
                            </button>
                        </>
                    )}
                </p>
            )}
        </div>
    );
};
