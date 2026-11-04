//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: CardCoverage.jsx
//  Description: How widely the news of a card is told: how many media and languages, who told it first, the hours the media came in
//               as bars, and the media one after the other. On every card, counted from the articles it holds; with how many of them
//               wrote their own text, so ten media on one wire are not read as ten confirmations
//

import {useState} from "react";
import {InfoTip} from "@/components/ui/info-tip.jsx";
import {LanguageMark} from "@/components/news/LanguageMark.jsx";
import {coverageOfCard} from "@/features/briefing/cardCoverage.js";
import {coverageLabel} from "@/features/briefing/corroboration.js";
import {languageLabel} from "@/features/briefing/profileWords.js";
import {capitalized} from "@/lib/utils.js";

const SHOWN = 8;
const NOTE = 'Counted from the articles of this story that we read, each medium once. It says how widely it is told, never whether it is true: a text republished by several media counts for each.';

const when = (at) => new Date(at).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});

export const CardCoverage = ({item}) => {
    const [all, setAll] = useState(false);
    const coverage = coverageOfCard(item);
    if (!coverage) return null;
    // the texts of the media read: how many are their own, which wire they republish (the tab "Sources" said it, until 05.11.2026)
    const texts = coverageLabel(item.corroboration);
    const most = Math.max(1, ...coverage.bars.map(bar => bar.count));
    const list = all ? coverage.list : coverage.list.slice(0, SHOWN);

    return (
        <div>
            <p className="kicker">
                How widely it is told
                <InfoTip label="How widely it is told">{NOTE}</InfoTip>
            </p>
            <p className="panel-lead mt-2">
                {coverage.media === 1 ? 'One medium' : `${coverage.media} media`}
                {coverage.languages.length > 0 && <> · {coverage.languages.length === 1 ? '1 language' : `${coverage.languages.length} languages`}</>}
            </p>
            {coverage.first && <p className="caption mt-1">First told by {coverage.first.source}, {when(coverage.first.at)}</p>}
            {texts?.texts && (
                <p className="caption mt-1">
                    {capitalized(texts.texts)}
                    <InfoTip label={texts.texts}>{texts.title}.</InfoTip>
                </p>
            )}

            {coverage.bars.length > 1 && (
                <div className="mt-4 max-w-[34rem]">
                    <div className="flex h-14 items-end gap-1" role="img"
                         aria-label={`Media by hour: ${coverage.bars.map(bar => `${when(bar.from)}, ${bar.count}`).join('; ')}`}>
                        {coverage.bars.map(bar => (
                            <span key={+bar.from} title={`${when(bar.from)}: ${bar.count} ${bar.count === 1 ? 'medium' : 'media'}`}
                                  className="flex-1 rounded-t-sm bg-ink-mute/40"
                                  style={{height: bar.count === 0 ? 2 : `${Math.max(8, Math.round((bar.count / most) * 100))}%`}}/>
                        ))}
                    </div>
                    <p className="caption mt-1.5 flex justify-between"><span>{when(coverage.first.at)}</span><span>{when(coverage.last.at)}</span></p>
                </div>
            )}

            {coverage.languages.length > 0 && (
                <p className="caption mt-3 max-w-[60ch]">
                    {coverage.languages.map(one => `${languageLabel(one.language)} ${one.media}`).join(' · ')}
                </p>
            )}

            <p className="kicker mt-6">The media, in the order they came in</p>
            <ol className="mt-2 max-w-[40rem] list-none divide-y divide-rule p-0">
                {list.map(article => (
                    <li key={article.url} className="panel-text grid grid-cols-[6.5rem_1fr] items-baseline gap-x-3 py-1.5">
                        <time dateTime={article.publishedAt} className="caption">{article.publishedAt ? when(article.publishedAt) : ''}</time>
                        <span>
                            <a href={article.url} target="_blank" rel="noreferrer" title={article.title}
                               className="panel-link">{article.source}</a>
                            {article.trusted && <span className="ml-0.5 text-accent-ink" title="A source you trust" aria-label="a source you trust">★</span>}
                            <LanguageMark code={article.language}/>
                        </span>
                    </li>
                ))}
            </ol>
            {coverage.list.length > SHOWN && (
                <button type="button" onClick={() => setAll(!all)} aria-expanded={all}
                        className="mt-2 cursor-pointer text-[0.8125rem] text-action-text hover:underline underline-offset-4">
                    {all ? 'Show the first ones only' : `Show all ${coverage.list.length} media`}
                </button>
            )}
        </div>
    );
};
