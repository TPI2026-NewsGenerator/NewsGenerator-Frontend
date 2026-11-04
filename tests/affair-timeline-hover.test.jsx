//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: affair-timeline-hover.test.jsx
//  Description: The line of an affair: a marker and its label light up together when the mouse or the focus is on either, and a label
//               cut short ends with "…"
//

import '@testing-library/jest-dom';
import {describe, expect, it} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {AffairTimeline} from '@/features/affairs/components/AffairTimeline.jsx';

const event = (id, at, title, extra = {}) => ({id, at, kind: 'key', title, titleTranslation: null, url: `https://media.example/${id}`, medium: 'media.example',
    language: 'en', media: ['a.fr', 'b.fr'], languages: ['en'], storyIds: [id], reported: false, official: false, denial: false, ...extra});
const EVENTS = [event(1, '2026-10-05T10:00:00.000Z', 'First event title'), event(2, '2026-10-12T10:00:00.000Z', 'Second event title')];
const COVERAGE = {media: 4, news: 6, first: null, peak: null, days: [], languages: [], byMedium: []};

const marker = (title) => screen.getByRole('button', {name: new RegExp(`${title}, told by`)});
const label = (title) => screen.getByText(title).closest('button');

describe('AffairTimeline, a marker and its label', () => {
    it('should give the label a background when the mouse is on its marker', () => {
        render(<AffairTimeline events={EVENTS} coverage={COVERAGE}/>);
        expect(label('First event title')).toHaveClass('bg-paper');
        fireEvent.mouseEnter(marker('First event title'));
        expect(label('First event title')).toHaveClass('bg-paper-deep');
        // the other event stays as it was
        expect(label('Second event title')).toHaveClass('bg-paper');
        fireEvent.mouseLeave(marker('First event title'));
        expect(label('First event title')).toHaveClass('bg-paper');
        expect(label('First event title')).not.toHaveClass('bg-paper-deep');
    });

    it('should give the marker a border when the mouse is on its label', () => {
        render(<AffairTimeline events={EVENTS} coverage={COVERAGE}/>);
        expect(marker('Second event title')).not.toHaveClass('ring-2');
        fireEvent.mouseEnter(label('Second event title'));
        expect(marker('Second event title')).toHaveClass('ring-2');
        expect(marker('First event title')).not.toHaveClass('ring-2');
        fireEvent.mouseLeave(label('Second event title'));
        expect(marker('Second event title')).not.toHaveClass('ring-2');
    });

    it('should light them up for the keyboard too, and keep the stronger ring of the event read', () => {
        render(<AffairTimeline events={EVENTS} coverage={COVERAGE}/>);
        fireEvent.focus(label('First event title'));
        expect(marker('First event title')).toHaveClass('ring-2');
        fireEvent.blur(label('First event title'));
        expect(marker('First event title')).not.toHaveClass('ring-2');

        fireEvent.click(marker('First event title'));
        fireEvent.mouseEnter(marker('First event title'));
        expect(marker('First event title')).toHaveClass('ring-offset-1');
    });

    // the title is a line-clamp: with "block" next to it, its box was a plain block, which cut the text in the middle of a line, no "…"
    it('should end a title that is too long with "…": its box is the one of line-clamp, not a plain block', () => {
        render(<AffairTimeline events={EVENTS} coverage={COVERAGE}/>);
        const title = screen.getByText('First event title');
        expect(title).toHaveClass('line-clamp-2');
        expect(title).not.toHaveClass('block');
    });
});

// an event someone denies is an orange marker, one a party announced itself a green one (as "Contested" and "Official source" are on the cards)
describe('AffairTimeline, the colour of a marker', () => {
    const MARKED = [
        event(1, '2026-10-05T10:00:00.000Z', 'Plain event'),
        event(2, '2026-10-12T10:00:00.000Z', 'Denied event', {denial: true}),
        event(3, '2026-10-19T10:00:00.000Z', 'Official event', {official: true}),
        event(4, '2026-10-26T10:00:00.000Z', 'Denied and official event', {denial: true, official: true}),
        event(5, '2026-10-27T10:00:00.000Z', 'Small official event', {kind: 'minor', official: true}),
    ];

    it('should make a denied event orange, an official one green, and leave the others blue', () => {
        render(<AffairTimeline events={MARKED} coverage={COVERAGE}/>);
        expect(marker('Plain event')).toHaveClass('border-action');
        expect(marker('Denied event')).toHaveClass('border-accent-ink', 'bg-accent-ink/85');
        expect(marker('Official event')).toHaveClass('border-official', 'bg-official/85');
    });

    it('should make an event both denied and official orange: it is what the reader is warned of', () => {
        render(<AffairTimeline events={MARKED} coverage={COVERAGE}/>);
        expect(marker('Denied and official event')).toHaveClass('border-accent-ink');
        expect(marker('Denied and official event')).not.toHaveClass('border-official');
    });

    it('should colour the small markers of the minor events too, and the ring that lights a marker', () => {
        render(<AffairTimeline events={MARKED} coverage={COVERAGE}/>);
        const small = screen.getByRole('button', {name: /Small official event, told by/});
        expect(small).toHaveClass('border-official');
        fireEvent.mouseEnter(small);
        expect(small).toHaveClass('ring-official/55');
        fireEvent.mouseEnter(marker('Denied event'));
        expect(marker('Denied event')).toHaveClass('ring-accent-ink/55');
    });

    it('should say the colours in the legend of the line', () => {
        render(<AffairTimeline events={MARKED} coverage={COVERAGE}/>);
        expect(screen.getByText('orange: contested')).toHaveClass('text-accent-ink');
        expect(screen.getByText('green: official')).toHaveClass('text-official');
    });
});
