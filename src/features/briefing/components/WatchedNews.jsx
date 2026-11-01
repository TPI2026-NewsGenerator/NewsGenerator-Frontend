//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: WatchedNews.jsx
//  Description: The news of what the profile follows: the ones that name one, as many as the reader wants,
//               apart from the cards, the newest first, a tab for each club, person, organisation or
//               word followed
//

import {useMemo, useState} from "react";
import {Link} from "react-router-dom";
import {Tabs} from "radix-ui";
import {LanguageMark} from "@/components/news/LanguageMark.jsx";
import {Input, Label, Select} from "@/components/ui/field.jsx";
import {Marked} from "@/components/news/Marked.jsx";
import {languageLabel} from "@/features/briefing/profileWords.js";
import {spanOf} from "@/features/briefing/windows.js";
import {useTranslation} from "@/features/search/translation.js";

const SHOWN = 8;
const when = (at) => new Date(at).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
const day = (at) => new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});

// A news of the list, with the words of its description. Written in another language than the reader's, its
// title and those words are translated when the row comes near the screen (the translator of the page, see
// FollowingNews and search/translation.js), shown marked as translated with the title and the words as written
// under them in italics; without a translator, as written
const News = ({news}) => {
    const {ref, translation, excerpt} = useTranslation(news.link, news.language, {withDescription: false, excerpt: news.excerpt});
    const translated = Boolean(translation?.title) || Boolean(excerpt);
    return (
        <li ref={ref} className="body-text">
            <a href={news.url} target="_blank" rel="noreferrer" className="link">
                {translation?.title ? translation.title : <Marked text={news.title} marks={news.marks?.title}/>}
            </a>
            {/* the title as written, with the places of the terms */}
            {translation?.title && (
                <span lang={translation.language} className="caption mt-0.5 block italic">
                    “<Marked text={news.title} marks={news.marks?.title}/>”
                </span>
            )}
            {/* the words of its description (around the name when it is there), translated with the words as written under */}
            {news.excerpt && (excerpt ? (
                <>
                    <span className="mt-0.5 block text-[0.9375rem] leading-snug text-ink/80">{excerpt}</span>
                    <span lang={news.language ?? undefined} className="caption mt-0.5 block italic">
                        “<Marked text={news.excerpt} marks={news.marks?.excerpt}/>”
                    </span>
                </>
            ) : (
                <span lang={news.language ?? undefined} className="mt-0.5 block text-[0.9375rem] leading-snug text-ink/80">
                    <Marked text={news.excerpt} marks={news.marks?.excerpt}/>
                </span>
            ))}
            <span className="caption block">
                {news.source}<LanguageMark code={news.language}/>
                {news.publishedAt && <> · <time dateTime={news.publishedAt}>{when(news.publishedAt)}</time></>}
                {news.media > 1 && <> · told by {news.media} media</>}
                {translated && <span title="Machine translation: it may contain errors"> · translated from {languageLabel(translation?.language ?? news.language)}</span>}
            </span>
        </li>
    );
};

// heading: the term named above its news, when it has no tab of its own. Also the news of a club or a
// person followed (see pages/Entity.jsx)
export const Term = ({group, heading = true}) => {
    const [all, setAll] = useState(false);
    const shown = all ? group.news : group.news.slice(0, SHOWN);
    return (
        <section className={heading ? 'border-t border-rule pt-5' : ''}>
            {heading && (
                <h3 className="font-display text-[1.35rem] leading-tight">
                    {group.qid ? group.term : `“${group.term}”`} <span className="folio align-middle">{group.count} {group.count === 1 ? 'story' : 'stories'}{group.hours && ` in ${spanOf(group.hours)}`}</span>
                </h3>
            )}
            {group.news.length === 0 ? (
                <p className="caption mt-2">No news of your sources named it in this window.</p>
            ) : (
                <ul className="mt-3 list-none space-y-3 p-0">
                    {shown.map(news => <News key={news.url} news={news}/>)}
                </ul>
            )}
            {group.news.length > SHOWN && (
                <button type="button" onClick={() => setAll(!all)} className="caption mt-3 cursor-pointer underline underline-offset-4 hover:text-ink">
                    {all ? 'show less' : `show the ${group.news.length - SHOWN} others`}
                </button>
            )}
            {group.count > group.news.length && (
                <p className="caption mt-1">
                    The {group.news.length} newest are listed{group.news.at(-1)?.publishedAt && <>, back to {day(group.news.at(-1).publishedAt)}</>}.
                </p>
            )}
        </section>
    );
};

