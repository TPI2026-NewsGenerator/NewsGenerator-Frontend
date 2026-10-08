//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: BriefingSize.jsx
//  Description: How many cards the next briefing has: 10, 20 or 30, the most relevant first
//

import {ToggleGroup} from "radix-ui";
import {InfoTip} from "@/components/ui/info-tip.jsx";
import {cn} from "@/lib/utils.js";
import {SIZES} from "@/features/briefing/sizes.js";

// size: the one chosen; onChange(size)
export const BriefingSize = ({size, onChange, disabled = false}) => (
    <div>
        <p className="kicker">
            Cards
            <InfoTip label="Cards">
                How many stories the next briefing has, the most relevant first. More cards take longer to write:
                about a minute for 10, two for 30.
            </InfoTip>
        </p>
        <ToggleGroup.Root type="single" value={String(size)} disabled={disabled}
                          onValueChange={value => value && onChange(Number(value))}
                          aria-label="Cards" className="mt-2 flex flex-wrap gap-2">
            {SIZES.map(value => (
                <ToggleGroup.Item key={value} value={String(value)}
                                  className={cn('inline-flex h-8 min-w-10 cursor-pointer items-center justify-center border px-3 text-[0.9375rem] font-semibold tabular-nums transition-colors',
                                      'border-rule text-ink-mute hover:border-ink hover:text-ink data-[state=on]:border-ink data-[state=on]:text-ink',
                                      'disabled:cursor-not-allowed disabled:opacity-50')}>
                    {value}
                </ToggleGroup.Item>
            ))}
        </ToggleGroup.Root>
    </div>
);
