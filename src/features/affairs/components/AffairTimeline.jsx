//
//  Author: Fabian Rostello
//  Date: 04.11.2026
//  File: AffairTimeline.jsx
//  Description: The events of an affair on a horizontal line, each at its date, the key ones labelled, the size of
//               a marker the media that told it, and under the line the media that wrote on each day. Every
//               event is also in a list
//

import {useEffect, useRef, useState} from "react";
import {InfoTip} from "@/components/ui/info-tip.jsx";
import {Meta, MetaLine} from "@/components/ui/text.jsx";
import {cn} from "@/lib/utils.js";
import {languageLabel} from "@/features/briefing/profileWords.js";
import {axisOf, barsOf, dotRows, draggedTo, DRAG_PX, labelLanes, LABEL_LANES, LABEL_PX, radiusOf, wheelScrolled} from "@/features/affairs/timeline.js";

// the heights of the line, from the top: the labels on their lanes, the line, the minor events under it, the days,
// the bars of the coverage
const LABEL_H = 58;
const AXIS_Y = LABEL_LANES * LABEL_H + 18;
const DOTS_Y = AXIS_Y + 16;
const TICKS_Y = AXIS_Y + 68;
const BARS_Y = TICKS_Y + 26;
const BAR_MAX = 56;
// the margin on each side of the line (px-6): the date of the first day is centred under it and half of it is out of the line
const EDGE = 24;
const HEIGHT = BARS_Y + BAR_MAX + 4;

const dateOf = (at) => new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});
const timeOf = (at) => new Date(at).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
const MEDIA_SHOWN = 6;

// what the articles of an event say of it: the words of the media, never a verdict (see hedging.js, statements.js and
// contested.js on the server)
const MARKS = {
    reported: {label: 'Unverified', tone: 'accent', means: (event) => `The articles, taken together, tell it as unconfirmed (“${event.reported}”). It says how they present it, not whether it is true.`},
    official: {label: 'Official', tone: 'official', means: () => 'A party this event is about issued a statement or a communiqué itself (or announced a decision), and one of the articles reports it.'},
    denial: {label: 'Contested', tone: 'accent', means: () => 'One of the articles reports that someone named disputes it: a denial, a rejection or a formal challenge such as an appeal. Nobody is said to be right.'},
};
// the colour of a marker when its event is denied (orange, as "Contested" everywhere) or announced by a party (green, as "Official source"):
// filled, small ones too. Both at once, the denial: it is what the reader is to be warned of (the user, 05.11.2026)
const MARKER_TONES = {
    denial: {look: 'border-accent-ink bg-accent-ink/85', ring: 'ring-accent-ink', hover: 'ring-accent-ink/55'},
    official: {look: 'border-official bg-official/85', ring: 'ring-official', hover: 'ring-official/55'},
};
const toneOfMarker = (event) => event.denial ? MARKER_TONES.denial : event.official ? MARKER_TONES.official : null;
const marksOf = (event) => Object.keys(MARKS).filter(mark => event[mark]);

const Marks = ({event, className}) => marksOf(event).map(mark => (
    <Meta key={mark} tone={MARKS[mark].tone} className={className} title={MARKS[mark].means(event)}>{MARKS[mark].label}</Meta>
));

// the title in the language of the reader, the original on demand, as the other angles of a card are
const EventTitle = ({event, className}) => {
    const [original, setOriginal] = useState(false);
    return (
        <>
            <a href={event.url} target="_blank" rel="noreferrer" className={cn('panel-text panel-link', className)}>
                {event.titleTranslation ?? event.title}
            </a>
            {event.titleTranslation && (
                <p className="caption mt-1 flex flex-wrap items-baseline gap-x-3">
                    <span>Machine translation from {languageLabel(event.language)}</span>
                    <button type="button" onClick={() => setOriginal(!original)} aria-expanded={original}
                            className="cursor-pointer text-action-text hover:underline underline-offset-4">
                        {original ? 'Hide original' : 'Show original'}
                    </button>
                </p>
            )}
            {original && <p lang={event.language} className="caption mt-1 italic">“{event.title}”</p>}
        </>
    );
};

const toldBy = (event) => {
    const media = event.media.length;
    return media === 1 ? 'told by one medium' : `told by ${media} media${event.languages.length > 1 ? ` in ${event.languages.length} languages` : ''}`;
};

