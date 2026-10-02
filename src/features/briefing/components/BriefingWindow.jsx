//
//  Author: Fabian Rostello
//  Date: 03.10.2026
//  File: BriefingWindow.jsx
//  Description: The choice of the news a briefing is written from: the last 24 hours, 2 days or 7 days
//

import {ToggleGroup} from "radix-ui";
import {InfoTip} from "@/components/ui/info-tip.jsx";
import {cn} from "@/lib/utils.js";
import {WINDOWS} from "@/features/briefing/windows.js";

// hours: the one chosen; onChange(hours)
export const BriefingWindow = ({hours, onChange, disabled = false}) => (
    <div>
        <p className="kicker">
            The news of the last
            <InfoTip label="The news of the last">
                What the next briefing is chosen from. Over 7 days, an affair followed for several days is one card,
                and the news told by several media come first.
            </InfoTip>
        </p>
        {/* the radix group of the ToggleGroup of shadcn: one of them always chosen */}
        <ToggleGroup.Root type="single" value={String(hours)} disabled={disabled}
                          onValueChange={value => value && onChange(Number(value))}
                          aria-label="The news of the last" className="mt-2 flex flex-wrap gap-2">
            {WINDOWS.map(window => (
                <ToggleGroup.Item key={window.hours} value={String(window.hours)}
                                  className={cn('inline-flex h-8 cursor-pointer items-center border px-3 text-[0.9375rem] font-semibold tracking-[0.06em] [font-variant-caps:all-small-caps] transition-colors',
                                      'border-rule text-ink-mute hover:border-ink hover:text-ink data-[state=on]:border-ink data-[state=on]:text-ink',
                                      'disabled:cursor-not-allowed disabled:opacity-50')}>
                    {window.label}
                </ToggleGroup.Item>
            ))}
        </ToggleGroup.Root>
    </div>
);
