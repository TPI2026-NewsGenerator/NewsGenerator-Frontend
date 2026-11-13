//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: PositionTimeline.jsx
//  Description: Positions on a horizontal line, each at its date: the ones that matter (a first position, a reversal, a weakening) labelled on
//               lanes so none covers another, the others as dots under the line, a signal that is Uncertain as a hollow dashed marker.
//               The geometry is the one of the timeline of the affairs (features/affairs/timeline.js). Used by the view Timeline for all
//               the associations and by the sheet of one. A marker whose event has a `url` is a link to that article (it opens in another tab, a click does
//               nothing else); one without stays a plain marker, or chooses the event when the timeline has `onSelect`
//

import {useEffect, useMemo, useRef, useState} from "react";
import {axisOf, dotRows, labelLanes, LABEL_LANES, radiusOf} from "@/features/affairs/timeline.js";

const LABEL_W = 168;
const LABEL_H = 46;
const EDGE = 24;
const DOT_ROWS = 4;

// events: [{id, at, kind: 'key' | 'minor', label, title, fill, hollow, weight, url}], weight: how many articles (the size of a key marker); url: the article the
// event comes from (its marker is a link to it, the title says "Opens the article").
// opensOn: the side a line longer than its frame shows first (the end, where the latest are; the sheet of one association starts at its
// first position); lanes: how many lines of labels (the sheet of one association needs two); onSelect(event): the marker was chosen, without it the
// markers are plain
export const PositionTimeline = ({events, onSelect, label = 'Positions on a timeline', lanes: laneCount = LABEL_LANES, opensOn = 'end'}) => {
    const ref = useRef(null);
    const [width, setWidth] = useState(640);

    useEffect(() => {
        const element = ref.current;
        if (!element) return undefined;
        const measure = () => setWidth(Math.max(280, element.clientWidth - EDGE * 2));
        measure();
        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const sorted = useMemo(() => [...events].sort((a, b) => +new Date(a.at) - +new Date(b.at)), [events]);
    const axis = useMemo(() => axisOf(sorted, [], width), [sorted, width]);
    const lanes = useMemo(() => axis ? labelLanes(sorted, axis.x, {labelWidth: LABEL_W, lanes: laneCount}) : new Map(), [sorted, axis, laneCount]);
    const rows = useMemo(() => axis ? dotRows(sorted, axis.x) : new Map(), [sorted, axis]);

    // the line is as wide as its days, and as its last label needs
    const reach = axis ? sorted.reduce((far, event) => lanes.has(event.id) ? Math.max(far, EDGE + axis.x(event.at) + LABEL_W) : far, 0) : 0;
    const total = axis ? Math.max(axis.width + EDGE * 2, reach) : 0;

    // a line longer than its frame opens on its end: the latest positions are what is looked for
    useEffect(() => {
        const element = ref.current;
        if (element && element.scrollWidth > element.clientWidth) element.scrollLeft = opensOn === 'end' ? element.scrollWidth : 0;
    }, [total, opensOn]);

    if (!axis) return <p className="py-6 text-[0.9375rem] text-ink-mute">No dated position yet.</p>;

    // the heights, from the top: the labels on their lanes, the line, the dots under it, the days
    const hasKeys = sorted.some(event => event.kind === 'key');
    const AXIS_Y = (hasKeys ? laneCount * LABEL_H : 0) + 14;
    const DOTS_Y = AXIS_Y + 18;
    const TICKS_Y = DOTS_Y + Math.min(DOT_ROWS, 1 + Math.max(0, ...rows.values())) * 16 + 8;
    const HEIGHT = TICKS_Y + 26;

    return (
        <div ref={ref} role="group" aria-label={label} className="relative overflow-x-auto overscroll-x-contain pb-2">
            <div className="relative" style={{width: total, height: HEIGHT}}>
                <div aria-hidden className="absolute h-px bg-rule" style={{left: EDGE, width: axis.width, top: AXIS_Y}}/>
                {axis.ticks.map(tick => (
                    <span key={tick.x} aria-hidden className="absolute -translate-x-1/2 text-center text-[0.6875rem] leading-tight text-ink-mute tabular-nums" style={{left: EDGE + tick.x, top: TICKS_Y}}>
                        {tick.label}
                        {tick.month && <span className="block font-medium">{tick.month}</span>}
                    </span>
                ))}
                {sorted.map(event => {
                    const left = EDGE + axis.x(event.at);
                    const key = event.kind === 'key';
                    const size = key ? radiusOf(event.weight ?? 1) * 2 : 11;
                    const lane = lanes.get(event.id);
                    const top = key ? AXIS_Y - size / 2 : DOTS_Y + (rows.get(event.id) ?? 0) * 16;
                    const look = 'absolute -translate-x-1/2 rounded-full border-2 outline-offset-2 transition-transform hover:scale-125 focus-visible:scale-125';
                    const paint = {left, top, width: size, height: size, borderColor: event.fill, background: event.hollow ? 'var(--paper)' : event.fill, borderStyle: event.hollow ? 'dashed' : 'solid'};
                    const where = `${event.title ?? event.label}. Opens the article`;
                    // a click on the article opens it and does nothing else (no handler above the marker hears it)
                    const marker = event.url
                        ? (
                            <a key={event.id} href={event.url} target="_blank" rel="noopener noreferrer" title={where} aria-label={where} onClick={clicked => clicked.stopPropagation()}
                               className={look} style={{...paint, cursor: 'pointer'}}/>
                        )
                        : (
                            <button type="button" key={event.id} title={event.title} aria-label={event.title ?? event.label}
                                    onClick={onSelect ? () => onSelect(event) : undefined} tabIndex={onSelect ? 0 : -1}
                                    className={look} style={{...paint, cursor: onSelect ? 'pointer' : 'default'}}/>
                        );
                    return key && lane !== undefined ? (
                        <span key={event.id}>
                            <span aria-hidden className="absolute w-px bg-rule" style={{left, top: lane * LABEL_H + 30, height: AXIS_Y - size / 2 - (lane * LABEL_H + 30)}}/>
                            <span className="absolute text-[0.8125rem] leading-snug text-ink" style={{left: left - 4, top: lane * LABEL_H, width: LABEL_W}}>
                                <span className="line-clamp-2">{event.label}</span>
                            </span>
                            {marker}
                        </span>
                    ) : marker;
                })}
            </div>
        </div>
    );
};
