//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: mail-layout.test.jsx
//  Description: The layout of the editor of the e-mail chosen in the settings, with its drawings, the three frames at first; and the
//               blocks a story can carry, which it has and which the presets put on
//

import '@testing-library/jest-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {WithSession} from "./session.jsx";
import {MailLayoutChoice} from '@/features/briefing/components/MailLayoutChoice.jsx';
import {MailPresets, PagePresets} from '@/features/briefing/components/MailPresets.jsx';
import {keepShow, keptShow, presetsFrom, usePresets} from '@/features/briefing/blockPresets.js';
import {DEFAULT_LAYOUT, keepLayout, keptLayout} from '@/features/briefing/mailEditorLayout.js';
import {BLOCKS, countOf, DEFAULT_BLOCKS, hasBlock, PRESETS, SERVER_BLOCKS} from '@/features/briefing/mailBlocks.js';

vi.mock('@/features/auth/accountApi.js', () => ({AccountApi: {rename: vi.fn(), changeEmail: vi.fn(), changePassword: vi.fn()}}));
const {SettingsPage} = await import('@/pages/Settings.jsx');

vi.setConfig({testTimeout: 20000});

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('the layout of the editor of the e-mail', () => {
    it('should be the three frames at first, and the matrix once the reader chooses it, kept in the browser', () => {
        expect(keptLayout()).toBe('frames');
        expect(DEFAULT_LAYOUT).toBe('frames');
        keepLayout('matrix');
        expect(keptLayout()).toBe('matrix');
        // a value nobody wrote is no layout
        localStorage.setItem('newsgenerator.mail-editor', 'carousel');
        expect(keptLayout()).toBe('frames');
    });

    it('should offer the two as cards with a drawing each, the three frames chosen and said to be the one at first', () => {
        const {container} = render(<MailLayoutChoice/>);
        const group = screen.getByRole('radiogroup', {name: 'The editor of the e-mail'});
        expect(group).toBeInTheDocument();
        expect(screen.getByRole('radio', {name: /Three frames/})).toBeChecked();
        expect(screen.getByRole('radio', {name: /Matrix/})).not.toBeChecked();
        expect(screen.getByRole('radio', {name: /Three frames/})).toHaveTextContent('at first');
        // a drawing in each, hidden from the screen readers: the words say it
        expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
    });

    it('should keep the choice, and read it again when the page is opened again', () => {
        const {unmount} = render(<MailLayoutChoice/>);
        fireEvent.click(screen.getByRole('radio', {name: /Matrix/}));
        expect(screen.getByRole('radio', {name: /Matrix/})).toBeChecked();
        expect(localStorage.getItem('newsgenerator.mail-editor')).toBe('matrix');
        unmount();

        render(<MailLayoutChoice/>);
        expect(screen.getByRole('radio', {name: /Matrix/})).toBeChecked();
        expect(screen.getByRole('radio', {name: /Three frames/})).not.toBeChecked();
    });

    it('should be a section of the settings of the account', () => {
        render(
            <MemoryRouter initialEntries={['/settings']}>
                <WithSession user={{id: 1, username: 'reader', email: 'reader@example.org', role: 2}} refresh={vi.fn()}>
                    <Routes><Route path="/settings" element={<SettingsPage/>}/></Routes>
                </WithSession>
            </MemoryRouter>
        );
        expect(screen.getByRole('heading', {name: 'The editor of the e-mail'})).toBeInTheDocument();
        expect(screen.getByRole('radio', {name: /Three frames/})).toBeChecked();
        // and what its presets contain, under it (the user, 05.11.2026)
        expect(screen.getByRole('heading', {name: 'What the presets put in the e-mail'})).toBeInTheDocument();
        expect(screen.getByRole('table', {name: 'What the presets put in the e-mail'})).toBeInTheDocument();
    });
});

