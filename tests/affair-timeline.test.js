//
//  Author: Fabian Rostello
//  Date: 04.11.2026
//  File: affair-timeline.test.js
//  Description: Where the events of an affair stand on its line: the axis, the labels on lanes, the minor events
//               stacked, the size of a marker and the bars of the coverage
//

import {describe, expect, it} from 'vitest';
import {axisOf, barsOf, dotRows, draggedTo, labelLanes, localDay, radiusOf, wheelScrolled, DAY_PX} from '@/features/affairs/timeline.js';

const event = (id, at, kind = 'key') => ({id, at, kind});
const day = (n) => `2026-10-${String(n).padStart(2, '0')}T12:00:00`;

describe('axisOf', () => {
    it('should run from the day of the first event to the day after the last, a day at least DAY_PX wide', () => {
        const axis = axisOf([event(1, day(10)), event(2, day(20))], [], 100);
        expect(axis.days).toBeGreaterThanOrEqual(11);
        expect(axis.width).toBeGreaterThanOrEqual(axis.days * DAY_PX);
        expect(axis.x(day(10))).toBeLessThan(axis.x(day(20)));
        expect(axis.x(day(10))).toBeGreaterThanOrEqual(0);
        expect(axis.x(day(20))).toBeLessThan(axis.width);
    });

    it('should take the width of its container when it is wider than the days need', () => {
        expect(axisOf([event(1, day(10)), event(2, day(11))], [], 2000).width).toBe(2000);
    });

    it('should count the days of the coverage too, and answer nothing without any date', () => {
        const axis = axisOf([event(1, day(10))], [{day: '2026-10-05', media: 3}], 0);
        expect(axis.x(day(10))).toBeGreaterThan(4 * axis.perDay);
        expect(axisOf([], [], 100)).toBeNull();
    });

    it('should tick the days no closer than 56 px, naming the month on the first tick', () => {
        const axis = axisOf([event(1, day(1)), event(2, day(30))], [], 0);
        const gaps = axis.ticks.slice(1).map((tick, i) => tick.x - axis.ticks[i].x);
        expect(Math.min(...gaps)).toBeGreaterThanOrEqual(56 - 1e-6);
        expect(axis.ticks[0].month).toBe('Oct');
    });
});

describe('labelLanes', () => {
    it('should put the labels of close events on different lanes, and leave out the one with no room', () => {
        const events = [event(1, day(10)), event(2, day(10)), event(3, day(10)), event(4, day(10))];
        const x = () => 100;
        const lanes = labelLanes(events, x);
        expect([...lanes.values()]).toEqual([0, 1, 2]);
        expect(lanes.has(4)).toBe(false);
    });

    it('should reuse a lane once the label before it is over, and label the key events only', () => {
        const events = [event(1, day(10)), event(2, day(10), 'minor'), event(3, day(20))];
        const x = (at) => at === day(10) ? 0 : 1000;
        expect([...labelLanes(events, x)]).toEqual([[1, 0], [3, 0]]);
    });
});

describe('dotRows', () => {
    it('should stack the minor events of one moment, one under the other', () => {
        const events = [event(1, day(10), 'minor'), event(2, day(10), 'minor'), event(3, day(10), 'minor'), event(4, day(20), 'minor'), event(5, day(10), 'key')];
        const rows = dotRows(events, (at) => at === day(10) ? 50 : 500);
        expect([...rows]).toEqual([[1, 0], [2, 1], [3, 2], [4, 0]]);
    });
});

describe('radiusOf', () => {
    it('should grow with the media from 5 px to 13 px', () => {
        expect(radiusOf(1)).toBe(5);
        expect(radiusOf(100)).toBe(13);
        expect(radiusOf(10)).toBeGreaterThan(radiusOf(2));
        expect(radiusOf(5000)).toBe(13);
        expect(radiusOf(0)).toBe(5);
    });
});

describe('barsOf', () => {
    it('should make the tallest day the full height and a day without media nothing', () => {
        const days = [{day: '2026-10-10', media: 10, news: 20}, {day: '2026-10-11', media: 0, news: 0}, {day: '2026-10-12', media: 5, news: 6}];
        const axis = axisOf([event(1, day(10))], days, 0);
        const bars = barsOf(days, axis, 56);
        expect(bars.map(bar => bar.height)).toEqual([56, 0, 28]);
        expect(bars[0].x).toBeLessThan(bars[2].x);
        expect(localDay('2026-10-10').getDate()).toBe(10);
    });
});

describe('wheelScrolled', () => {
    const node = (scrollLeft) => ({scrollLeft, scrollWidth: 1000, clientWidth: 400});

    it('should turn the vertical wheel into a sideways scroll, within the line', () => {
        expect(wheelScrolled({deltaX: 0, deltaY: 100}, node(0))).toBe(100);
        expect(wheelScrolled({deltaX: 0, deltaY: -50}, node(200))).toBe(150);
        expect(wheelScrolled({deltaX: 0, deltaY: 900}, node(200))).toBe(600);
    });

    it('should leave the page to scroll when the line is at its end that way, or has nothing to scroll', () => {
        expect(wheelScrolled({deltaX: 0, deltaY: -100}, node(0))).toBeNull();
        expect(wheelScrolled({deltaX: 0, deltaY: 100}, node(600))).toBeNull();
        expect(wheelScrolled({deltaX: 0, deltaY: 100}, {scrollLeft: 0, scrollWidth: 400, clientWidth: 400})).toBeNull();
    });

    it('should leave a sideways swipe to the browser, and count a wheel in lines', () => {
        expect(wheelScrolled({deltaX: 80, deltaY: 5}, node(0))).toBeNull();
        expect(wheelScrolled({deltaX: 0, deltaY: 3, deltaMode: 1}, node(0))).toBe(48);
    });
});

describe('draggedTo', () => {
    it('should move the line with the hand: dragging to the left shows what is on the right', () => {
        expect(draggedTo(100, 300, 250)).toBe(150);
        expect(draggedTo(100, 300, 340)).toBe(60);
    });
});
