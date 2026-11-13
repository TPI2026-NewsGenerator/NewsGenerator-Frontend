//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: LeaderNews.jsx
//  Description: The news that name the president of an association, in the tab "Leadership profile" of the sheet: the news of the last 30 days, newest first (the same ones the
//               president's "articles in 30 days" count), fifty at a time ("Show more"). A segmented control chooses the scope: "Football news" (the default: the news that
//               also name the association, its confederation or FIFA, or hold a football word) or "All news" (every news that names the person, the ones that are not about
//               football marked "Not football"). Loaded when the tab is opened, not with the sheet. It says that the list is the news that name the person, in any context
//

import {useEffect, useId, useState} from "react";
import {Button} from "@/components/ui/button.jsx";
import {FifaApi} from "@/features/fifa/fifaApi.js";
import {cn} from "@/lib/utils.js";

const PAGE = 50;
const dateOf = (at) => at ? new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '';

const SEGMENT = cn(
    'inline-flex min-h-9 cursor-pointer items-center rounded-full px-4 py-1 text-[0.875rem] text-ink-mute transition-colors duration-200 hover:text-ink',
    'has-checked:bg-paper has-checked:text-ink has-checked:shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:has-checked:bg-rule',
    'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-action',
);

const Article = ({article}) => (
    <li className="border-t border-rule py-3.5 first:border-t-0 first:pt-1">
        <p className="caption flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{dateOf(article.published_at)} · {article.medium}</span>
            {article.relevant === false && <span className="rounded-full bg-paper-deep px-2 py-0.5 text-[0.6875rem] text-ink-mute">Not football</span>}
        </p>
        <a href={article.url} target="_blank" rel="noopener noreferrer" lang={article.lang} className="medium-link mt-0.5 inline-block text-[0.9375rem] leading-snug font-medium">{article.title}</a>
        {article.description && <p lang={article.lang} className="mt-1 line-clamp-2 text-[0.875rem] text-ink-mute">{article.description}</p>}
    </li>
);

// qid: the association; the news of its president are asked when this is shown (the tab is opened)
export const LeaderNews = ({qid}) => {
    const name = useId();
    const [scope, setScope] = useState('football');
    // a new ask for the first page: the scope chosen, and a try again
    const [round, setRound] = useState(0);
    const key = `${scope}/${round}`;
    // the first page, for the ask `key` (a page that is not for the ask in hand is not there yet: loading)
    const [first, setFirst] = useState({key: '', answer: null, error: null});
    // the pages after it, for the ask `key`
    const [more, setMore] = useState({key: '', articles: [], busy: false, error: null});

    useEffect(() => {
        let current = true;
        FifaApi.leaderNews(qid, {scope, limit: PAGE, offset: 0})
            .then(answer => { if (current) setFirst({key, answer: answer?.error || !answer ? null : answer, error: answer?.error ?? (answer ? null : 'The server sent nothing.')}); })
            .catch(() => { if (current) setFirst({key, answer: null, error: 'The news could not be read. Try again in a moment.'}); });
        return () => { current = false; };
    }, [qid, scope, key]);

    const loading = first.key !== key;
    const answer = loading ? null : first.answer;
    const rest = more.key === key ? more.articles : [];
    const articles = answer ? [...answer.articles, ...rest] : [];

    const choose = (next) => {
        if (next === scope) return;
        setScope(next);
        setMore({key: '', articles: [], busy: false, error: null});
    };
    const showMore = async () => {
        setMore(previous => ({key, articles: previous.key === key ? previous.articles : [], busy: true, error: null}));
        let page;
        try {
            page = await FifaApi.leaderNews(qid, {scope, limit: PAGE, offset: articles.length});
        } catch {
            page = {error: 'The next news could not be read. Try again in a moment.'};
        }
        // the answer of an ask that was left (another scope) is dropped
        setMore(previous => previous.key !== key ? previous : page?.articles
            ? {key, articles: [...previous.articles, ...page.articles], busy: false, error: null}
            : {key, articles: previous.articles, busy: false, error: page?.error ?? 'The next news could not be read. Try again in a moment.'});
    };

    const hidden = answer ? answer.total_all - answer.total_football : 0;
    const label = (word, total) => `${word}${total === undefined ? '' : ` (${total})`}`;
    return (
        <section aria-labelledby={`${name}-title`} className="mt-8">
            <h3 id={`${name}-title`} className="section-title">
                {answer ? `${answer.total} ${scope === 'football' ? 'football news' : 'news'} in the last 30 days` : 'News that name the president'}
            </h3>

            <div role="radiogroup" aria-label="News shown" className="mt-3 inline-flex max-w-full flex-wrap gap-0.5 rounded-full bg-paper-deep p-1">
                <label className={SEGMENT}>
                    <input type="radio" name={name} value="football" checked={scope === 'football'} onChange={() => choose('football')} className="peer sr-only"/>
                    {label('Football news', answer?.total_football)}
                </label>
                <label className={SEGMENT}>
                    <input type="radio" name={name} value="all" checked={scope === 'all'} onChange={() => choose('all')} className="peer sr-only"/>
                    {label('All news', answer?.total_all)}
                </label>
            </div>

            {loading && <p role="status" className="mt-4 text-[0.9375rem] text-ink-mute">Reading the news…</p>}
            {!loading && first.error && (
                <p role="alert" className="mt-4 text-[0.9375rem] text-accent-ink">
                    {first.error} <button type="button" onClick={() => setRound(one => one + 1)} className="link cursor-pointer">Try again</button>
                </p>
            )}

            {answer && scope === 'football' && hidden > 0 && (
                <p className="caption mt-3">
                    {hidden} news that name this president {hidden === 1 ? 'is' : 'are'} hidden (not about football). <button type="button" onClick={() => choose('all')} className="link cursor-pointer">Show all</button>
                </p>
            )}

            {answer && answer.total === 0 && (
                <p className="mt-4 text-[0.9375rem] text-ink-mute">
                    {scope === 'football' && answer.total_all > 0 ? 'No football news name this president in the last 30 days.' : 'No news name this president in the last 30 days.'}
                </p>
            )}

            {articles.length > 0 && (
                <>
                    <ul aria-label="News" className="mt-4">
                        {articles.map(article => <Article key={article.id} article={article}/>)}
                    </ul>
                    <p role="status" className="caption mt-2">{articles.length} of {answer.total} shown</p>
                    {articles.length < answer.total && (
                        <div className="mt-2">
                            <Button size="sm" loading={more.busy && more.key === key} onClick={showMore}>Show more</Button>
                        </div>
                    )}
                    {more.key === key && more.error && (
                        <p role="alert" className="caption mt-2 !text-accent-ink">{more.error}</p>
                    )}
                </>
            )}

            <div className="caption mt-5 max-w-[60ch] space-y-1.5">
                <p>The list is the news that name the person, in any context: a namesake or a passing mention can appear.</p>
                <p>The football filter reads the words and the links of each news, so in some languages a football news can be hidden: &ldquo;All news&rdquo; always shows everything.</p>
            </div>
        </section>
    );
};
