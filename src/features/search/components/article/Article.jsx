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
import {coverageLabel} from "@/features/briefing/corroboration.js";
import {NewsLinks} from "@/components/news/NewsLinks.jsx";

const articleTime = (at) => {
    const minDiff = Math.floor((Date.now() - new Date(at)) / (1000 * 60));
    const hourDiff = Math.floor(minDiff / 60);
    const rtf = new Intl.RelativeTimeFormat('en', {numeric: 'auto'});

    if (minDiff < 60) return rtf.format(-minDiff, 'minute');
    if (hourDiff < 24) return rtf.format(-hourDiff, 'hour');
    return rtf.format(-Math.floor(hourDiff / 24), 'day');
};

// a click on the row selects it for its key passages, except on its links and in the facts of its
// affair, each chosen on its own
export const Article = memo(({id, onSelect, news}) => {
    const [isChecked, setIsChecked] = useState(false);

    const coverage = coverageLabel(news?.corroboration, {articles: (news?.sources?.length ?? 0) + 1});
    // a news in another language than the one searched, translated when the reader reaches it
    const {ref, translation} = useTranslation(news?.url, news?.language);
    const translated = Boolean(translation?.title);

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
                    {coverage && <Meta tone={coverage.tone} title={coverage.title}>{coverage.text}</Meta>}
                    {translated && (
                        <Meta title="Machine translation: it may contain errors">translated from {languageLabel(translation.language)}</Meta>
                    )}
                    {news.hedged && (
                        <Meta tone="accent" title={`The article says "${news.hedged}", so it has no confirmation of its own`}>
                            says "{news.hedged}"
                        </Meta>
                    )}
                </MetaLine>
                <h3 className="mt-2 font-display text-[1.45rem] leading-[1.15] font-medium text-balance">
                    {translated ? translation.title : news.title}
                </h3>
                {/* a translated title shows the one as written under it, as the cards of the briefing */}
                {translated && (
                    <p lang={translation.language} className="caption mt-1.5 italic">“{news.title}”</p>
                )}
                {news.description && (
                    <p className="mt-3 max-w-[66ch] text-[1.0625rem] leading-relaxed text-ink/85">
                        {translated && translation.description ? translation.description : news.description}
                    </p>
                )}
                <NewsLinks lead={news} others={news.sources ?? []}/>
                <div data-affair>
                    <ThreadTimeline facts={news.facts ?? []} leadUrl={news.url} onSelect={onSelect}/>
                </div>
            </div>
        </article>
    );
});
Article.displayName = 'Article';
