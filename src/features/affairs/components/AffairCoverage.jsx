//
//  Author: Fabian Rostello
//  Date: 04.11.2026
//  File: AffairCoverage.jsx
//  Description: How widely the media talked of an affair: how many, in which languages, who told it first, the day
//               most wrote on it, and the media one after the other as they joined
//

import {useState} from "react";
import {InfoTip} from "@/components/ui/info-tip.jsx";
import {Meta, MetaLine} from "@/components/ui/text.jsx";
import {languageLabel} from "@/features/briefing/profileWords.js";

const MEDIA_SHOWN = 12;
const LANGUAGES_SHOWN = 6;

// what is counted, and what it is not
const NOTE = 'Counted from the news we read, whatever the language: a medium is counted once, and a text republished by several media counts for each. It says how much the affair is told, never whether it is true.';

const dayOf = (at) => new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});
const dayKeyOf = (key) => {
    const [year, month, day] = key.split('-').map(Number);
    return dayOf(new Date(year, month - 1, day));
};
const count = (n) => n.toLocaleString('en-GB');

// coverage: see the server's coverageOf
export const AffairCoverage = ({coverage}) => {
    const [all, setAll] = useState(false);
    if (!coverage || coverage.media === 0) return null;
    const media = all ? coverage.byMedium : coverage.byMedium.slice(0, MEDIA_SHOWN);

    return (
        <div className="mt-6">
            <p className="section-title">
                How widely it was told
                <InfoTip label="How widely it was told">{NOTE}</InfoTip>
            </p>
            <p className="panel-lead mt-2">
                {count(coverage.media)} media · {count(coverage.news)} news · {coverage.languages.length} {coverage.languages.length === 1 ? 'language' : 'languages'}
            </p>
            <MetaLine className="mt-1">
                {coverage.first && <Meta>First told by {coverage.first.medium}, {dayOf(coverage.first.at)}</Meta>}
                {coverage.peak && coverage.peak.media > 0 && <Meta>Most media on {dayKeyOf(coverage.peak.day)} ({count(coverage.peak.media)})</Meta>}
            </MetaLine>
            <p className="caption mt-2">
                {coverage.languages.slice(0, LANGUAGES_SHOWN).map(one => `${languageLabel(one.language)} ${count(one.media)}`).join(' · ')}
                {coverage.languages.length > LANGUAGES_SHOWN && ` · ${coverage.languages.length - LANGUAGES_SHOWN} more`}
            </p>

            <p className="section-title mt-6">The media, in the order they joined</p>
            <ol className="mt-2 list-none divide-y divide-rule p-0">
                {media.map(one => (
                    <li key={one.medium} className="panel-text grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-x-3 py-1.5">
                        <time dateTime={one.firstAt} className="caption">{dayOf(one.firstAt)}</time>
                        <span>{one.medium}</span>
                        <span className="caption">{one.news} news</span>
                    </li>
                ))}
            </ol>
            {coverage.byMedium.length > MEDIA_SHOWN && (
                <button type="button" onClick={() => setAll(!all)} aria-expanded={all}
                        className="mt-2 cursor-pointer text-[0.8125rem] text-action-text hover:underline underline-offset-4">
                    {all ? 'Show the first ones only' : `Show all ${count(coverage.byMedium.length)} media`}
                </button>
            )}
        </div>
    );
};
