//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: WorldMap.jsx
//  Description: The world map of the page "The FIFA presidency": each member association a country (a polygon) or, when it is too small
//               to be touched, a round marker, coloured by the position the news show. Hover or focus
//               tells the position and the sources behind its colour; a click or a tap opens the sheet of the association; the
//               buttons, the drag, the pinch and the keys + - 0 and the arrows zoom, pan and move from one association to the next.
//               SVG drawn with d3-geo, zoomed by d3-zoom: every colour is a variable of the theme, none is written here
//

import {Fragment, memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {select} from "d3-selection";
import {zoom as makeZoom, zoomIdentity} from "d3-zoom";
import {Minus, Plus, RotateCcw} from "lucide-react";
import {HEIGHT, HIT_R, MARKER_R, WIDTH, frameD, layoutOf, shapesOf} from "@/features/fifa/geometry.js";
import {DotPattern, HatchPattern} from "@/features/fifa/components/Patterns.jsx";
import {Swatch} from "@/features/fifa/components/Swatch.jsx";
import {DOT_COLOURS, DOT_KEYS, labelOf} from "@/features/fifa/positions.js";

const MAX_ZOOM = 24;
const STEP = 1.6;

const dateOf = (at) => at ? new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'}) : '';

// What the pointer or the key is on: the label read by a screen reader and the lines of the tooltip say the same
const ariaLabelOf = (member, described) => `${member.name}, ${member.fifa}, ${member.confederation}: ${described.label}${
    described.uncertain > 0 && described.category !== 'uncertain' ? `, ${described.uncertain} uncertain ${described.uncertain === 1 ? 'signal' : 'signals'}` : ''}`;

// The textures: the dots of a probable position and the hatch of conflicting indications, lines in the ink on the grey (see Patterns.jsx). A pattern
// of a polygon is kept at the size of the screen whatever the zoom (setScale sets its transform); a marker is already at the size of the screen
// (its own scale is a CSS one), so it has patterns of its own, left as they are
const Defs = () => (
    <defs>
        <HatchPattern id="fifa-hatch" zoom/>
        <HatchPattern id="fifa-hatch-marker"/>
        {DOT_KEYS.filter(key => key !== 'neutral').map(key => (
            <Fragment key={key}>
                <DotPattern id={`fifa-dots-${key}`} colour={DOT_COLOURS[key]} zoom/>
                <DotPattern id={`fifa-dots-marker-${key}`} colour={DOT_COLOURS[key]}/>
            </Fragment>
        ))}
    </defs>
);

// the fill of a marker: the pattern made for a marker
const markerFill = (fill) => fill.replace('#fifa-dots-', '#fifa-dots-marker-').replace('#fifa-hatch', '#fifa-hatch-marker');

// the polygons and the markers: memoised, so the pointer moving over them draws nothing again (only the tooltip changes)
const Shapes = memo(({layout, other, rows, tabStop, selected}) => (
    <>
        <path d={other} className="fifa-land" aria-hidden/>
        {layout.land.map(land => <path key={land.id} d={land.d} className="fifa-land" aria-hidden/>)}
        <g>
            {layout.polygons.map(({member, d}) => {
                const row = rows.get(member.qid);
                return (
                    <path key={member.qid} d={d} role="button" data-qid={member.qid} data-kind={row.described.category} data-ring={row.described.ring ? 'true' : undefined}
                          tabIndex={row.visible && member.qid === tabStop ? 0 : -1}
                          aria-label={ariaLabelOf(member, row.described)} aria-hidden={row.visible ? undefined : true}
                          className="fifa-shape" data-dim={row.visible ? undefined : 'true'} data-stale={row.described.stale ? 'true' : undefined}
                          data-pattern={row.described.fill.startsWith('url(') ? row.described.fill.slice(5, -1) : undefined}
                          style={{fill: row.described.fill}}/>
                );
            })}
        </g>
        <g>
            {layout.markers.map(({member, x, y}) => {
                const row = rows.get(member.qid);
                return (
                    <g key={member.qid} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
                        <g className="fifa-marker" role="button" data-qid={member.qid} data-kind={row.described.category} data-marker="true" data-selected={member.qid === selected ? 'true' : undefined} data-stale={row.described.stale ? 'true' : undefined}
                           data-pattern={row.described.fill.startsWith('url(') ? markerFill(row.described.fill).slice(5, -1) : undefined}
                           tabIndex={row.visible && member.qid === tabStop ? 0 : -1}
                           aria-label={ariaLabelOf(member, row.described)} aria-hidden={row.visible ? undefined : true}
                           data-dim={row.visible ? undefined : 'true'}>
                            {/* the touch: 26 px across, whatever the zoom or the width of the map */}
                            <circle r={HIT_R} className="fifa-hit"/>
                            <g className="fifa-pip">
                                {row.described.ring && <circle r={MARKER_R + 3.5} className="fifa-ring"/>}
                                <circle r={MARKER_R} className="fifa-dot" style={{fill: markerFill(row.described.fill)}}/>
                            </g>
                        </g>
                    </g>
                );
            })}
        </g>
    </>
));
Shapes.displayName = 'Shapes';

const Tip = ({member, described, where}) => {
    const known = described.readings.filter(reading => reading.side !== 'unknown' || reading.human || (reading.entry.uncertain_count ?? 0) > 0);
    const sources = described.candidates.flatMap(reading => (reading.entry.basis ?? []).map(source => ({...source, subject: reading.name}))).slice(0, 3);
    return (
        <div role="tooltip" style={{left: where.x, top: where.y}}
             className="raised pointer-events-none absolute z-20 w-64 rounded-2xl bg-paper p-4 text-[0.8125rem] leading-snug shadow-[0_12px_40px_rgba(0,0,0,0.18)] ring-1 ring-rule/60 dark:ring-rule">
            <p className="text-[0.9375rem] font-semibold text-ink">{member.name} <span className="font-normal text-ink-mute">{member.fifa} · {member.confederation}</span></p>
            <p className="mt-1.5 flex items-start gap-2 text-ink">
                <Swatch fill={described.fill} ring={described.ring} className="mt-[0.3em]"/>
                <span>{described.label}</span>
            </p>
            {known.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-ink-mute">
                    {known.map(reading => (
                        <li key={reading.subject}>
                            <span className="text-ink">{reading.name}</span>
                            {(reading.side !== 'unknown' || reading.human) && `: ${labelOf(reading.position).toLowerCase()}`}
                            {reading.human && ` · set by ${reading.human.by}, ${dateOf(reading.human.at)} (the news: ${labelOf(reading.aiPosition).toLowerCase()})`}
                            {reading.promoted && ` · confirmed by a reader (the news: ${labelOf(reading.aiPosition).toLowerCase()})`}
                            {reading.human?.newer_evidence && ' · new evidence since the vote'}
                            {reading.entry.stale && !reading.human && ' · older than 90 days'}
                            {reading.entry.changed && reading.entry.since && ` · changed ${dateOf(reading.entry.since)}`}
                            {(reading.entry.uncertain_count ?? 0) > 0 && !reading.human && ` · ${reading.entry.uncertain_count} uncertain`}
                        </li>
                    ))}
                </ul>
            )}
            {sources.length > 0 && (
                <p className="mt-2 text-ink-mute">
                    <span className="text-ink">Sources: </span>
                    {sources.map(source => `${source.medium}, ${dateOf(source.published_at)}`).join(' · ')}
                </p>
            )}
            <p className="mt-2 text-ink-mute">{described.coverage.articles} {described.coverage.articles === 1 ? 'article' : 'articles'} · {described.coverage.media} {described.coverage.media === 1 ? 'medium' : 'media'} in 30 days</p>
            <p className="mt-2 text-ink-mute">Select for the sheet</p>
        </div>
    );
};

