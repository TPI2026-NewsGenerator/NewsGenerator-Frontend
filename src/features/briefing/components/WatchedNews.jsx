//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: WatchedNews.jsx
//  Description: The news of the names and terms the profile follows: every one of the window that names
//               one, listed apart from the cards, the newest first
//

import {useState} from "react";
import {LanguageMark} from "@/components/news/LanguageMark.jsx";

const SHOWN = 8;
const when = (at) => new Date(at).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});

const Term = ({group}) => {
    const [all, setAll] = useState(false);
    const shown = all ? group.news : group.news.slice(0, SHOWN);
    return (
        <section className="border-t border-rule pt-5">
            <h3 className="font-display text-[1.35rem] leading-tight">
                “{group.term}” <span className="folio align-middle">{group.count} {group.count === 1 ? 'story' : 'stories'}</span>
            </h3>
            {group.news.length === 0 ? (
                <p className="caption mt-2">No news of your sources named it in this window.</p>
            ) : (
                <ul className="mt-3 list-none space-y-3 p-0">
                    {shown.map(news => (
                        <li key={news.url} className="body-text">
                            <a href={news.url} target="_blank" rel="noreferrer" className="link">{news.title}</a>
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

// watched: [{term, count, news: [{storyId, title, url, source, language, publishedAt, media}]}]
export const WatchedNews = ({watched}) => (
    <div className="space-y-6">
        {watched.map(group => <Term key={group.term} group={group}/>)}
    </div>
);
