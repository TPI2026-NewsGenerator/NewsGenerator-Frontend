//
//  Author: Fabian Rostello
//  Date: 25.09.2026
//  File: seen-cards.test.jsx
//  Description: A card counts as seen once it stayed on the screen, and only then
//

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render} from '@testing-library/react';
import {useSeenCards} from '@/features/briefing/useSeenCards.js';
import {BriefingApi} from '@/features/briefing/api/briefingApi.js';

// the browser tells which elements are on the screen; here the test does
let observed;
class FakeObserver {
    constructor(callback) { this.callback = callback; this.elements = new Set(); observed = this; }
    observe(element) { this.elements.add(element); }
    unobserve(element) { this.elements.delete(element); }
    disconnect() { this.elements.clear(); }
    show(element, ratio) { this.callback([{target: element, isIntersecting: ratio > 0, intersectionRatio: ratio}]); }
}

const Cards = ({briefing}) => {
    const observe = useSeenCards(briefing, 'token');
    return briefing.items.map(item => <div key={item.storyId} data-id={item.storyId} ref={observe(item.storyId)}/>);
};

const briefing = {id: 7, status: 'ready', items: [{storyId: 1, seenAt: null}, {storyId: 2, seenAt: null}, {storyId: 3, seenAt: '2026-09-25T10:00:00Z'}]};

describe('useSeenCards', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('IntersectionObserver', FakeObserver);
        vi.spyOn(BriefingApi, 'markSeen').mockResolvedValue();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('should send a card that stayed half on the screen for 2 seconds, not one scrolled past', () => {
        const {container} = render(<Cards briefing={briefing}/>);
        const card = (id) => container.querySelector(`[data-id="${id}"]`);

        act(() => {
            observed.show(card(1), 0.8);
            observed.show(card(2), 0.8);
        });
        act(() => { vi.advanceTimersByTime(1000); });
        act(() => { observed.show(card(2), 0); });           // scrolled past after one second
        act(() => { vi.advanceTimersByTime(3000); });

        expect(BriefingApi.markSeen).toHaveBeenCalledTimes(1);
        expect(BriefingApi.markSeen).toHaveBeenCalledWith(7, [1], 'token', {keepalive: false});
    });

    it('should not send a card seen before, nor one barely on the screen', () => {
        const {container} = render(<Cards briefing={briefing}/>);
        act(() => {
            observed.show(container.querySelector('[data-id="3"]'), 1);
            observed.show(container.querySelector('[data-id="1"]'), 0.2);
        });
        act(() => { vi.advanceTimersByTime(6000); });
        expect(BriefingApi.markSeen).not.toHaveBeenCalled();
    });

    it('should send what was seen at once when the page closes', () => {
        const {container, unmount} = render(<Cards briefing={briefing}/>);
        act(() => { observed.show(container.querySelector('[data-id="2"]'), 1); });
        act(() => { vi.advanceTimersByTime(2100); });        // seen, the next sending not come yet
        unmount();
        expect(BriefingApi.markSeen).toHaveBeenCalledWith(7, [2], 'token', {keepalive: true});
    });
});

describe('useSeenCards and a hidden page', () => {
    let visibility = 'visible';
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('IntersectionObserver', FakeObserver);
        vi.spyOn(BriefingApi, 'markSeen').mockResolvedValue();
        vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('should count the time on the screen only while the page is shown', () => {
        visibility = 'hidden';
        const {container} = render(<Cards briefing={briefing}/>);
        act(() => { observed.show(container.querySelector('[data-id="1"]'), 1); });
        act(() => { vi.advanceTimersByTime(5000); });
        expect(BriefingApi.markSeen).not.toHaveBeenCalled();         // behind another tab

        visibility = 'visible';
        act(() => { document.dispatchEvent(new Event('visibilitychange')); });
        act(() => { vi.advanceTimersByTime(1000); });
        expect(BriefingApi.markSeen).not.toHaveBeenCalled();         // shown for one second only
        act(() => { vi.advanceTimersByTime(4000); });
        expect(BriefingApi.markSeen).toHaveBeenCalledWith(7, [1], 'token', {keepalive: false});
    });
});