// watched: [{term, qid, count, news: [{storyId, title, url, source, language, publishedAt, media, excerpt, marks}]}],
// qid: of a club, a person or an organisation followed, term its label; none for a word followed as written
// excerpt: the words of its description around the term when its title does not name it, absent from
// the older briefings; marks: the places of the terms in its title and excerpt (see marks.js)
// Several terms: one tab each (the Tabs of shadcn, on Radix), the news of the one chosen only; from TABS_MAX
// terms (300 can be followed) a list to pick from, with a field to find a name, the ones with news first
// an item and a word may share a name
const tabOf = (group) => group ? `${group.qid ?? 'word'} ${group.term}` : undefined;
const TABS_MAX = 12;

// what tells the news of one term: how many stories, over how long, and its own page
const Counted = ({group}) => (
    <p className="caption">
        {/* the window the search went back to, absent from the briefings before 1.11.2026 */}
        {group.count} {group.count === 1 ? 'story names' : 'stories name'} {group.qid ? group.term : `“${group.term}”`}{group.hours && ` in the last ${spanOf(group.hours)}`}.{' '}
        <Link className="link" to={group.qid ? `/following/${group.qid}` : `/following/name/${encodeURIComponent(group.term)}`}>Its page</Link>
    </p>
);

// many terms: a field to narrow them by what is typed, a list to pick one, its news under it
const Picker = ({watched}) => {
    const [filter, setFilter] = useState('');
    const [chosen, setChosen] = useState(null);
    const ordered = useMemo(() => [...watched].sort((a, b) => Number(b.count > 0) - Number(a.count > 0)), [watched]);
    const text = filter.trim().toLowerCase();
    const shown = text ? ordered.filter(group => group.term.toLowerCase().includes(text)) : ordered;
    const current = shown.find(group => tabOf(group) === chosen) ?? shown[0] ?? null;
    return (
        <div className="border-t border-rule pt-4">
            <div className="grid gap-4 md:grid-cols-2">
                <div>
                    <Label htmlFor="followed-filter">Find a name</Label>
                    <Input id="followed-filter" type="search" autoComplete="off" value={filter} onChange={event => setFilter(event.target.value)}
                           placeholder={`Among ${watched.length}…`}/>
                </div>
                <div>
                    <Label htmlFor="followed-pick">{shown.length} of {watched.length}</Label>
                    <Select id="followed-pick" value={tabOf(current) ?? ''} onChange={event => setChosen(event.target.value)}
                            options={shown.map(group => ({value: tabOf(group), label: `${group.term} · ${group.count}`}))}/>
                </div>
            </div>
            {current
                ? <div className="pt-4"><Counted group={current}/><Term key={tabOf(current)} group={current} heading={false}/></div>
                : <p className="caption pt-4">No name followed has “{filter.trim()}” in it.</p>}
        </div>
    );
};

export const WatchedNews = ({watched}) => {
    if (watched.length === 1) return <Term group={watched[0]}/>;
    if (watched.length > TABS_MAX) return <Picker watched={watched}/>;
    return (
        <Tabs.Root defaultValue={tabOf(watched[0])} className="border-t border-rule">
            <Tabs.List aria-label="What you follow" className="flex flex-wrap gap-x-6 gap-y-1 border-b border-rule">
                {watched.map(group => (
                    <Tabs.Trigger key={tabOf(group)} value={tabOf(group)}
                                  className="-mb-px cursor-pointer border-b-2 border-transparent pt-4 pb-2 text-left font-display text-[1.2rem] leading-tight text-ink-mute transition-colors hover:text-ink data-[state=active]:border-ink data-[state=active]:text-ink">
                        {group.term} <span className="folio align-middle">{group.count}</span>
                    </Tabs.Trigger>
                ))}
            </Tabs.List>
            {watched.map(group => (
                <Tabs.Content key={tabOf(group)} value={tabOf(group)} className="pt-4 outline-none focus-visible:ring-1 focus-visible:ring-ink">
                    <Counted group={group}/>
                    <Term group={group} heading={false}/>
                </Tabs.Content>
            ))}
        </Tabs.Root>
    );
};
