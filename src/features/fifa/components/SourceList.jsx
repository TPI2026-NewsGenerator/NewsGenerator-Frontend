//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: SourceList.jsx
//  Description: The sources readers joined to their choices, under the position of a candidate in the sheet: the medium (a link to the page), who chose, when, and
//               what the AI made of the page (a badge: Checking…, The page says it, The page says the opposite, Could not be confirmed, The page could
//               not be read), with the sentence it found. A source never changes a colour and "could not be confirmed" is never said as "wrong"
//

import {ExternalLink, TriangleAlert} from "lucide-react";
import {Badge} from "@/components/ui/badge.jsx";
import {CHECKS} from "@/features/fifa/sourceChecks.js";

const dateOf = (at) => at ? new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '';
const VALUES = {for: 'For', against: 'Against'};

const Item = ({source}) => {
    const check = CHECKS[source.check] ?? CHECKS.unclear;
    return (
        <li className="text-[0.875rem]">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <a href={source.url} target="_blank" rel="noreferrer" className="medium-link inline-flex items-center gap-1">{source.medium}<ExternalLink aria-hidden className="size-3"/></a>
                <span className="text-ink-mute">{VALUES[source.value] ?? source.value} · by {source.by} · {dateOf(source.at)}</span>
            </p>
            {source.note && <p className="caption mt-0.5">{source.note}</p>}
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span role={source.check === 'pending' ? 'status' : undefined}>
                    <Badge tone={check.tone} icon={source.check === 'contradicts' ? <TriangleAlert aria-hidden className="size-3.5 shrink-0"/> : undefined}>{check.label}</Badge>
                </span>
                {check.note && <span className="caption">{check.note}</span>}
            </p>
            {check.says && source.found && <p className="panel-text mt-1.5 border-l-2 border-rule pl-3.5">{check.says}“{source.found}”</p>}
        </li>
    );
};

// sources: the ones of this candidate, newest first; name: the candidate
export const SourceList = ({sources, name}) => {
    if (sources.length === 0) return null;
    return (
        <div className="mt-4" role="group" aria-label={`Sources joined to the choices on ${name}`}>
            <p className="kicker">Sources</p>
            <ul className="mt-1.5 space-y-3.5">
                {sources.map(source => <Item key={`${source.by}-${source.at}-${source.value}`} source={source}/>)}
            </ul>
            <p className="caption mt-2.5 max-w-[60ch]">The AI reads each page in the background. A source never changes a colour.</p>
        </div>
    );
};
