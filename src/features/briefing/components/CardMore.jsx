//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: CardMore.jsx
//  Description: Under the news of a card, one strip of buttons for what lies around it (its analysis, its angles, its affair, how widely it
//               is told): one open at a time, the first at first, the others one click away. On a phone the strip is wider than the screen:
//               it runs to its edges and fades where there is more to scroll to, so it is seen to scroll (the user, 05.11.2026)
//

import {useEffect, useRef, useState} from "react";
import {cn} from "@/lib/utils.js";

// the fade of an edge of the strip where more tabs are, the width of what is lost
const FADE = 32;
const maskOf = ({start, end}) => {
    if (!start && !end) return undefined;
    const from = start ? `transparent, black ${FADE}px` : 'black';
    const to = end ? `black calc(100% - ${FADE}px), transparent` : 'black';
    return `linear-gradient(to right, ${from}, ${to})`;
};

// tabs: [{key, label, count?, pending?, content}], open: the key open or null, onOpen(key or null), id: the card's, for the places of
// the panels. A button opens its panel, and closes it when it is open
export const CardMore = ({tabs, open, onOpen, id, className}) => {
    const strip = useRef(null);
    // is there more of the strip on each side of what is seen
    const [edges, setEdges] = useState({start: false, end: false});

    useEffect(() => {
        const node = strip.current;
        if (!node) return undefined;
        const measure = () => setEdges(current => {
            const next = {start: node.scrollLeft > 1, end: node.scrollLeft + node.clientWidth < node.scrollWidth - 1};
            return next.start === current.start && next.end === current.end ? current : next;
        });
        measure();
        node.addEventListener('scroll', measure, {passive: true});
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
        observer?.observe(node);
        return () => {
            node.removeEventListener('scroll', measure);
            observer?.disconnect();
        };
    }, [tabs.length]);

    if (tabs.length === 0) return null;
    const mask = maskOf(edges);
    return (
        <div className={cn('mt-10', className)}>
            <div ref={strip} style={mask ? {maskImage: mask, WebkitMaskImage: mask} : undefined}
                 data-more={edges.start && edges.end ? 'both' : edges.start ? 'start' : edges.end ? 'end' : undefined}
                 className="flex gap-1 overflow-x-auto border-b border-rule pb-2 [scrollbar-width:none] max-md:-mx-6 max-md:px-6">
                {tabs.map(tab => (
                    <button key={tab.key} type="button" id={`${id}-${tab.key}-tab`} aria-expanded={open === tab.key} aria-controls={`${id}-${tab.key}`}
                            onClick={event => {
                                onOpen(open === tab.key ? null : tab.key);
                                // a tab half seen slides into view
                                event.currentTarget.scrollIntoView?.({block: 'nearest', inline: 'nearest', behavior: 'smooth'});
                            }}
                            className="group inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[0.875rem] whitespace-nowrap text-ink-mute transition-colors duration-200 hover:text-ink aria-expanded:bg-paper-deep aria-expanded:text-ink max-md:px-2.5 max-md:text-[0.8125rem]">
                        {tab.label}
                        {/* a count in a circle of its own: it is a mark, not a word of the label */}
                        {tab.count !== undefined && (
                            // the space between is not drawn (the button lays out its parts), it is there for the name read: "Angles 2"
                            <>
                                {' '}
                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-paper-deep px-1 text-[0.6875rem] leading-none font-medium tabular-nums text-ink-mute group-aria-expanded:bg-paper group-aria-expanded:text-ink">
                                    {tab.count}
                                </span>
                            </>
                        )}
                        {tab.pending && <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-accent-ink" title="Being written"/>}
                    </button>
                ))}
            </div>
            {tabs.map(tab => open === tab.key && (
                // the section on the one other tone of the page (the user, 9.11.2026: a background around the sections, Angles, analysis...,
                // to tell them from the article's own text); what is "paper" inside it (the labels of a timeline) takes that tone too, or it
                // would show as patches
                <section key={tab.key} id={`${id}-${tab.key}`} aria-labelledby={`${id}-${tab.key}-tab`}
                         className="mt-5 scroll-mt-24 rounded-2xl bg-paper-deep px-5 py-5 [--color-paper:var(--paper-deep)]">
                    {tab.content}
                </section>
            ))}
        </div>
    );
};
