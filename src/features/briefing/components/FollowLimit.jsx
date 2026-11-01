//
//  Author: Fabian Rostello
//  Date: 01.11.2026
//  File: FollowLimit.jsx
//  Description: The choice of the news each name, word or club followed should have in the briefing: 10
//               to 100 on a bar. The search goes back, up to 30 days, until it finds them
//

import {useEffect, useState} from "react";
import {Slider} from "radix-ui";
import {InfoTip} from "@/components/ui/info-tip.jsx";
import {MAX_WATCH, MIN_WATCH, WATCH_STEP} from "@/features/briefing/windows.js";

// limit: the one chosen; onChange(limit), once the bar is let go
export const FollowLimit = ({limit, onChange, disabled = false}) => {
    const [value, setValue] = useState(limit);
    useEffect(() => setValue(limit), [limit]);
    return (
        <div>
            <p className="kicker">
                Each name you follow
                <InfoTip label="Each name you follow">
                    The news its tab should have, whatever the window above. The search goes back day by day, up to 30 days, until it
                    finds them: a frequent name or word takes a day or two, a rare one the whole month. Fewer is faster.
                </InfoTip>
            </p>
            {/* the radix bar of the Slider of shadcn, as the one of the days */}
            <div className="mt-2 flex h-8 items-center gap-4">
                <Slider.Root min={MIN_WATCH} max={MAX_WATCH} step={WATCH_STEP} value={[value]} disabled={disabled}
                             onValueChange={([next]) => setValue(next)}
                             onValueCommit={([next]) => next !== limit && onChange(next)}
                             className="relative flex w-44 cursor-pointer touch-none items-center select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50">
                    <Slider.Track className="relative h-px grow bg-rule">
                        <Slider.Range className="absolute h-full bg-ink"/>
                    </Slider.Track>
                    <Slider.Thumb aria-label="News wanted for each name you follow" aria-valuetext={`${value} news`}
                                  className="block size-4 rounded-full border border-ink bg-paper outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"/>
                </Slider.Root>
                <span className="text-[0.9375rem] font-semibold tracking-[0.06em] text-ink [font-variant-caps:all-small-caps]">{value} news</span>
            </div>
        </div>
    );
};
