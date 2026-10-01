//
//  Author: Fabian Rostello
//  Date: 19.05.2026
//  File: Article.jsx
//  Description: Article component used in Search Page
//

import {memo, useState} from "react";
import {Meta, MetaLine} from "@/components/ui/text.jsx";
import {cn} from "@/lib/utils.js";
import {ThreadTimeline} from "../thread-timeline/ThreadTimeline.jsx";
import {useTranslation} from "../../translation.js";
import {languageLabel} from "@/features/briefing/profileWords.js";

// Past this many articles, a group has stopped being one news.
//
// This used to be five, when the server grouped on single links and a card could hold thirty
// articles chained from a court filing to the late-night jokes about it. The server now asks an
// article to resemble a whole group and not one of its members, and those chains are gone:
// measured over 522 cards in five searches, the largest true group holds eight articles — the
// eight papers on the diesel export ban, the seven on Burnham's first meeting with Trump — and
// nothing between nine and eleven exists at all. So the bar sits above them, at ten.
//
// It is a safety net rather than a common case: no group reaches it today. It stays because a
// group that large is not something to describe as one news on the word of one measurement.
const RUNNING_STORY = 10;

const articleTime = (at) => {
    const minDiff = Math.floor((Date.now() - new Date(at)) / (1000 * 60));
    const hourDiff = Math.floor(minDiff / 60);
    const rtf = new Intl.RelativeTimeFormat('en', {numeric: 'auto'});

    if (minDiff < 60) return rtf.format(-minDiff, 'minute');
    if (hourDiff < 24) return rtf.format(-hourDiff, 'hour');
    return rtf.format(-Math.floor(hourDiff / 24), 'day');
};

// How many media carry this news, and how many of them wrote their own headline. Twenty media
// repeating one wire is one report seen twenty times; twenty that wrote their own each went and
// checked. Neither says the news is true, so nothing here is called reliable.
const coverageOf = (news) => {
    const {media, wordings} = news?.corroboration ?? {};
    if (!media) return null;

    if (media === 1) {
        return {label: 'this source only', title: 'No other medium of your sources carries this news'};
    }
    // identical texts are one wire whatever the size of the group, and that is worth saying
    if (wordings === 1) {
        return {
            label: `${media} media, same wording`,
            title: 'They publish the same text, most likely one wire republished: one report, not several',
        };
    }
    if ((news?.sources?.length ?? 0) + 1 >= RUNNING_STORY) {
        return {
            label: `${media} media on this story`,
            title: 'Too many articles here to be a single news: this is a running story, followed from '
                + 'several angles. Read the count as the media on the story, not as a news confirmed '
                + media + ' times.',
        };
    }
    return {
        label: `${media} media, ${wordings} wordings`,
        title: `${wordings} of them wrote their own headline about it`,
        tone: 'ink',
    };
};

// a click on the row selects it for its key passages, except on its links and in the facts of its
// affair, each chosen on its own
export const Article = memo(({id, onSelect, news}) => {
    const [isChecked, setIsChecked] = useState(false);

    // the same news can be in two feeds of the same media, show each source once
    const otherSources = [...new Map((news?.sources ?? []).map(other => [other.source, other])).values()];
    const coverage = coverageOf(news);
    // a news in another language than the one searched, translated when the reader reaches it
    const {ref, translation, original, toggle: toggleOriginal} = useTranslation(news?.url, news?.language);
    const translated = Boolean(translation) && !original;

    const toggle = () => {
        const nextChecked = !isChecked;
        const accepted = onSelect(id, nextChecked);
        if (accepted) setIsChecked(nextChecked);
    };

    const handleRowClick = (event) => {
        if (event.target.closest('a, input, button, [data-affair]')) return;
        toggle();
    };

    if (!news) return null;

    return (
        <article ref={ref} onClick={handleRowClick}
                 className={cn('grid-12 cursor-pointer gap-y-4 py-7 transition-colors',
                     isChecked ? 'bg-secondary shadow-[inset_3px_0_0_var(--accent-ink)]' : 'hover:bg-secondary/60')}>
            <div className="col-span-1 flex justify-center pt-1">
                <input type="checkbox" checked={isChecked} onChange={toggle}
                       aria-label={`Select “${news.title}” for its key passages`}
                       className="size-4 cursor-pointer accent-[var(--accent-ink)]"/>
            </div>

            {news.thumbnail && (
                <figure className="col-span-11 m-0 md:col-span-3">
                    <img src={news.thumbnail} alt="" loading="lazy" width={300} height={200}
                         className="aspect-[3/2] w-full object-cover"/>
                    <figcaption className="caption mt-1.5">Picture — {news.source}</figcaption>
                </figure>
            )}

            <div className={cn('col-span-11 col-start-2', news.thumbnail ? 'md:col-span-7 md:col-start-5' : 'md:col-span-8')}>
                <MetaLine>
                    <Meta tone="ink">{news.source}</Meta>
                    {news.publishedAt && <Meta><time dateTime={news.publishedAt}>{articleTime(news.publishedAt)}</time></Meta>}
                    {news.topic && <Meta>{news.topic}</Meta>}
                    {coverage && <Meta tone={coverage.tone} title={coverage.title}>{coverage.label}</Meta>}
                    {translation && (
                        <Meta>
                            <button type="button" onClick={toggleOriginal}
                                    title={original ? 'Show the machine translation' : `Machine translation. As written: “${news.title}”`}
                                    className="cursor-pointer tracking-[inherit] [font-variant-caps:inherit] underline decoration-rule underline-offset-4 hover:text-ink">
                                {original ? `in ${languageLabel(translation.language)}, show the translation` : `translated from ${languageLabel(translation.language)}`}
                            </button>
                        </Meta>
                    )}
                    {news.hedged && (
                        <Meta tone="accent" title={`The article says "${news.hedged}", so it has no confirmation of its own`}>
                            says "{news.hedged}"
                        </Meta>
                    )}
                </MetaLine>
                <h3 className="mt-2 font-display text-[1.45rem] leading-[1.15] font-medium text-balance">
                    {translated && translation.title ? translation.title : news.title}
                </h3>
                {news.description && (
                    <p className="mt-3 max-w-[66ch] text-[1.0625rem] leading-relaxed text-ink/85">
                        {translated && translation.description ? translation.description : news.description}
                    </p>
                )}
                {otherSources.length > 0 && (
                    <p className="caption mt-3 max-w-[66ch]">
                        Also covered by{' '}
                        {otherSources.map((other, index) => (
                            <span key={other.url}>
                                {index > 0 && ', '}
                                <a href={other.url} target="_blank" rel="noreferrer" className="underline decoration-rule underline-offset-4 hover:text-ink">{other.source}</a>
                            </span>
                        ))}
                    </p>
                )}
                <a href={news.url} target="_blank" rel="noreferrer" className="link mt-4 inline-block text-[0.9375rem]">
                    Read the article ↗
                </a>
                <div data-affair>
                    <ThreadTimeline facts={news.facts ?? []} leadUrl={news.url} onSelect={onSelect}/>
                </div>
            </div>
        </article>
    );
});
Article.displayName = 'Article';
