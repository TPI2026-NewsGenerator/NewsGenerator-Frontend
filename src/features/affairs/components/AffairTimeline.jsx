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
import {axisOf, barsOf, dotRows, labelLanes, LABEL_LANES, LABEL_PX, radiusOf} from "@/features/affairs/timeline.js";

// the heights of the line, from the top: the labels on their lanes, the line, the minor events under it, the days,
// the bars of the coverage
const LABEL_H = 54;
const AXIS_Y = LABEL_LANES * LABEL_H + 18;
const DOTS_Y = AXIS_Y + 16;
const TICKS_Y = AXIS_Y + 68;
const BARS_Y = TICKS_Y + 26;
const BAR_MAX = 56;
const HEIGHT = BARS_Y + BAR_MAX + 4;

const dateOf = (at) => new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});
const timeOf = (at) => new Date(at).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
const MEDIA_SHOWN = 6;

// what the articles of an event say of it: the words of the media, never a verdict (see hedging.js, statements.js and
// contested.js on the server)
const MARKS = {
    reported: {label: 'Reported', means: (event) => `The articles that tell it say they have no confirmation (“${event.reported}”). It says how they present it, not whether it is true.`},
    official: {label: 'Official', means: () => 'A party this event is about announced it itself, in a statement or a release one of the articles reports.'},
    denial: {label: 'Contested', means: () => 'One of the articles reports that someone named denies it. Nobody is said to be right.'},
};
const marksOf = (event) => Object.keys(MARKS).filter(mark => event[mark]);

const Marks = ({event, className}) => marksOf(event).map(mark => (
    <Meta key={mark} tone="accent" className={className} title={MARKS[mark].means(event)}>{MARKS[mark].label}</Meta>
));

// the title in the language of the reader, the original on demand, as the other angles of a card are
const EventTitle = ({event, className}) => {
    const [original, setOriginal] = useState(false);
    return (
        <>
            <a href={event.url} target="_blank" rel="noreferrer" className={cn('body-text font-semibold underline-offset-2 hover:underline', className)}>
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
    <div className="mt-4 rounded-2xl bg-paper-deep px-5 py-4">
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

// every event in time order, the key ones in bold
const EventList = ({events}) => (
    <ol className="mt-4 list-none divide-y divide-rule p-0">
        {events.map(event => (
            <li key={event.id} className="grid grid-cols-[4.5rem_1fr] gap-x-3 py-2.5">
                <time dateTime={event.at} className="caption pt-0.5">{dateOf(event.at)}</time>
                <div>
                    <EventTitle event={event} className={event.kind === 'key' ? '' : '!font-normal'}/>
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
    const [listed, setListed] = useState(false);

    // the line fills its place when the affair is short, and is read by scrolling when it is long
    useEffect(() => {
        const node = scroller.current;
        if (!node) return undefined;
        const measure = () => setWidth(node.clientWidth);
        measure();
        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

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
                 className="overflow-x-auto rounded-xl pb-2 focus-visible:outline-2 focus-visible:outline-action">
                <div className="relative" style={{width: axis.width, height: HEIGHT}}>
                    {/* the stems first, then the labels of the key events over them, each on a lane */}
                    {events.filter(event => lanes.has(event.id)).map(event => {
                        const top = (LABEL_LANES - 1 - lanes.get(event.id)) * LABEL_H;
                        return <span key={`stem-${event.id}`} aria-hidden className="absolute w-px bg-rule" style={{left: axis.x(event.at), top: top + 8, height: AXIS_Y - top - 8}}/>;
                    })}
                    {events.filter(event => lanes.has(event.id)).map(event => {
                        const top = (LABEL_LANES - 1 - lanes.get(event.id)) * LABEL_H;
                        return (
                            <button key={`label-${event.id}`} type="button" onClick={() => setSelected(event.id)}
                                    style={{left: axis.x(event.at), top, width: LABEL_PX, height: LABEL_H - 8}}
                                    className="absolute cursor-pointer overflow-hidden bg-paper pl-1.5 text-left hover:text-action-text">
                                <span className="caption block leading-tight">{dateOf(event.at)}</span>
                                <span className="line-clamp-2 block text-[0.8125rem] leading-tight">{event.titleTranslation ?? event.title}</span>
                            </button>
                        );
                    })}

                    <span aria-hidden className="absolute h-px bg-rule" style={{top: AXIS_Y, left: 0, width: axis.width}}/>

                    {events.map(event => {
                        const key = event.kind === 'key';
                        const radius = key ? radiusOf(event.media.length) : 4;
                        const y = key ? AXIS_Y : DOTS_Y + rows.get(event.id) * 11;
                        return (
                            <button key={event.id} type="button" onClick={() => setSelected(selected === event.id ? null : event.id)}
                                    aria-pressed={selected === event.id}
                                    aria-label={`${dateOf(event.at)}: ${event.titleTranslation ?? event.title}, ${toldBy(event)}`}
                                    title={`${dateOf(event.at)} · ${(event.titleTranslation ?? event.title).slice(0, 90)}`}
                                    style={{left: axis.x(event.at) - radius, top: y - radius, width: radius * 2, height: radius * 2}}
                                    className={cn('absolute cursor-pointer rounded-full border transition-shadow',
                                        key ? 'border-action bg-action/85' : 'border-ink-mute bg-paper',
                                        event.reported && 'border-dashed !bg-paper',
                                        selected === event.id && 'ring-2 ring-action ring-offset-1 ring-offset-paper')}/>
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
                <span>Big marker: told by many media · hollow: other event · dashed: reported · grey bars: media writing each day</span>
                <InfoTip label="The line">
                    Each event is a fact told by one or several media, in any language, at the date of its first news. A key event brings something new and is told
                    by two media or more, or announced or denied by a party. The AI chose the events; the dates, the media and the marks are counted from the news.
                </InfoTip>
            </p>

            {chosen && <Detail event={chosen}/>}

            <button type="button" onClick={() => setListed(!listed)} aria-expanded={listed}
                    className="mt-4 cursor-pointer text-[0.875rem] text-action-text hover:underline underline-offset-4">
                {listed ? 'Hide the list' : `Read all ${events.length} events as a list`}
            </button>
            {listed && <EventList events={events}/>}
        </div>
    );
};