// the event chosen on the line: when, what the articles say of it, who told it
const Detail = ({event}) => (
    <div className="mt-4 border-l border-rule pl-5">
        <MetaLine>
            <Meta tone="ink"><time dateTime={event.at}>{timeOf(event.at)}</time></Meta>
            <Meta>{event.kind === 'key' ? 'Key event' : 'Event'}</Meta>
            <Marks event={event}/>
        </MetaLine>
        <div className="mt-1.5 max-w-[66ch]"><EventTitle event={event}/></div>
        <p className="caption mt-2">
            {event.medium} · {toldBy(event)}
            {event.media.length > 1 && <> — {event.media.slice(0, MEDIA_SHOWN).join(', ')}{event.media.length > MEDIA_SHOWN && `, and ${event.media.length - MEDIA_SHOWN} more`}</>}
        </p>
    </div>
);

// every event in time order, the key ones in medium weight
const EventList = ({events}) => (
    <ol className="mt-4 list-none divide-y divide-rule p-0">
        {events.map(event => (
            <li key={event.id} className="grid grid-cols-[4.5rem_1fr] gap-x-3 py-2.5">
                <time dateTime={event.at} className="caption pt-0.5">{dateOf(event.at)}</time>
                <div>
                    <EventTitle event={event} className={event.kind === 'key' ? 'font-medium' : ''}/>
                    <MetaLine className="mt-0.5">
                        <Meta>{toldBy(event)}</Meta>
                        <Marks event={event}/>
                    </MetaLine>
                </div>
            </li>
        ))}
    </ol>
);

