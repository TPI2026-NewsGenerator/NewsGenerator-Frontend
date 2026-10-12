//
//  Author: Fabian Rostello
//  Date: 12.10.2026
//  File: BriefingFormat.jsx
//  Description: The way the cards of the briefing are read: bullet points, a summary of 5 to 6 lines or
//               the key passages, all of them sentences of the article as published
//

import {ToggleGroup} from "radix-ui";
import {InfoTip} from "@/components/ui/info-tip.jsx";
import {cn} from "@/lib/utils.js";
import {FORMATS} from "@/features/briefing/formats.js";

const WAYS_TIP = 'Bullet points: the 3 most important sentences of the article. Summary: its most important sentences, '
    + 'in 5 to 6 lines. Key passages: up to 5 sentences. The AI only chooses them: they are always the article’s own '
    + 'words, translated when it is written in another language.';

// format: the one chosen; onChange(format); label: what it chooses, the reading of the page by default
export const BriefingFormat = ({format, onChange, label = 'Read as', disabled = false}) => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="kicker">
            {label}
            <InfoTip label={label}>{WAYS_TIP}</InfoTip>
        </p>
        {/* the radix group of the ToggleGroup of shadcn: one of them always chosen */}
        <ToggleGroup.Root type="single" value={format} disabled={disabled} onValueChange={value => value && onChange(value)}
                          aria-label={label} className="flex flex-wrap gap-2">
            {FORMATS.map(({value, label}) => (
                <ToggleGroup.Item key={value} value={value}
                                  className={cn('inline-flex h-8 cursor-pointer items-center border px-3 text-[0.9375rem] font-semibold tracking-[0.06em] [font-variant-caps:all-small-caps] transition-colors',
                                      'border-rule text-ink-mute hover:border-ink hover:text-ink data-[state=on]:border-ink data-[state=on]:text-ink',
                                      'disabled:cursor-not-allowed disabled:opacity-50')}>
                    {label}
                </ToggleGroup.Item>
            ))}
        </ToggleGroup.Root>
    </div>
);
