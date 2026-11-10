//
//  Author: Fabian Rostello
//  Date: 10.11.2026
//  File: block-lists.test.jsx
//  Description: The two lists of blocks of the settings (the user, 10.11.2026: the presets "Short", "Standard" and "Everything" are gone, a friend of
//               the user uses a single mode): one for the e-mail, one for the page, each with its boxes. What a reader had set for the presets
//               before is carried over
//

import '@testing-library/jest-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {MailBlocks, PageBlocks} from '@/features/briefing/components/BlockLists.jsx';

vi.setConfig({testTimeout: 20000});

const ALL = ['picture', 'countries', 'media', 'contested', 'official', 'unconfirmed', 'names', 'analysis', 'angles', 'affair', 'coverage'];
const LABELS = ['Picture', 'Countries', 'Told by', 'Contested', 'Officially confirmed', 'Unconfirmed', 'Who it is about', 'AI analysis', 'Angles', 'This affair', 'Coverage'];

const table = (name) => screen.getByRole('table', {name});
const mail = () => table('What a story carries in the e-mail');
const page = () => table('What a story carries on the page');
// the labels of the boxes ticked in a table
const ticked = (one) => within(one).getAllByRole('checkbox').filter(box => box.checked).map(box => box.closest('tr').querySelector('th').textContent.replace(' · badge', ''));
const stored = (key) => JSON.parse(localStorage.getItem(key));

// the lists are drawn after what the browser kept is set
const draw = () => render(<><MailBlocks/><PageBlocks/></>);

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('the lists of blocks of the settings', () => {
    it('should offer one list for the e-mail and one for the page, with every block in each, and no preset', () => {
        draw();
        for (const one of [mail(), page()]) {
            expect(within(one).getAllByRole('checkbox')).toHaveLength(ALL.length);
            expect(within(one).getAllByRole('rowheader').map(header => header.textContent.replace(' · badge', ''))).toEqual(['Title and text', ...LABELS]);
            expect(within(one).getAllByRole('columnheader')).toHaveLength(2);
        }
        for (const preset of ['Short', 'Standard', 'Everything']) expect(screen.queryByText(preset)).toBeNull();
        expect(within(mail()).getByRole('columnheader', {name: 'In the e-mail'})).toBeInTheDocument();
        expect(within(page()).getByRole('columnheader', {name: 'On the page'})).toBeInTheDocument();
    });

    it('should tick at first what the editor always opened with for the e-mail, and the whole card for the page', () => {
        draw();
        // everything but the affair and its coverage
        expect(ticked(mail())).toEqual(LABELS.slice(0, 9));
        expect(ticked(page())).toEqual(LABELS);
        expect(screen.queryByRole('button', {name: 'Put it back as it was at first'})).toBeNull();
    });

    it('should keep a box in the list of its place only, the whole list, in the order of the blocks', () => {
        draw();
        fireEvent.click(within(mail()).getByRole('checkbox', {name: 'Picture in the e-mail'}));
        expect(ticked(mail())).toEqual(LABELS.slice(1, 9));
        expect(ticked(page())).toEqual(LABELS);
        expect(stored('newsgenerator.mail-blocks')).toEqual(ALL.slice(1, 9));
        expect(localStorage.getItem('newsgenerator.page-blocks')).toBeNull();

        fireEvent.click(within(page()).getByRole('checkbox', {name: 'Coverage on the page'}));
        expect(stored('newsgenerator.page-blocks')).toEqual(ALL.slice(0, 10));
        expect(ticked(mail())).toEqual(LABELS.slice(1, 9));
    });

    it('should put a list back as it was at first, the other one staying as the reader set it', () => {
        draw();
        fireEvent.click(within(mail()).getByRole('checkbox', {name: 'Told by in the e-mail'}));
        fireEvent.click(within(page()).getByRole('checkbox', {name: 'Angles on the page'}));
        const back = screen.getAllByRole('button', {name: 'Put it back as it was at first'});
        expect(back).toHaveLength(2);

        // the first button is the one of the e-mail
        fireEvent.click(back[0]);
        expect(ticked(mail())).toEqual(LABELS.slice(0, 9));
        expect(ticked(page())).not.toContain('Angles');
        expect(screen.getAllByRole('button', {name: 'Put it back as it was at first'})).toHaveLength(1);
    });

    it('should let the reader untick everything: the title and the text are always there', () => {
        draw();
        for (const label of LABELS) {
            const box = within(page()).getByRole('checkbox', {name: `${label} on the page`});
            if (box.checked) fireEvent.click(box);
        }
        expect(ticked(page())).toEqual([]);
        expect(stored('newsgenerator.page-blocks')).toEqual([]);
        expect(within(page()).getByRole('img', {name: 'Included'})).toBeInTheDocument();
    });
});

describe('the lists of blocks, from the presets of before', () => {
    // each test sets what the browser kept before 10.11.2026, then draws the lists
    it('should tick for the e-mail the preset the reader had changed, "Everything" first', () => {
        localStorage.setItem('newsgenerator.mail-presets', JSON.stringify({short: ['picture'], standard: ['names']}));
        draw();
        // "Standard" comes before "Short"
        expect(ticked(mail())).toEqual(['Who it is about']);
    });

    it('should tick for the page the preset it showed, with the blocks ticked for it', () => {
        localStorage.setItem('newsgenerator.briefing-show', 'short');
        localStorage.setItem('newsgenerator.page-presets', JSON.stringify({short: ['angles', 'picture']}));
        draw();
        expect(ticked(page())).toEqual(['Picture', 'Angles']);
    });

    it('should tick the blocks of "Short" for the page when it was the preset shown and nothing was ticked for it', () => {
        localStorage.setItem('newsgenerator.briefing-show', 'short');
        draw();
        expect(ticked(page())).toEqual(['Told by', 'Contested', 'Officially confirmed', 'Unconfirmed']);
    });

    it('should prefer a list ticked since to the presets of before', () => {
        localStorage.setItem('newsgenerator.briefing-show', 'short');
        localStorage.setItem('newsgenerator.page-blocks', JSON.stringify(['coverage']));
        draw();
        expect(ticked(page())).toEqual(['Coverage']);
    });
});