// rows: Map qid -> {member, described, visible}, one per association; selected: the qid whose sheet is open; onSelect(qid)
export const WorldMap = ({topology, rows, selected, onSelect}) => {
    const frame = useRef(null);
    const svg = useRef(null);
    const viewport = useRef(null);
    const zoomer = useRef(null);
    const transform = useRef(zoomIdentity);
    const [tip, setTip] = useState(null);
    const [focused, setFocused] = useState(null);
    const [tabStop, setTabStop] = useState(null);
    const [k, setK] = useState(1);

    const shapes = useMemo(() => shapesOf(topology), [topology]);
    const members = useMemo(() => [...rows.values()].map(row => row.member), [rows]);
    const layout = useMemo(() => layoutOf(members, shapes), [members, shapes]);
    const places = useMemo(() => new Map([...layout.polygons, ...layout.markers].map(place => [place.member.qid, place])), [layout]);
    const pathOf = useMemo(() => new Map(layout.polygons.map(place => [place.member.qid, place.d])), [layout]);

    // the one association the Tab key reaches: the open sheet's, else the first visible one
    const firstVisible = useMemo(() => [...places.keys()].find(qid => rows.get(qid)?.visible) ?? null, [places, rows]);
    const stop = tabStop && rows.get(tabStop)?.visible ? tabStop : (selected && rows.get(selected)?.visible ? selected : firstVisible);

    // the scale of the screen: a marker keeps its size in pixels, whatever the zoom and the width of the map
    const setScale = useCallback((scale) => {
        const width = frame.current?.clientWidth || WIDTH;
        frame.current?.style.setProperty('--s', String(scale * (width / WIDTH)));
        // on a phone the map is small and the markers many: the dots are drawn smaller, the touch circle is not
        frame.current?.style.setProperty('--m', width < 520 ? '0.62' : '1');
        // the textures of the polygons stay the size they have on the screen (a tile of 6 px, 5 px on a phone), the map being zoomed or not
        const tile = (width < 520 ? 0.85 : 1) / (scale * (width / WIDTH));
        svg.current?.querySelectorAll('pattern[data-zoom]').forEach(pattern => {
            pattern.setAttribute('patternTransform', `${pattern.dataset.zoom === 'hatch' ? 'rotate(45) ' : ''}scale(${tile.toFixed(4)})`);
        });
    }, []);

    useEffect(() => {
        const element = svg.current;
        if (!element) return undefined;
        const zoom = makeZoom()
            .scaleExtent([1, MAX_ZOOM])
            .extent([[0, 0], [WIDTH, HEIGHT]])
            .translateExtent([[0, 0], [WIDTH, HEIGHT]])
            .clickDistance(4)
            // the wheel scrolls the page; it zooms with Ctrl or Cmd (which is also how a trackpad pinches). One finger scrolls the
            // page until the map is zoomed in
            .filter(event => {
                if (event.type === 'wheel') return event.ctrlKey || event.metaKey;
                if (event.type.startsWith('touch')) return event.touches?.length >= 2 || transform.current.k > 1;
                return !event.button && !event.ctrlKey;
            })
            .on('zoom', event => {
                transform.current = event.transform;
                viewport.current?.setAttribute('transform', event.transform.toString());
                setScale(event.transform.k);
                const zoomed = event.transform.k > 1;
                if (frame.current) frame.current.dataset.zoomed = String(zoomed);
                setK(event.transform.k);
            });
        zoomer.current = zoom;
        select(element).call(zoom).on('dblclick.zoom', null);
        setScale(1);
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => setScale(transform.current.k));
        observer?.observe(frame.current);
        return () => {
            select(element).on('.zoom', null);
            observer?.disconnect();
        };
    }, [setScale]);

    const animate = useCallback((apply) => {
        const target = select(svg.current);
        const quiet = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        apply(quiet ? target : target.transition().duration(250));
    }, []);
    const zoomBy = (factor) => animate(target => target.call(zoomer.current.scaleBy, factor));
    const reset = () => animate(target => target.call(zoomer.current.transform, zoomIdentity));

    // the tooltip follows the pointer, inside the frame
    const place = (event, qid) => {
        const box = frame.current.getBoundingClientRect();
        const width = 256;
        setTip({qid, x: Math.max(8, Math.min(event.clientX - box.left + 14, box.width - width - 8)), y: Math.max(8, event.clientY - box.top + 16)});
    };
    const quidOf = (event) => event.target.closest?.('[data-qid]')?.dataset.qid ?? null;

    const onPointerMove = (event) => {
        if (event.pointerType === 'touch') return;
        const qid = quidOf(event);
        if (!qid) return tip && setTip(null);
        place(event, qid);
    };
    const onFocus = (event) => {
        const qid = quidOf(event);
        if (!qid) return;
        setFocused(qid);
        setTabStop(qid);
        // a keyboard moves to an association out of view: the map follows it
        const at = places.get(qid);
        if (at && transform.current.k > 1) {
            const [x, y] = transform.current.apply([at.x, at.y]);
            if (x < 40 || y < 40 || x > WIDTH - 40 || y > HEIGHT - 40) select(svg.current).call(zoomer.current.translateTo, at.x, at.y);
        }
        const around = event.target.closest('[data-qid]').getBoundingClientRect();
        place({clientX: around.left + around.width / 2, clientY: around.bottom}, qid);
    };
    const onBlur = () => { setFocused(null); setTip(null); };

    const onClick = (event) => {
        const qid = quidOf(event);
        if (qid) onSelect(qid);
    };

    // the keys: Enter or Space opens, the arrows go to the nearest association that way (Shift + arrow pans), + - 0 zoom
    const onKeyDown = (event) => {
        const qid = quidOf(event);
        if (event.key === '+' || event.key === '=') { event.preventDefault(); return zoomBy(STEP); }
        if (event.key === '-' || event.key === '_') { event.preventDefault(); return zoomBy(1 / STEP); }
        if (event.key === '0') { event.preventDefault(); return reset(); }
        if (!qid) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            return onSelect(qid);
        }
        const direction = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[event.key];
        if (!direction) return;
        event.preventDefault();
        if (event.shiftKey) {
            return select(svg.current).call(zoomer.current.translateBy, (-direction[0] * 90) / transform.current.k, (-direction[1] * 90) / transform.current.k);
        }
        const from = places.get(qid);
        let best = null;
        for (const [other, at] of places) {
            if (other === qid || !rows.get(other)?.visible) continue;
            const dx = at.x - from.x;
            const dy = at.y - from.y;
            const along = dx * direction[0] + dy * direction[1];
            if (along <= 0) continue;
            const across = Math.abs(dx * direction[1] - dy * direction[0]);
            const score = along + across * 2;
            if (!best || score < best.score) best = {qid: other, score};
        }
        if (best) [...svg.current.querySelectorAll('[data-qid]')].find(element => element.dataset.qid === best.qid)?.focus();
    };

    const tipRow = tip ? rows.get(tip.qid) : null;
    const lit = focused ?? tip?.qid ?? null;

    return (
        <div ref={frame} className="fifa-map relative select-none" data-zoomed="false">
            <svg ref={svg} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label={`Map of the ${rows.size} FIFA member associations`}
                 className="block h-auto w-full"
                 onPointerMove={onPointerMove} onPointerLeave={() => setTip(null)} onClick={onClick} onKeyDown={onKeyDown} onFocus={onFocus} onBlur={onBlur}>
                <Defs/>
                {/* the whole frame takes the drag, also where there is sea */}
                <path d={frameD} className="fifa-sea"/>
                <g ref={viewport}>
                    <Shapes layout={layout} other={shapes.other} rows={rows} tabStop={stop} selected={selected}/>
                    {/* the association under the pointer or the key, and the one whose sheet is open, outlined above the others */}
                    {selected && pathOf.has(selected) && <path d={pathOf.get(selected)} className="fifa-outline" data-state="selected"/>}
                    {lit && pathOf.has(lit) && <path d={pathOf.get(lit)} className="fifa-outline" data-state={focused ? 'focus' : 'hover'}/>}
                </g>
            </svg>
            {/* over the map from a tablet up; under it on a phone, where they would cover a third of it */}
            <div className="mt-2 flex gap-2 md:pointer-events-none md:absolute md:top-2 md:right-2 md:mt-0 md:flex-col md:gap-1.5">
                <button type="button" aria-label="Zoom in" onClick={() => zoomBy(STEP)} disabled={k >= MAX_ZOOM}
                        className="pointer-events-auto inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-rule bg-paper/90 text-ink backdrop-blur transition-colors hover:bg-paper-deep disabled:cursor-default disabled:opacity-40">
                    <Plus aria-hidden className="size-4"/>
                </button>
                <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / STEP)} disabled={k <= 1}
                        className="pointer-events-auto inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-rule bg-paper/90 text-ink backdrop-blur transition-colors hover:bg-paper-deep disabled:cursor-default disabled:opacity-40">
                    <Minus aria-hidden className="size-4"/>
                </button>
                <button type="button" aria-label="Reset the zoom" onClick={reset} disabled={k <= 1}
                        className="pointer-events-auto inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-rule bg-paper/90 text-ink backdrop-blur transition-colors hover:bg-paper-deep disabled:cursor-default disabled:opacity-40">
                    <RotateCcw aria-hidden className="size-4"/>
                </button>
            </div>
            {tip && tipRow && <Tip member={tipRow.member} described={tipRow.described} where={tip}/>}
            <p className="caption mt-1">Drag to pan · Ctrl + scroll or pinch to zoom · Arrow keys move between associations · Borders are indicative</p>
        </div>
    );
};