// what each preset puts in a story, said in the settings from the presets themselves
describe('what the presets contain, in the settings', () => {
    // a box ticked where the preset puts the block (the title and the text, in every one, are a mark that cannot be changed)
    // the cells are read from the DOM: a role query for each of 33 cells is slow on a busy machine
    const included = (row, preset) => {
        const cell = row.querySelectorAll('td')[PRESETS.findIndex(one => one.value === preset)];
        const box = cell.querySelector('input[type=checkbox]');
        return box ? box.checked : cell.querySelector('[aria-label="Included"]') !== null;
    };

    it('should have a column for each preset and a row for the title and the text and for each block', () => {
        render(<MailPresets/>);
        const table = screen.getByRole('table', {name: 'What the presets put in the e-mail'});
        expect(within(table).getAllByRole('columnheader').map(head => head.textContent)).toEqual(['Block', 'Short', 'Standard', 'Everything']);
        expect(within(table).getAllByRole('rowheader').map(head => head.textContent.replace(' · badge', ''))).toEqual(['Title and text', ...BLOCKS.map(block => block.label)]);
        // the badges are said to be
        expect(within(table).getByRole('rowheader', {name: /Contested/})).toHaveTextContent('badge');
    });

    it('should put the title and the text in every preset', () => {
        render(<MailPresets/>);
        const row = screen.getByRole('row', {name: /Title and text/});
        for (const preset of PRESETS) expect(included(row, preset.value)).toBe(true);
    });

    it('should say what "Short" contains: the badges, nothing else', () => {
        render(<MailPresets/>);
        const rows = Object.fromEntries(BLOCKS.map(block => [block.key, screen.getByRole('row', {name: new RegExp(`^${block.label}`)})]));
        const short = BLOCKS.filter(block => included(rows[block.key], 'short')).map(block => block.key);
        expect(short).toEqual(['media', 'contested', 'official', 'unconfirmed']);
    });

    it('should say what "Standard" contains: the badges, and the picture, the countries, who it is about and the analysis', () => {
        render(<MailPresets/>);
        const rows = Object.fromEntries(BLOCKS.map(block => [block.key, screen.getByRole('row', {name: new RegExp(`^${block.label}`)})]));
        const standard = BLOCKS.filter(block => included(rows[block.key], 'standard')).map(block => block.key);
        expect(standard).toEqual(['picture', 'countries', 'media', 'contested', 'official', 'unconfirmed', 'names', 'analysis']);
        // the angles, the affair and its coverage are for "Everything"
        for (const key of ['angles', 'affair', 'coverage']) {
            expect(included(rows[key], 'standard')).toBe(false);
            expect(included(rows[key], 'everything')).toBe(true);
        }
    });

    it('should say it from the presets themselves: what a preset puts on is what the table marks', () => {
        render(<MailPresets/>);
        // the rows are looked for once: a role query over the whole table, for each cell, is slow on a busy machine
        const rows = Object.fromEntries(BLOCKS.map(block => [block.key, screen.getByRole('row', {name: new RegExp(`^${block.label}`)})]));
        for (const preset of PRESETS) {
            for (const block of BLOCKS) expect(included(rows[block.key], preset.value)).toBe(preset.on.includes(block.key));
        }
    });
});

// what the presets contain is set by the reader, in the settings: for the e-mail, and for the page of the briefing (the user, 06.11.2026)
describe('the presets the reader sets', () => {
    const boxOf = (block, preset) => screen.getByRole('checkbox', {name: `${block} in “${preset}”`});

    it('should let the reader tick and untick what a preset contains, and keep it in the browser', () => {
        const {unmount} = render(<MailPresets/>);
        expect(boxOf('Angles', 'Standard')).not.toBeChecked();
        fireEvent.click(boxOf('Angles', 'Standard'));
        fireEvent.click(boxOf('Picture', 'Short'));
        fireEvent.click(boxOf('Contested', 'Short'));
        expect(boxOf('Angles', 'Standard')).toBeChecked();
        expect(boxOf('Picture', 'Short')).toBeChecked();
        expect(boxOf('Contested', 'Short')).not.toBeChecked();
        expect(JSON.parse(localStorage.getItem('newsgenerator.mail-presets'))).toMatchObject({short: ['picture', 'media', 'official', 'unconfirmed']});
        unmount();

        // read again when the page is opened again
        render(<MailPresets/>);
        expect(boxOf('Angles', 'Standard')).toBeChecked();
        expect(boxOf('Contested', 'Short')).not.toBeChecked();
    });

    it('should offer to put a preset back as it was only when it was changed, and do it', () => {
        render(<MailPresets/>);
        expect(screen.queryByRole('button', {name: /back as it was/})).toBeNull();
        fireEvent.click(boxOf('Angles', 'Standard'));
        fireEvent.click(screen.getByRole('button', {name: 'Put “Standard” back as it was'}));
        expect(boxOf('Angles', 'Standard')).not.toBeChecked();
        expect(screen.queryByRole('button', {name: /back as it was/})).toBeNull();
        // the others were not touched
        expect(boxOf('Angles', 'Everything')).toBeChecked();
    });

    it('should keep the title and the text in every preset, with no box to untick', () => {
        render(<MailPresets/>);
        const row = screen.getByRole('row', {name: /Title and text/});
        expect(within(row).queryAllByRole('checkbox')).toHaveLength(0);
        expect(within(row).getAllByRole('img', {name: 'Included'})).toHaveLength(3);
    });

    it('should have a table of its own for the page, apart from the one of the e-mail', () => {
        render(<><MailPresets/><PagePresets/></>);
        const mail = screen.getByRole('table', {name: 'What the presets put in the e-mail'});
        const page = screen.getByRole('table', {name: 'What the presets show on the page'});
        fireEvent.click(within(page).getByRole('checkbox', {name: 'Coverage in “Standard”'}));
        expect(within(page).getByRole('checkbox', {name: 'Coverage in “Standard”'})).toBeChecked();
        expect(within(mail).getByRole('checkbox', {name: 'Coverage in “Standard”'})).not.toBeChecked();
        expect(localStorage.getItem('newsgenerator.mail-presets')).toBeNull();
        expect(JSON.parse(localStorage.getItem('newsgenerator.page-presets')).standard).toContain('coverage');
    });

    it('should give the presets at first when nothing is kept, or what is kept is not a list of blocks', () => {
        for (const raw of ['', 'not json', '[]', '{"short": "all"}', '{"short": 3}', 'null']) {
            expect(presetsFrom(raw).map(preset => [preset.on, preset.changed])).toEqual(PRESETS.map(preset => [preset.on, false]));
        }
        const [short, standard] = presetsFrom('{"short": ["names", "picture", "nothing"]}');
        // the blocks in the order of the blocks, the unknown ones dropped
        expect(short).toMatchObject({on: ['picture', 'names'], changed: true});
        expect(standard.changed).toBe(false);
    });

    it('should tell every place that reads them at once: the one set in the settings is the one of the editor', () => {
        const Reader = () => <p data-testid="short">{usePresets('mail').presets[0].on.join(',')}</p>;
        render(<><MailPresets/><Reader/></>);
        expect(screen.getByTestId('short')).toHaveTextContent('media,contested,official,unconfirmed');
        fireEvent.click(boxOf('Picture', 'Short'));
        expect(screen.getByTestId('short')).toHaveTextContent('picture,media,contested,official,unconfirmed');
    });

    it('should show everything on the page at first, and keep the preset the reader chose', () => {
        expect(keptShow()).toBe('everything');
        keepShow('short');
        expect(keptShow()).toBe('short');
        localStorage.setItem('newsgenerator.briefing-show', 'huge');
        expect(keptShow()).toBe('everything');
    });
});