// events: see the server's eventsOf; coverage: see coverageOf (its days are the bars)
export const AffairTimeline = ({events, coverage}) => {
    const scroller = useRef(null);
    const [width, setWidth] = useState(0);
    const [selected, setSelected] = useState(null);
    // the event the mouse or the focus is on: its marker and its label light up together (the user, 05.11.2026)
    const [hovered, setHovered] = useState(null);
    const [listed, setListed] = useState(false);

    const [dragging, setDragging] = useState(false);
    // a drag in progress ({x, left, moved}), and whether the click that ends one is to be swallowed
    const drag = useRef(null);
    const swallow = useRef(false);

    // the line fills its place when the affair is short, and is read by scrolling when it is long; the margins on its sides
    // (EDGE) hold the first date, centred under the first day, which was cut by the edge
    useEffect(() => {
        const node = scroller.current;
        if (!node) return undefined;
        const measure = () => setWidth(Math.max(0, node.clientWidth - 2 * EDGE));
        measure();
        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    // the wheel of a mouse over the line moves it sideways (the page scrolls at its ends): React listens to the wheel as a passive
    // event, which cannot be cancelled, so it is listened to here
    useEffect(() => {
        const node = scroller.current;
        if (!node) return undefined;
        const onWheel = (event) => {
            if (event.ctrlKey) return;
            const left = wheelScrolled(event, node);
            if (left === null) return;
            event.preventDefault();
            node.scrollLeft = left;
        };
        node.addEventListener('wheel', onWheel, {passive: false});
        return () => node.removeEventListener('wheel', onWheel);
    }, []);

    // the mouse drags the line, as a finger does on a phone; a drag is no click on a marker
    const startDrag = (event) => {
        const node = scroller.current;
        if (event.pointerType !== 'mouse' || event.button !== 0 || node.scrollWidth <= node.clientWidth) return;
        drag.current = {x: event.clientX, left: node.scrollLeft, moved: false};
        const move = (next) => {
            const now = drag.current;
            if (!now || (!now.moved && Math.abs(next.clientX - now.x) < DRAG_PX)) return;
            now.moved = true;
            setDragging(true);
            node.scrollLeft = draggedTo(now.left, now.x, next.clientX);
        };
        const end = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
            if (drag.current?.moved) {
                swallow.current = true;
                setTimeout(() => { swallow.current = false; }, 0);
            }
            drag.current = null;
            setDragging(false);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
    };
    const lights = (id) => ({
        onMouseEnter: () => setHovered(id), onMouseLeave: () => setHovered(null),
        onFocus: () => setHovered(id), onBlur: () => setHovered(null),
    });
    const swallowClick = (event) => {
        if (!swallow.current) return;
        event.stopPropagation();
        event.preventDefault();
        swallow.current = false;
    };

    const axis = axisOf(events, coverage?.days ?? [], width);
    if (!axis) return null;
    const lanes = labelLanes(events, axis.x);
    const rows = dotRows(events, axis.x);
    const bars = barsOf(coverage?.days ?? [], axis, BAR_MAX);
    const chosen = events.find(event => event.id === selected) ?? null;
    const keys = events.filter(event => event.kind === 'key').length;

    return (
        <div className="mt-6">
            <div ref={scroller} tabIndex={0} aria-label="The events of the affair on a line, scroll sideways to read it"
                 onPointerDown={startDrag} onClickCapture={swallowClick}
                 className={cn('overflow-x-auto rounded-xl px-6 pb-2 select-none focus-visible:outline-2 focus-visible:outline-action',
                     dragging ? 'cursor-grabbing' : 'cursor-grab')}>
                <div className="relative" style={{width: axis.width, height: HEIGHT}}>
                    {/* the stems first, then the labels of the key events over them, each on a lane */}
                    {events.filter(event => lanes.has(event.id)).map(event => {
                        const top = (LABEL_LANES - 1 - lanes.get(event.id)) * LABEL_H;
                        return <span key={`stem-${event.id}`} aria-hidden className="absolute w-px bg-rule" style={{left: axis.x(event.at), top: top + 8, height: AXIS_Y - top - 8}}/>;
                    })}
                    {events.filter(event => lanes.has(event.id)).map(event => {
                        const top = (LABEL_LANES - 1 - lanes.get(event.id)) * LABEL_H;
                        return (
                            <button key={`label-${event.id}`} type="button" onClick={() => setSelected(event.id)} {...lights(event.id)}
                                    style={{left: axis.x(event.at), top, width: LABEL_PX, height: LABEL_H - 5}}
                                    className={cn('absolute cursor-pointer overflow-hidden rounded-md px-1.5 py-0.5 text-left transition-colors',
                                        hovered === event.id ? 'bg-paper-deep text-action-text' : 'bg-paper')}>
                                <span className="caption block leading-tight">{dateOf(event.at)}</span>
                                {/* no "block" here: line-clamp is a box of its own, "block" took the "…" away and cut the title in the middle of a line */}
                                <span className="line-clamp-2 text-[0.8125rem] leading-tight">{event.titleTranslation ?? event.title}</span>
                            </button>
                        );
                    })}

                    <span aria-hidden className="absolute h-px bg-rule" style={{top: AXIS_Y, left: 0, width: axis.width}}/>

                    {events.map(event => {
                        const key = event.kind === 'key';
                        const radius = key ? radiusOf(event.media.length) : 4;
                        const tone = toneOfMarker(event);
                        const y = key ? AXIS_Y : DOTS_Y + rows.get(event.id) * 11;
                        return (
                            <button key={event.id} type="button" onClick={() => setSelected(selected === event.id ? null : event.id)} {...lights(event.id)}
                                    aria-pressed={selected === event.id}
                                    aria-label={`${dateOf(event.at)}: ${event.titleTranslation ?? event.title}, ${toldBy(event)}`}
                                    title={`${dateOf(event.at)} · ${(event.titleTranslation ?? event.title).slice(0, 90)}`}
                                    style={{left: axis.x(event.at) - radius, top: y - radius, width: radius * 2, height: radius * 2}}
                                    className={cn('absolute cursor-pointer rounded-full border transition-shadow',
                                        tone ? tone.look : key ? 'border-action bg-action/85' : 'border-ink-mute bg-paper',
                                        event.reported && 'border-dashed !bg-paper',
                                        selected === event.id ? `ring-2 ${tone?.ring ?? 'ring-action'} ring-offset-1 ring-offset-paper` : hovered === event.id && `ring-2 ${tone?.hover ?? 'ring-action/55'}`)}/>
                        );
                    })}

                    {axis.ticks.map(tick => (
                        <span key={tick.x} aria-hidden className="caption absolute -translate-x-1/2 text-center leading-tight" style={{left: tick.x + 1, top: TICKS_Y}}>
                            {tick.label}
                            {tick.month && <span className="block text-ink-mute/70">{tick.month}</span>}
                        </span>
                    ))}

                    {bars.map(bar => (
                        <span key={bar.day} className="absolute rounded-t-sm bg-ink-mute/35"
                              title={`${bar.day}: ${bar.media} media, ${bar.news} news`}
                              style={{left: bar.x, width: bar.width, height: bar.height, top: BARS_Y + BAR_MAX - bar.height}}/>
                    ))}
                </div>
            </div>

            <p className="caption mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span>{events.length} events, {keys} key. Click one to read it.</span>
                <span>
                    Big marker: told by many media · hollow: other event · dashed: unverified ·{' '}
                    <span className="text-accent-ink">orange: contested</span> · <span className="text-official">green: official</span> · grey bars: media writing each day
                </span>
                <InfoTip label="The line">
                    Each event is a fact told by one or several media, in any language, at the date of its first news. A key event brings something new and is told
                    by two media or more, or announced or denied by a party. The AI chose the events and read their marks (official, contested, reported) in their news; the dates and the media are counted.
                </InfoTip>
            </p>

            {chosen && <Detail event={chosen}/>}

            <button type="button" onClick={() => setListed(!listed)} aria-expanded={listed}
                    className="mt-4 cursor-pointer text-[0.8125rem] text-action-text hover:underline underline-offset-4">
                {listed ? 'Hide the list' : `Read all ${events.length} events as a list`}
            </button>
            {listed && <EventList events={events}/>}
        </div>
    );
};
