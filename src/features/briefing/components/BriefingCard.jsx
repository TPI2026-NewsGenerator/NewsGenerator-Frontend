//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: BriefingCard.jsx
//  Description: One story of the briefing: why it was chosen, its summary, who tells it and how
//               many of them wrote it themselves
//

import {Fragment, useState} from "react";
import {FaRegThumbsDown, FaRegThumbsUp, FaThumbsDown, FaThumbsUp} from "react-icons/fa";
import {Button, IconButton} from "@/components/ui/button.jsx";
import {Notice} from "@/components/ui/text.jsx";
import {corroborationLabel} from "@/features/briefing/corroboration.js";
import {cn} from "@/lib/utils.js";

// Who the article credits for what it reports, read by the AI while it summarizes. It describes the
// article, never whether the news is true.
const SOURCING = {
    named: {label: 'named sources', title: 'The article names who it credits: a person, an institution, an official statement'},
    anonymous: {label: 'unnamed sources', title: 'The article relies on sources it does not name'},
    none: {label: 'no source given', title: 'The article credits nobody for what it reports'},
};

const SHOWN_ARTICLES = 4;

const paragraphsOf = (text) => text ? text.split(/\n\s*\n/) : [];

// Passages of an article, a gap between two of them: the sentences are the article's own, the AI only
// chose them (see server/services/utils/extract.js)
const Passages = ({paragraphs, lede, className}) => paragraphs.map((paragraph, i) => (
    <Fragment key={i}>
        {i > 0 && <p aria-hidden className="text-ink-mute">[…]</p>}
        <p className={cn(lede && i === 0 && 'lede', className)}>{paragraph}</p>
    </Fragment>
));

const when = (at) => new Date(at).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});

// a note of the outer column: its kicker and what it says
const Margin = ({kicker, tone, children}) => (
    <div>
        <p className={cn('kicker', tone === 'accent' && '!text-accent-ink')}>{kicker}</p>
        <div className="caption mt-1 max-w-[32ch] !text-ink">{children}</div>
    </div>
);

// onVote(vote): 'up', 'down', or null when the reader takes back the thumb given. The next briefings
// learn from it; without onVote no thumb is shown. number: its place in the briefing. lede: the first
// story of the page, whose passages open with the drop cap. item.summary: the key sentences of the
// article as published, a paragraph per passage; item.translation: their machine translation
export const BriefingCard = ({item, onVote, number, lede = false}) => {
    const [allArticles, setAllArticles] = useState(false);
    const corroboration = corroborationLabel(item.corroboration);
    const articles = allArticles ? item.articles : item.articles.slice(0, SHOWN_ARTICLES);
    const paragraphs = paragraphsOf(item.summary);
    const translation = paragraphsOf(item.translation);

    return (
        <article className="grid-12 border-t border-rule pt-7 pb-14">
            <div className="col-span-12 flex items-baseline gap-4 md:col-span-2 md:block">
                {number !== undefined && (
                    <p aria-hidden className="font-display text-[2.6rem] leading-none text-ink-mute md:text-[3.4rem]">
                        {String(number).padStart(2, '0')}
                    </p>
                )}
                <div className="md:mt-4">
                    {item.topic && <p className="kicker !text-ink">{item.topic}</p>}
                    {item.publishedAt && <p className="folio mt-1"><time dateTime={item.publishedAt}>{when(item.publishedAt)}</time></p>}
                </div>
            </div>

            <div className="col-span-12 mt-4 md:col-span-7 md:mt-0">
                <h2 className="story-head text-balance">{item.title}</h2>
                {item.why && <p className="standfirst mt-3 text-ink-mute italic">{item.why}</p>}

                {paragraphs.length > 0 ? (
                    <div className="mt-6">
                        <p className="kicker">In the article's words</p>
                        <div className="body-text mt-3"><Passages paragraphs={paragraphs} lede={lede}/></div>
                        <p className="caption mt-3">Sentences chosen by the AI, shown as the article published them.</p>
                    </div>
                ) : (
                    <div className="mt-6">
                        <Notice>{item.summaryError ?? 'No article of this story could be read (paywall or protected site).'}</Notice>
                    </div>
                )}

                {translation.length > 0 && (
                    <div className="mt-6 border-l border-rule pl-5">
                        <p className="kicker">Machine translation</p>
                        <div className="body-text mt-3 text-ink/85 italic"><Passages paragraphs={translation}/></div>
                        <p className="caption mt-3">Translated by the AI, it may contain errors: the original above is the reference.</p>
                    </div>
                )}

                <div className="mt-8">
                    <p className="kicker">Read it at</p>
                    <ul className="mt-2 border-t border-rule">
                        {articles.map(article => (
                            <li key={article.url} className="border-b border-rule">
                                <a href={article.url} target="_blank" rel="noreferrer"
                                   className="group flex items-baseline gap-3 py-2.5 no-underline">
                                    <span className="shrink-0 font-semibold">
                                        {article.source}
                                        {article.trusted && (
                                            <span className="ml-1 text-accent-ink" title="A source you trust" aria-label="a source you trust">★</span>
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1 text-ink-mute [overflow-wrap:anywhere] group-hover:text-ink">{article.title}</span>
                                    <span aria-hidden className="text-ink-mute group-hover:text-accent-ink">↗</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                    {item.articles.length > SHOWN_ARTICLES && (
                        <Button variant="link" size="sm" className="mt-3" onClick={() => setAllArticles(!allArticles)}>
                            {allArticles ? 'Show less' : `Show the ${item.articles.length} articles`}
                        </Button>
                    )}
                </div>
            </div>

            <aside className="col-span-12 mt-8 space-y-5 border-t border-rule pt-5 md:col-span-3 md:col-start-10 md:mt-1 md:border-t-0 md:border-l md:pt-0 md:pl-5">
                <Margin kicker="Who tells it">
                    <span title={item.corroboration.mediaNames?.join(', ')}>{corroboration.text}</span>
                </Margin>
                {item.sourcing && (
                    <Margin kicker="Its sources">
                        <span title={SOURCING[item.sourcing]?.title}>{SOURCING[item.sourcing]?.label ?? item.sourcing}</span>
                    </Margin>
                )}
                {item.hedged && (
                    <Margin kicker="Not confirmed" tone="accent">
                        <span title="The article says itself that this is not confirmed">unconfirmed: “{item.hedged}”</span>
                    </Margin>
                )}
                {onVote && (
                    <div>
                        <p className="kicker">For you?</p>
                        <div className="mt-1 flex items-center gap-1">
                            <IconButton label="Good for me" title="Good for me: more stories like this one"
                                        pressed={item.vote === 'up'} onClick={() => onVote(item.vote === 'up' ? null : 'up')}>
                                {item.vote === 'up' ? <FaThumbsUp/> : <FaRegThumbsUp/>}
                            </IconButton>
                            <IconButton label="Not for me" title="Not for me: fewer stories like this one"
                                        pressed={item.vote === 'down'} onClick={() => onVote(item.vote === 'down' ? null : 'down')}>
                                {item.vote === 'down' ? <FaThumbsDown/> : <FaRegThumbsDown/>}
                            </IconButton>
                        </div>
                    </div>
                )}
            </aside>
        </article>
    );
};