describe('the blocks a story can carry in the e-mail', () => {
    const story = {thumbnail: 'a.jpg', countries: ['FR'], media: 3, contested: [{by: 'X'}], official: [], hedged: null, names: ['FIFA'], analysis: {why: ['A.'], next: [], timeline: []},
        angles: [], affair: true, hasArticles: true};

    it('should list the picture, the countries, the four badges, who it is about, the analysis, the angles, the affair and its coverage', () => {
        expect(BLOCKS.map(block => block.label)).toEqual(['Picture', 'Countries', 'Told by', 'Contested', 'Official source', 'Unconfirmed', 'Who it is about',
            'AI analysis', 'Angles', 'This affair', 'Coverage']);
        expect(BLOCKS.filter(block => block.badge).map(block => block.key)).toEqual(['media', 'contested', 'official', 'unconfirmed']);
    });

    it('should send to the server the blocks it takes, not the picture and the countries, which have their own choice', () => {
        expect(SERVER_BLOCKS).toEqual(['media', 'contested', 'official', 'unconfirmed', 'names', 'analysis', 'angles', 'affair', 'coverage']);
        expect(Object.keys(DEFAULT_BLOCKS)).toEqual(SERVER_BLOCKS);
    });

    it('should know which blocks a story has: the ones it has data for', () => {
        const has = BLOCKS.filter(block => hasBlock(story, block.key)).map(block => block.key);
        expect(has).toEqual(['picture', 'countries', 'media', 'contested', 'names', 'analysis', 'affair', 'coverage']);
        // a story with nothing but its text carries a picture, nothing more
        expect(BLOCKS.filter(block => hasBlock({}, block.key)).map(block => block.key)).toEqual(['picture']);
        expect(hasBlock({analysis: {why: [], next: [], timeline: []}}, 'analysis')).toBe(false);
    });

    it('should count how many stories have a block and how many of them have it on', () => {
        const stories = [story, {...story, affair: false}, {}];
        const on = (one, key) => key === 'affair' && one === story;
        expect(countOf(stories, 'affair', on)).toEqual({having: 1, on: 1});
        expect(countOf(stories, 'media', on)).toEqual({having: 2, on: 0});
        expect(countOf(stories, 'angles', on)).toEqual({having: 0, on: 0});
    });

    it('should have three presets, each putting on the blocks of the one before and more', () => {
        const [short, standard, everything] = PRESETS;
        expect(PRESETS.map(preset => preset.label)).toEqual(['Short', 'Standard', 'Everything']);
        expect(short.on).toEqual(['media', 'contested', 'official', 'unconfirmed']);
        for (const key of short.on) expect(standard.on).toContain(key);
        for (const key of standard.on) expect(everything.on).toContain(key);
        expect(standard.on).toEqual(expect.arrayContaining(['picture', 'countries', 'names', 'analysis']));
        expect(standard.on).not.toContain('angles');
        expect(everything.on).toHaveLength(BLOCKS.length);
    });
});
