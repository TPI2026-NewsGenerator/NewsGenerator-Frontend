//
//  Author: Fabian Rostello
//  Date: 03.10.2026
//  File: BriefingWindow.jsx
//  Description: The choice of the news a briefing is written from: the last 1 to 7 days, on a bar
//

import {useEffect, useState} from "react";
import {Slider} from "radix-ui";
import {InfoTip} from "@/components/ui/info-tip.jsx";
import {MAX_DAYS, MIN_DAYS, spanOf} from "@/features/briefing/windows.js";

// hours: the one chosen; onChange(hours), once the bar is let go (the page of a name reads its news
// again for each window: not for every day passed while dragging); tip: what the window is for, the
// next briefing by default
export const BriefingWindow = ({hours, onChange, disabled = false, tip}) => {
    const [days, setDays] = useState(hours / 24);
    useEffect(() => setDays(hours / 24), [hours]);
    return (
        <div>
            <p className="kicker">
                The news of the last
                <InfoTip label="The news of the last">
                    {tip ?? 'What the next briefing is chosen from. From 3 days, an affair followed for several days is one card, and the news told by several media come first.'}
                </InfoTip>
            </p>
            {/* the radix bar of the Slider of shadcn */}
            <div className="mt-2 flex h-8 items-center gap-4">
                <Slider.Root min={MIN_DAYS} max={MAX_DAYS} step={1} value={[days]} disabled={disabled}
                             onValueChange={([value]) => setDays(value)}
                             onValueCommit={([value]) => value * 24 !== hours && onChange(value * 24)}
                             className="relative flex w-44 cursor-pointer touch-none items-center select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50">
                    <Slider.Track className="relative h-1 grow overflow-hidden rounded-full bg-paper-deep ring-1 ring-rule/50">
                        <Slider.Range className="absolute h-full bg-action"/>
                    </Slider.Track>
                    <Slider.Thumb aria-label="The news of the last" aria-valuetext={spanOf(days * 24)}
                                  className="block size-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.3)] ring-1 ring-black/5 outline-none focus-visible:ring-4 focus-visible:ring-action/30"/>
                </Slider.Root>
                <span className="text-[0.875rem] text-ink tabular-nums">{spanOf(days * 24)}</span>
            </div>
        </div>
    );
};
