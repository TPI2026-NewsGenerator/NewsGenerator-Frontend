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
                          aria-label="Cards" className="mt-2 inline-flex flex-wrap gap-0.5 rounded-full bg-paper-deep p-1">
            {SIZES.map(value => (
                <ToggleGroup.Item key={value} value={String(value)}
                                  className={cn('inline-flex h-7 cursor-pointer items-center justify-center min-w-10 gap-2 rounded-full px-3.5 tabular-nums text-[0.8125rem] transition-[color,background-color,box-shadow] duration-200',
                                      'text-ink-mute hover:text-ink data-[state=on]:bg-paper data-[state=on]:text-ink data-[state=on]:shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:data-[state=on]:bg-rule',
                                      'disabled:cursor-not-allowed disabled:opacity-50')}>
                    {value}
                </ToggleGroup.Item>
            ))}
        </ToggleGroup.Root>
    </div>
);
