//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: CardMore.jsx
//  Description: Under the news of a card, one strip of buttons for what lies around it (its analysis, its angles, its affair, how widely it
//               is told): one open at a time, the first at first, the others one click away
//

import {cn} from "@/lib/utils.js";

// tabs: [{key, label, count?, pending?, content}], open: the key open or null, onOpen(key or null), id: the card's, for the places of
// the panels. A button opens its panel, and closes it when it is open
export const CardMore = ({tabs, open, onOpen, id, className}) => {
    if (tabs.length === 0) return null;
    return (
        <div className={cn('mt-10', className)}>
            <div className="flex gap-1 overflow-x-auto border-b border-rule pb-2 [scrollbar-width:none] max-md:gap-0">
                {tabs.map(tab => (
                    <button key={tab.key} type="button" id={`${id}-${tab.key}-tab`} aria-expanded={open === tab.key} aria-controls={`${id}-${tab.key}`}
                            onClick={() => onOpen(open === tab.key ? null : tab.key)}
                            className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[0.875rem] whitespace-nowrap text-ink-mute transition-colors duration-200 hover:text-ink aria-expanded:bg-paper-deep aria-expanded:text-ink max-md:gap-1 max-md:px-[7px] max-md:text-[0.8125rem]">
                        {tab.label}
                        {tab.count !== undefined && <> <span className="tabular-nums text-ink-mute">{tab.count}</span></>}
                        {tab.pending && <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-accent-ink" title="Being written"/>}
                    </button>
                ))}
            </div>
            {tabs.map(tab => open === tab.key && (
                <section key={tab.key} id={`${id}-${tab.key}`} aria-labelledby={`${id}-${tab.key}-tab`} className="mt-6 scroll-mt-24">
                    {tab.content}
                </section>
            ))}
        </div>
    );
};
