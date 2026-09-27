//
//  Author: Fabian Rostello
//  Date: 22.09.2026
//  File: SummaryList.jsx
//  Description: AI resumes of the selected news, used in Search Page
//

import {forwardRef} from "react";
import {Section} from "@/components/layout/Page.jsx";
import {Meta, MetaLine, Notice} from "@/components/ui/text.jsx";
import {cn} from "@/lib/utils.js";

// Who the article credits for what it reports, read by the AI while it summarizes. It describes
// the article, never whether the news is true: an official statement can be a lie and an
// unnamed source can be right.
const SOURCING = {
    named: {label: 'named sources', title: 'The article names who it credits: a person, a club, an institution'},
    anonymous: {label: 'unnamed sources', title: 'The article relies on sources it does not name'},
    none: {label: 'no source given', title: 'The article credits nobody for what it reports'},
};

export const SummaryList = forwardRef(({summaries}, ref) => {
    if (!summaries || summaries.length === 0) return null;

    return (
        <div ref={ref} className="scroll-mt-8">
            <Section kicker="Written by the AI" title="Your AI resume">
                <ol className="list-none p-0">
                    {summaries.map((news, index) => (
                        <li key={news.url} className="grid-12 border-t border-rule pt-7 pb-12">
                            <div className="col-span-12 md:col-span-2">
                                <p aria-hidden className="font-display text-[2.4rem] leading-none text-ink-mute">{String(index + 1).padStart(2, '0')}</p>
                            </div>
                            <div className="col-span-12 mt-3 md:col-span-7 md:mt-0">
                                <MetaLine>
                                    <Meta tone="ink">{news.source}</Meta>
                                    {news.publishedAt && <Meta>{new Date(news.publishedAt).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})}</Meta>}
                                    {news.topic && <Meta>{news.topic}</Meta>}
                                    {news.sourcing && (
                                        <Meta title={SOURCING[news.sourcing]?.title}>{SOURCING[news.sourcing]?.label ?? news.sourcing}</Meta>
                                    )}
                                </MetaLine>
                                <h3 className="story-head mt-2 text-balance">{news.title}</h3>
                                <div className="body-text mt-5">
                                    {news.summary
                                        ? news.summary.split(/\n\s*\n/).map((paragraph, i) => <p key={i} className={cn(index === 0 && i === 0 && 'lede')}>{paragraph}</p>)
                                        : <Notice type="error" title="No resume">{news.summaryError}</Notice>}
                                </div>
                                <a href={news.url} target="_blank" rel="noreferrer" className="link mt-5 inline-block">Read the article ↗</a>
                            </div>
                        </li>
                    ))}
                </ol>
            </Section>
        </div>
    );
});
SummaryList.displayName = 'SummaryList';
