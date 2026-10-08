//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: WatchedNews.jsx
//  Description: The news of the names and terms the profile follows: every one of the window that names
//               one, listed apart from the cards, the newest first, a tab per term
//

import {useState} from "react";
import {Tabs} from "radix-ui";
import {LanguageMark} from "@/components/news/LanguageMark.jsx";
import {Marked} from "@/components/news/Marked.jsx";

const SHOWN = 8;
const when = (at) => new Date(at).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});

// heading: the term named above its news, when it has no tab of its own. Also the news of a club or a
// person followed (see pages/Entity.jsx)
export const Term = ({group, heading = true}) => {
    const [all, setAll] = useState(false);
    const shown = all ? group.news : group.news.slice(0, SHOWN);
    return (
        <section className={heading ? 'border-t border-rule pt-5' : ''}>
            {heading && (
                <h3 className="font-display text-[1.35rem] leading-tight">
                    “{group.term}” <span className="folio align-middle">{group.count} {group.count === 1 ? 'story' : 'stories'}</span>
                </h3>
            )}
            {group.news.length === 0 ? (
                <p className="caption mt-2">No news of your sources named it in this window.</p>
            ) : (
                <ul className="mt-3 list-none space-y-3 p-0">
                    {shown.map(news => (
                        <li key={news.url} className="body-text">
                            <a href={news.url} target="_blank" rel="noreferrer" className="link">
                                <Marked text={news.title} marks={news.marks?.title}/>
                            </a>
                            {/* the title does not name it: the words of the news around it */}
                            {news.excerpt && (
                                <span lang={news.language ?? undefined} className="mt-0.5 block text-[0.9375rem] leading-snug text-ink/80">
                                    <Marked text={news.excerpt} marks={news.marks?.excerpt}/>
                                </span>
                            )}
                            <span className="caption block">
                                {news.source}<LanguageMark code={news.language}/>
                                {news.publishedAt && <> · <time dateTime={news.publishedAt}>{when(news.publishedAt)}</time></>}
                                {news.media > 1 && <> · told by {news.media} media</>}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {group.news.length > SHOWN && (
                <button type="button" onClick={() => setAll(!all)} className="caption mt-3 cursor-pointer underline underline-offset-4 hover:text-ink">
                    {all ? 'show less' : `show the ${group.news.length - SHOWN} others`}
                </button>
            )}
            {group.count > group.news.length && <p className="caption mt-1">The {group.news.length} newest are listed.</p>}
        </section>
    );
};

// watched: [{term, count, news: [{storyId, title, url, source, language, publishedAt, media, excerpt, marks}]}],
// excerpt: the words of its description around the term when its title does not name it, absent from
// the older briefings; marks: the places of the terms in its title and excerpt (see marks.js)
// Several terms: one tab each (the Tabs of shadcn, on Radix), the news of the one chosen only
export const WatchedNews = ({watched}) => {
    if (watched.length === 1) return <Term group={watched[0]}/>;
    return (
        <Tabs.Root defaultValue={watched[0]?.term} className="border-t border-rule">
            <Tabs.List aria-label="The names and terms you follow" className="flex flex-wrap gap-x-6 gap-y-1 border-b border-rule">
                {watched.map(group => (
                    <Tabs.Trigger key={group.term} value={group.term}
                                  className="-mb-px cursor-pointer border-b-2 border-transparent pt-4 pb-2 text-left font-display text-[1.2rem] leading-tight text-ink-mute transition-colors hover:text-ink data-[state=active]:border-ink data-[state=active]:text-ink">
                        {group.term} <span className="folio align-middle">{group.count}</span>
                    </Tabs.Trigger>
                ))}
            </Tabs.List>
            {watched.map(group => (
                <Tabs.Content key={group.term} value={group.term} className="pt-4 outline-none focus-visible:ring-1 focus-visible:ring-ink">
                    <p className="caption">{group.count} {group.count === 1 ? 'story names' : 'stories name'} “{group.term}”.</p>
                    <Term group={group} heading={false}/>
                </Tabs.Content>
            ))}
        </Tabs.Root>
    );
};
