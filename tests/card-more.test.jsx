//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: card-more.test.jsx
//  Description: The strip of tabs under a card: the count of a tab in a circle of its own, and the fade of the edge where there is more to
//               scroll to, so a strip wider than the screen is seen to scroll (the user, 05.11.2026)
//

import '@testing-library/jest-dom';
import {describe, expect, it, vi} from 'vitest';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {CardMore} from '@/features/briefing/components/CardMore.jsx';

const TABS = [
    {key: 'analysis', label: 'AI analysis', content: <p>The analysis</p>},
    {key: 'angles', label: 'Angles', count: 2, content: <p>The angles</p>},
    {key: 'affair', label: 'This affair', content: <p>The affair</p>},
    {key: 'coverage', label: 'Coverage', count: 12, content: <p>The coverage</p>},
];
const render4 = (open = 'analysis', onOpen = vi.fn()) => render(<CardMore tabs={TABS} open={open} onOpen={onOpen} id="card-1"/>);
const stripOf = (container) => container.querySelector('[class*="overflow-x-auto"]');

// jsdom measures nothing: the strip is given the width of what it holds and of what is seen, and its place
const measured = (strip, {scrollWidth, clientWidth, scrollLeft}) => {
    Object.defineProperty(strip, 'scrollWidth', {configurable: true, get: () => scrollWidth});
    Object.defineProperty(strip, 'clientWidth', {configurable: true, get: () => clientWidth});
    Object.defineProperty(strip, 'scrollLeft', {configurable: true, writable: true, value: scrollLeft});
    act(() => { fireEvent.scroll(strip); });
};

describe('CardMore, the count of a tab', () => {
    it('should be in a circle of its own, not a word of the label', () => {
        render4();
        const two = screen.getByText('2');
        expect(two).toHaveClass('rounded-full', 'bg-paper-deep');
        expect(two).toHaveClass('min-w-5');
        expect(screen.getByText('12')).toHaveClass('rounded-full');
        // a tab without a count has none
        expect(screen.getByRole('button', {name: 'AI analysis'})).not.toHaveTextContent(/\d/);
    });

    it('should still be said with the label: the name of the tab is its label and its count', () => {
        render4();
        expect(screen.getByRole('button', {name: 'Angles 2'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Coverage 12'})).toBeInTheDocument();
    });

    it('should take another tone on the tab open, so it is seen on the grey of the tab', () => {
        render4('angles');
        expect(screen.getByRole('button', {name: 'Angles 2'})).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('2').className).toMatch(/group-aria-expanded:bg-paper/);
    });
});

describe('CardMore, a strip wider than the screen', () => {
    it('should run to the edges of the screen on a phone, so a tab cut by the edge is seen to go on', () => {
        const {container} = render4();
        expect(stripOf(container).className).toMatch(/max-md:-mx-6/);
        expect(stripOf(container).className).toMatch(/max-md:px-6/);
    });

    it('should fade its end where there are more tabs than are seen', () => {
        const {container} = render4();
        const strip = stripOf(container);
        expect(strip).not.toHaveAttribute('data-more');
        measured(strip, {scrollWidth: 520, clientWidth: 327, scrollLeft: 0});
        expect(strip).toHaveAttribute('data-more', 'end');
    });

    it('should fade both edges in the middle of it, and only its start at the end of it', () => {
        const {container} = render4();
        const strip = stripOf(container);
        measured(strip, {scrollWidth: 520, clientWidth: 327, scrollLeft: 80});
        expect(strip).toHaveAttribute('data-more', 'both');
        measured(strip, {scrollWidth: 520, clientWidth: 327, scrollLeft: 193});
        expect(strip).toHaveAttribute('data-more', 'start');
    });

    it('should not fade a strip that fits', () => {
        const {container} = render4();
        const strip = stripOf(container);
        measured(strip, {scrollWidth: 327, clientWidth: 327, scrollLeft: 0});
        expect(strip).not.toHaveAttribute('data-more');
    });

    it('should slide a tab into view when it is tapped, and open it', () => {
        const scrollIntoView = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
        const onOpen = vi.fn();
        render4('analysis', onOpen);
        fireEvent.click(screen.getByRole('button', {name: 'Coverage 12'}));
        expect(onOpen).toHaveBeenCalledWith('coverage');
        expect(scrollIntoView).toHaveBeenCalledWith({block: 'nearest', inline: 'nearest', behavior: 'smooth'});
        expect(scrollIntoView.mock.contexts[0]).toHaveAttribute('id', 'card-1-coverage-tab');
        scrollIntoView.mockRestore();
    });

    it('should show the panel of the tab that is open, and none without', () => {
        const {rerender} = render4('angles');
        expect(screen.getByText('The angles')).toBeInTheDocument();
        expect(screen.queryByText('The analysis')).toBeNull();
        rerender(<CardMore tabs={TABS} open={null} onOpen={vi.fn()} id="card-1"/>);
        expect(screen.queryByText('The angles')).toBeNull();
    });
});
