//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: briefing-email.test.jsx
//  Description: The cards ticked in the briefing sent by the server to the address the reader confirms,
//               the one of the account written in, the boxes shown only when the server has an e-mail account
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {WithSession} from "./session.jsx";

// each test renders the whole page and the bar of the e-mail: over the 5 s of the default on a machine that is busy
vi.setConfig({testTimeout: 20000});

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    BriefingApi: {affairs: vi.fn(async () => ({affairs: {}})), getLatest: vi.fn(), start: vi.fn(), vote: vi.fn(), email: vi.fn(async () => {}), addNews: vi.fn(), neutralTitle: vi.fn(), pictures: vi.fn(async () => ({pictures: [
        {url: 'https://cdn.example/first.jpg', source: 'media1.fr'}, {url: 'https://cdn.example/other.jpg', source: 'kicker.de'},
    ]}))},
    ProfileApi: {get: vi.fn(async () => ({profile: {text: 'Le football.', language: 'fr'}}))},
}));

// the pictures load at once: the ones named "small" narrower than the e-mail, "w2000" wider than the
// others, "standing" taller than wide, "broken" not at all
vi.stubGlobal('Image', class {
    set src(url) {
        this.naturalWidth = url.includes('small') ? 240 : url.includes('w2000') ? 2000 : 1200;
        this.naturalHeight = this.naturalWidth * (url.includes('standing') ? 1.5 : 0.5625);
        queueMicrotask(() => (url.includes('broken') ? this.onerror : this.onload)?.());
    }
});

vi.mock('@/features/entities/entityApi.js', () => ({
    EntityApi: {list: vi.fn(async () => ({entities: [], words: []}))},
}));

const {BriefingApi} = await import('@/features/briefing/api/briefingApi.js');
const {BriefingPage} = await import('@/pages/Briefing.jsx');

const card = (storyId, title) => ({
    storyId, title, summary: `The first passage of ${title}.`, articles: [],
    lead: {source: `media${storyId}.fr`, url: `https://media${storyId}.fr/story`},
    corroboration: {media: 1, read: 1, independent: 1, agencies: []},
});
const BRIEFING = {
    id: 9, status: 'ready', hours: 24, createdAt: '2026-10-08T06:00:00.000Z', finishedAt: '2026-10-08T06:01:00.000Z',
    items: [card(1, 'First story'), card(2, 'Second story'), card(3, 'Third story')],
};
const BOX = {name: 'Add to the e-mail'};
// what a story carries is in the frame on the right (see MailInspector): one section each, the picture, the countries and the lines closed until
// the reader opens them
const carries = (title) => screen.getByRole('group', {name: `What “${title}” carries in the e-mail`});
// the way to read the cards and what they show are in a pill of the toolbar (the user, 06.11.2026): opened before its groups are used
const openView = () => {
    if (!screen.queryByRole('group', {name: 'Read as'})) fireEvent.click(screen.getByRole('button', {name: /^What the cards show/}));
};
// the boxes of the sentences the e-mail sends (a box for each point or passage, the user, 06.11.2026): their texts, one by one
const boxesOf = (scope, noun) => within(scope).queryAllByRole('textbox', {name: new RegExp(`^${noun} \\d+$`)});
const textsOf = (scope, noun) => boxesOf(scope, noun).map(box => box.value);
const showSection = (name) => {
    const button = screen.queryByRole('button', {name: `Show the details of ${name}`});
    if (button) fireEvent.click(button);
};

const renderPage = async (mail = true) => {
    BriefingApi.getLatest.mockResolvedValue({briefing: BRIEFING, mail});
    render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
    await screen.findByText('First story');
};

describe('BriefingPage e-mail of the cards ticked', () => {
    afterEach(() => vi.clearAllMocks());

    it('should ask the address, the one of the account written in, then send the cards ticked and untick them', async () => {
        await renderPage();
        expect(screen.queryByRole('button', {name: 'Send email'})).toBeNull();

        const boxes = screen.getAllByRole('checkbox', BOX);
        fireEvent.click(boxes[2]);
        fireEvent.click(boxes[0]);
        expect(screen.getByText(/2 stories ticked/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        expect(BriefingApi.email).not.toHaveBeenCalled();
        expect(screen.getByLabelText('Send the 2 stories to')).toHaveValue('reader@example.org');
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));

        // in the order of the briefing, whatever the order they were ticked in
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1, 3], 'reader@example.org', {}, {}, {}, undefined, [], {}, {}, 'light', expect.any(Object)));
        await waitFor(() => expect(screen.queryByRole('button', {name: 'Send email'})).toBeNull());
        screen.getAllByRole('checkbox', BOX).forEach(box => expect(box).not.toBeChecked());
    });

    it('should send the cards in the way the page shows them, or in another the reader chooses for the e-mail', async () => {
        localStorage.clear();
        BriefingApi.getLatest.mockResolvedValue({briefing: {...BRIEFING, items: BRIEFING.items.map(item => ({...item, points: 'A point.', digest: 'A digest.'}))}, mail: true});
        render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
        await screen.findByText('First story');
        openView();
        const page = screen.getByRole('group', {name: 'Read as'});
        fireEvent.click(within(page).getByRole('radio', {name: 'Summary'}));

        fireEvent.click(screen.getAllByRole('checkbox', BOX)[0]);
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        const inMail = screen.getByRole('group', {name: 'In the e-mail, as'});
        expect(within(inMail).getByRole('radio', {name: 'Summary'})).toHaveAttribute('data-state', 'on');
        fireEvent.click(within(inMail).getByRole('radio', {name: 'Bullet points'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));

        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1], 'reader@example.org', {}, {}, {}, 'points', [], {}, {}, 'light', expect.any(Object)));
        // the page keeps its own way
        expect(within(page).getByRole('radio', {name: 'Summary'})).toHaveAttribute('data-state', 'on');
        localStorage.clear();
    });

    it('should show the sentences the e-mail sends, the article\'s or the AI\'s as the reader ticks', async () => {
        localStorage.clear();
        const item = {...BRIEFING.items[0], digest: 'Ein Digest.', points: 'Erster Punkt.\n\nZweiter Punkt.', pointsTranslation: 'Premier point.\n\nDeuxième point.', ai: {points: ['Un point de l\'IA.']}};
        BriefingApi.getLatest.mockResolvedValue({briefing: {...BRIEFING, items: [item]}, mail: true});
        render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
        await screen.findByText('First story');
        openView();
        fireEvent.click(within(screen.getByRole('group', {name: 'Read as'})).getByRole('radio', {name: 'Bullet points'}));
        fireEvent.click(screen.getAllByRole('checkbox', BOX)[0]);
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        const story = carries('First story');

        expect(within(story).getByRole('group', {name: 'Its bullet points in the e-mail'})).toBeInTheDocument();
        expect(textsOf(story, 'Point')).toEqual(['Premier point.', 'Deuxième point.']);
        fireEvent.click(within(story).getByRole('checkbox', {name: 'Send its bullet points in the AI version'}));
        expect(textsOf(story, 'Point')).toEqual(['Un point de l\'IA.']);
        localStorage.clear();
    });

    it('should say why a card has no AI version to send, instead of a box that is not there', async () => {
        localStorage.clear();
        // points written by the AI, no summary
        const item = {...BRIEFING.items[0], digest: 'Ein Digest.', points: 'Erster Punkt.', ai: {points: ['Un point de l\'IA.'], summary: null}};
        BriefingApi.getLatest.mockResolvedValue({briefing: {...BRIEFING, items: [item]}, mail: true});
        render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
        await screen.findByText('First story');
        fireEvent.click(screen.getAllByRole('checkbox', BOX)[0]);
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        const story = carries('First story');

        // the key passages have none
        expect(within(story).queryByRole('checkbox', {name: /AI version/})).toBeNull();
        expect(within(story).getByText(/The key passages have no AI version/)).toBeInTheDocument();
        // the summary was not written for this card
        fireEvent.click(within(screen.getByRole('group', {name: 'In the e-mail, as'})).getByRole('radio', {name: 'Summary'}));
        expect(within(story).queryByRole('checkbox', {name: /AI version/})).toBeNull();
        expect(within(story).getByText(/No AI version of the summary of this card/)).toBeInTheDocument();
        // the bullet points were
        fireEvent.click(within(screen.getByRole('group', {name: 'In the e-mail, as'})).getByRole('radio', {name: 'Bullet points'}));
        expect(within(story).getByRole('checkbox', {name: 'Send its bullet points in the AI version'})).toBeInTheDocument();
        localStorage.clear();
    });

    it('should send the bullet points, the summary or the key passages the reader wrote, their own when left as they are', async () => {
        localStorage.clear();
        const item = {...BRIEFING.items[0], digest: 'Ein Digest.\n\nSein Ende.', points: 'Erster Punkt.', ai: {points: ['Un point de l\'IA.']}};
        BriefingApi.getLatest.mockResolvedValue({briefing: {...BRIEFING, items: [item, BRIEFING.items[1]]}, mail: true});
        render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
        await screen.findByText('First story');
        openView();
        fireEvent.click(within(screen.getByRole('group', {name: 'Read as'})).getByRole('radio', {name: 'Bullet points'}));
        screen.getAllByRole('checkbox', BOX).slice(0, 2).forEach(box => fireEvent.click(box));
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));

        // a box a point, the AI version changed too; several lines pasted in a box are several points, the empty ones left out
        fireEvent.click(screen.getByRole('checkbox', {name: 'Send its bullet points in the AI version'}));
        fireEvent.change(screen.getByRole('textbox', {name: 'Point 1'}), {target: {value: 'Mon premier point.\n\n  Mon second point. '}});
        expect(textsOf(document.body, 'Point')).toEqual(['Mon premier point.', '  Mon second point. ']);
        expect(screen.getByText(/bullet points changed/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenLastCalledWith(9, [1, 2], 'reader@example.org', {}, {}, {}, 'points', [1],
            {1: ['Mon premier point.', 'Mon second point.']}, {}, 'light', expect.any(Object)));

        // sent, they are unticked: ticked again. The summary: a box for each of its paragraphs
        await waitFor(() => expect(screen.queryByRole('button', {name: 'Send email'})).toBeNull());
        screen.getAllByRole('checkbox', BOX).slice(0, 2).forEach(box => fireEvent.click(box));
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        fireEvent.click(within(screen.getByRole('group', {name: 'In the e-mail, as'})).getByRole('radio', {name: 'Summary'}));
        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        expect(screen.getByRole('group', {name: 'Its summary in the e-mail'})).toBeInTheDocument();
        expect(textsOf(document.body, 'Passage')).toEqual(['Ein Digest.', 'Sein Ende.']);
        fireEvent.change(screen.getByRole('textbox', {name: 'Passage 1'}), {target: {value: 'Mon résumé.'}});
        fireEvent.click(screen.getByRole('button', {name: 'Remove passage 2'}));
        expect(textsOf(document.body, 'Passage')).toEqual(['Mon résumé.']);
        fireEvent.click(screen.getByRole('button', {name: 'Back to the article’s sentences'}));
        expect(textsOf(document.body, 'Passage')).toEqual(['Ein Digest.', 'Sein Ende.']);
        fireEvent.change(screen.getByRole('textbox', {name: 'Passage 1'}), {target: {value: 'Mon résumé.'}});
        fireEvent.change(screen.getByRole('textbox', {name: 'Passage 2'}), {target: {value: 'Sa fin.'}});
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenLastCalledWith(9, [1, 2], 'reader@example.org', {}, {}, {}, 'digest', [],
            {1: ['Mon résumé.', 'Sa fin.']}, {}, 'light', expect.any(Object)));

        // the key passages of the second card; the first one's left empty: its own
        await waitFor(() => expect(screen.queryByRole('button', {name: 'Send email'})).toBeNull());
        screen.getAllByRole('checkbox', BOX).slice(0, 2).forEach(box => fireEvent.click(box));
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        fireEvent.click(within(screen.getByRole('group', {name: 'In the e-mail, as'})).getByRole('radio', {name: 'Key passages'}));
        fireEvent.click(screen.getByRole('button', {name: 'Edit “Second story” in the e-mail'}));
        expect(textsOf(document.body, 'Passage')).toEqual(['The first passage of Second story.']);
        fireEvent.change(screen.getByRole('textbox', {name: 'Passage 1'}), {target: {value: 'Un passage à moi.'}});
        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        fireEvent.change(screen.getByRole('textbox', {name: 'Passage 1'}), {target: {value: '  '}});
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenLastCalledWith(9, [1, 2], 'reader@example.org', {}, {}, {}, 'passages', [],
            {2: ['Un passage à moi.']}, {}, 'light', expect.any(Object)));
        localStorage.clear();
    }, 30000);

    it('should forget the AI versions ticked when the e-mail is opened again', async () => {
        localStorage.clear();
        const item = {...BRIEFING.items[0], digest: 'Ein Digest.', points: 'Erster Punkt.', pointsTranslation: 'Premier point.', ai: {points: ['Un point de l\'IA.']}};
        BriefingApi.getLatest.mockResolvedValue({briefing: {...BRIEFING, items: [item]}, mail: true});
        render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
        await screen.findByText('First story');
        openView();
        fireEvent.click(within(screen.getByRole('group', {name: 'Read as'})).getByRole('radio', {name: 'Bullet points'}));
        fireEvent.click(screen.getAllByRole('checkbox', BOX)[0]);
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        fireEvent.click(screen.getByRole('checkbox', {name: 'Send its bullet points in the AI version'}));
        fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));

        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));

        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1], 'reader@example.org', {}, {}, {}, 'points', [], {}, {}, 'light', expect.any(Object)));
        localStorage.clear();
    });

    it('should not offer the ways of a briefing that has its key passages only', async () => {
        await renderPage();
        fireEvent.click(screen.getAllByRole('checkbox', BOX)[0]);
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        expect(screen.queryByRole('group', {name: 'In the e-mail, as'})).toBeNull();
    });

    it('should send the stories in the order the reader gives them, their place in the briefing told', async () => {
        await renderPage();
        fireEvent.click(screen.getByRole('button', {name: 'Tick all the stories'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));

        const order = screen.getByRole('list', {name: 'The stories of the e-mail, in their order'});
        expect(screen.getByRole('button', {name: 'Move “First story” up'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Move “Third story” down'})).toBeDisabled();
        // the first of the briefing second, the third first
        fireEvent.click(screen.getByRole('button', {name: 'Move “First story” down'}));
        fireEvent.click(screen.getByRole('button', {name: 'Move “Third story” up'}));
        fireEvent.click(screen.getByRole('button', {name: 'Move “Third story” up'}));
        expect([...order.querySelectorAll('li')].map(li => li.textContent)).toEqual([
            '01Third story03 in the briefing', '02Second story02 in the briefing', '03First story01 in the briefing',
        ]);

        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [3, 2, 1], 'reader@example.org', {}, {}, {}, undefined, [], {}, {}, 'light', expect.any(Object)));
    });

    it('should not ask an order for a single story', async () => {
        await renderPage();
        fireEvent.click(screen.getAllByRole('checkbox', BOX)[1]);
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        expect(screen.queryByRole('list', {name: 'The stories of the e-mail, in their order'})).toBeNull();
    });

    it('should keep the cards ticked when the server could not send them', async () => {
        BriefingApi.email.mockRejectedValueOnce(new Error('The e-mail could not be sent, try again later.'));
        await renderPage();

        fireEvent.click(screen.getAllByRole('checkbox', BOX)[1]);
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));

        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [2], 'reader@example.org', {}, {}, {}, undefined, [], {}, {}, 'light', expect.any(Object)));
        expect(screen.getByLabelText('Send the story to')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
        expect(screen.getByText(/1 story ticked/)).toBeInTheDocument();
    });

    it('should send to another address the reader writes, and refuse one that is not one address', async () => {
        await renderPage();

        fireEvent.click(screen.getAllByRole('checkbox', BOX)[0]);
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        const field = screen.getByLabelText('Send the story to');
        fireEvent.change(field, {target: {value: 'friend@example.org; other@example.org'}});
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        expect(screen.getByText('An email, like name@example.org')).toBeInTheDocument();
        expect(BriefingApi.email).not.toHaveBeenCalled();

        fireEvent.change(field, {target: {value: ' friend@example.org '}});
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1], 'friend@example.org', {}, {}, {}, undefined, [], {}, {}, 'light', expect.any(Object)));
    });

    it('should send the picture the reader chose for a story, none for another, and their own for the others', async () => {
        BriefingApi.getLatest.mockResolvedValue({mail: true, briefing: {...BRIEFING, items: BRIEFING.items.map(item => ({
            ...item, thumbnail: `https://cdn.example/${item.storyId === 1 ? 'first' : item.storyId}.jpg`, thumbnailSource: item.lead.source,
        }))}});
        render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
        await screen.findByText('First story');
        fireEvent.click(screen.getByRole('button', {name: 'Tick all the stories'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));

        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        showSection('Picture');
        const own = await screen.findByRole('button', {name: 'The picture of media1.fr'}, {timeout: 5000});
        expect(BriefingApi.pictures).toHaveBeenCalledWith(9, 1);
        expect(own).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', {name: 'The picture of kicker.de'}));
        expect(screen.getByText(/picture changed/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Done'}));

        fireEvent.click(screen.getByRole('button', {name: 'Edit “Second story” in the e-mail'}));
        showSection('Picture');
        fireEvent.click(await screen.findByRole('button', {name: 'No picture'}, {timeout: 5000}));
        fireEvent.click(screen.getByRole('button', {name: 'Done'}));

        // the third: an address pasted, then back to its own
        fireEvent.click(screen.getByRole('button', {name: 'Edit “Third story” in the e-mail'}));
        showSection('Picture');
        fireEvent.change(await screen.findByLabelText('Or the address of an image', {}, {timeout: 5000}), {target: {value: 'https://web.example/a.png'}});
        fireEvent.click(screen.getByRole('button', {name: 'Use it'}));
        fireEvent.click(screen.getByRole('button', {name: 'Back to its own'}));

        // a title written for the third, one written then given back for the second
        fireEvent.change(screen.getByLabelText('Its title in the e-mail'), {target: {value: '  The third,  told my way '}});
        expect(screen.getByText('The third, told my way')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Done'}));
        fireEvent.click(screen.getByRole('button', {name: 'Edit “Second story” in the e-mail'}));
        fireEvent.change(screen.getByLabelText('Its title in the e-mail'), {target: {value: 'Another'}});
        fireEvent.click(screen.getByRole('button', {name: 'Back to its own title'}));
        expect(screen.getByLabelText('Its title in the e-mail')).toHaveValue('Second story');

        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1, 2, 3], 'reader@example.org', {
            1: {url: 'https://cdn.example/other.jpg'}, 2: null,
        }, {3: 'The third, told my way'}, {}, undefined, [], {}, {}, 'light', expect.any(Object)));
        // many steps of a dialog opened three times: more than the 5 s of a test when the computer is busy
    }, 30000);

    it('should offer only the pictures wide enough for the e-mail, and put the best of the story instead of an own too small', async () => {
        const offered = BriefingApi.pictures.getMockImplementation();
        BriefingApi.pictures.mockImplementation(async (briefingId, storyId) => ({pictures: storyId === 1 ? [
            {url: 'https://cdn.example/small-thumb.jpg', source: 'record.pt'}, {url: 'https://cdn.example/broken.jpg', source: 'klix.ba'},
            {url: 'https://cdn.example/standing-w2000.jpg', source: 'afp.com'}, {url: 'https://cdn.example/wide.jpg', source: 'kicker.de'},
            {url: 'https://cdn.example/lying-w2000.jpg', source: 'lequipe.fr'},
        ] : [{url: 'https://cdn.example/small-other.jpg', source: 'bbc.co.uk'}]}));
        BriefingApi.getLatest.mockResolvedValue({mail: true, briefing: {...BRIEFING, items: [
            {...card(1, 'First story'), thumbnail: 'https://cdn.example/small-own.jpg', thumbnailSource: 'media1.fr'},
            {...card(2, 'Second story'), thumbnail: 'https://cdn.example/big-own.jpg', thumbnailSource: 'media2.fr'},
            {...card(3, 'Third story'), thumbnail: 'https://cdn.example/small-3.jpg', thumbnailSource: 'media3.fr'},
        ]}});
        render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
        await screen.findByText('First story');
        fireEvent.click(screen.getByRole('button', {name: 'Tick all the stories'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));

        // the first: the widest lying picture of the story; the third has none wide enough
        expect(await screen.findByText(/its picture too small, a sharper one of the story instead/)).toBeInTheDocument();
        expect(BriefingApi.pictures).toHaveBeenCalledWith(9, 1);
        expect(BriefingApi.pictures).toHaveBeenCalledWith(9, 3);
        expect(BriefingApi.pictures).not.toHaveBeenCalledWith(9, 2);
        expect(await screen.findByText(/its picture too small, left out/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        showSection('Picture');
        expect(await screen.findByRole('button', {name: 'The picture of lequipe.fr'})).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', {name: 'The picture of afp.com'})).toHaveAttribute('aria-pressed', 'false');
        // its own, the small one and the one that does not load are not offered
        for (const source of ['media1.fr', 'record.pt', 'klix.ba']) expect(screen.queryByRole('button', {name: `The picture of ${source}`})).toBeNull();
        expect(screen.getByText('Left out: 3 pictures too small to stay sharp in the e-mail.')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Back to its own'})).toBeNull();
        fireEvent.click(screen.getByRole('button', {name: 'Done'}));

        fireEvent.click(screen.getByRole('button', {name: 'Edit “Third story” in the e-mail'}));
        showSection('Picture');
        expect(await screen.findByText('No picture of the story is wide enough to stay sharp in the e-mail.')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'No picture'})).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', {name: 'Done'}));

        // the second keeps its own, wide enough
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1, 2, 3], 'reader@example.org',
            {1: {url: 'https://cdn.example/lying-w2000.jpg'}, 3: null}, {}, {}, undefined, [], {}, {}, 'light', expect.any(Object)));
        BriefingApi.pictures.mockImplementation(offered);

    });

    it('should leave out of the e-mail the denials and the other angles the reader unticks', async () => {
        const items = [{...card(1, 'First story'),
            contested: [{by: 'Infantino', sentence: 'Das stimmt nicht.', translation: 'Ce n’est pas vrai.', source: 'bild.de'}],
            angles: [{title: 'Klage', titleTranslation: 'Le Nigeria porte plainte', source: 'rfi.fr', url: 'https://rfi.fr/n'},
                {title: 'The coach speaks', source: 'bbc.com', url: 'https://bbc.com/c'}],
        }, card(2, 'Second story')];
        BriefingApi.getLatest.mockResolvedValue({mail: true, briefing: {...BRIEFING, items}});
        render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
        await screen.findByText('First story');
        fireEvent.click(screen.getByRole('button', {name: 'Tick all the stories'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));

        // a story with neither has nothing to choose: its boxes are there, off the table
        fireEvent.click(screen.getByRole('button', {name: 'Edit “Second story” in the e-mail'}));
        expect(within(carries('Second story')).getByRole('checkbox', {name: 'Contested'})).toBeDisabled();
        expect(within(carries('Second story')).getByRole('checkbox', {name: 'Angles'})).toBeDisabled();

        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        showSection('Contested');
        showSection('Angles');
        const denials = screen.getByRole('group', {name: 'The denials of “First story”'});
        const angles = screen.getByRole('group', {name: 'The other angles of “First story”'});
        const boxes = [...denials.querySelectorAll('input[type=checkbox]'), ...angles.querySelectorAll('input[type=checkbox]')];
        expect(boxes.map(box => box.checked)).toEqual([true, true, true]);
        expect(denials).toHaveTextContent('“Ce n’est pas vrai.”');
        expect(angles).toHaveTextContent('Le Nigeria porte plainte');
        fireEvent.click(boxes[0]);
        fireEvent.click(boxes[2]);
        expect(screen.getByText(/1 denial taken out · 1 angle taken out/)).toBeInTheDocument();
        // put back
        fireEvent.click(boxes[0]);
        expect(screen.getByText(/· 1 angle taken out/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1, 2], 'reader@example.org', {}, {}, {1: {contested: [], angles: [1]}}, undefined, [], {}, {}, 'light', expect.any(Object)));
    });

    // the countries the server found for a card are not always right (the user, 02.11.2026): ticked or not, or others added
    it('should let the reader choose the countries of a story in the e-mail, and send them only when they changed', async () => {
        const items = [{...card(1, 'First story'), countries: ['FR', 'CH']}, {...card(2, 'Second story'), countries: ['ES']}];
        BriefingApi.getLatest.mockResolvedValue({mail: true, briefing: {...BRIEFING, items}});
        render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
        await screen.findByText('First story');
        fireEvent.click(screen.getByRole('button', {name: 'Tick all the stories'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));

        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        showSection('Countries');
        const group = screen.getByRole('group', {name: /Countries in the e-mail/});
        expect([...group.querySelectorAll('input[type=checkbox]')].map(box => [box.parentElement.parentElement.textContent, box.checked]))
            .toEqual([['France', true], ['Switzerland', true]]);

        // France out, Germany in
        fireEvent.click(within(group).getByRole('checkbox', {name: 'France'}));
        // found by a few letters of its name, accents and case aside
        fireEvent.change(within(group).getByRole('combobox', {name: 'Add a country to “First story”'}), {target: {value: 'GERM'}});
        fireEvent.click(within(group).getByRole('button', {name: 'Germany'}));
        expect([...group.querySelectorAll('input[type=checkbox]')].map(box => [box.parentElement.parentElement.textContent, box.checked]))
            .toEqual([['France', false], ['Switzerland', true], ['Germanyadded by you', true]]);
        expect(screen.getByText(/· countries changed/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1, 2], 'reader@example.org', {}, {}, {}, undefined, [], {}, {1: ['CH', 'DE']}, 'light', expect.any(Object)));
    });

    it('should send no country for a story whose countries the reader all unticked, and nothing for one put back as found', async () => {
        const items = [{...card(1, 'First story'), countries: ['FR']}, {...card(2, 'Second story'), countries: ['ES']}];
        BriefingApi.getLatest.mockResolvedValue({mail: true, briefing: {...BRIEFING, items}});
        render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
        await screen.findByText('First story');
        fireEvent.click(screen.getByRole('button', {name: 'Tick all the stories'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));

        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        showSection('Countries');
        fireEvent.click(screen.getByRole('checkbox', {name: 'France'}));
        fireEvent.click(screen.getByRole('button', {name: 'Edit “Second story” in the e-mail'}));
        showSection('Countries');
        fireEvent.click(screen.getByRole('checkbox', {name: 'Spain'}));
        fireEvent.click(screen.getByRole('checkbox', {name: 'Spain'}));
        expect(screen.getAllByText(/· countries changed/)).toHaveLength(1);

        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1, 2], 'reader@example.org', {}, {}, {}, undefined, [], {}, {1: []}, 'light', expect.any(Object)));
    });

    // a country is shown whether its title names it or not (the user, 06.11.2026: "Aruba" and "Cameroun" were ticked in the editor and seen
    // nowhere, the title naming them); and any country can be added, to a story that has none too
    describe('the countries and the title', () => {
        const openEditor = async (items, title) => {
            BriefingApi.getLatest.mockResolvedValue({mail: true, briefing: {...BRIEFING, items}});
            render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
            await screen.findByText(items[0].title);
            fireEvent.click(screen.getByRole('button', {name: 'Tick all the stories'}));
            fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
            fireEvent.click(screen.getByRole('button', {name: `Edit “${title}” in the e-mail`}));
            showSection('Countries');
        };
        const sent = async (countries) => {
            fireEvent.click(screen.getByRole('button', {name: 'Send'}));
            await waitFor(() => expect(BriefingApi.email).toHaveBeenCalled());
            expect(BriefingApi.email.mock.calls.at(-1)[9]).toEqual(countries);
        };

        it('should tick a country its title names, as any other, and send nothing while the reader leaves it as found', async () => {
            const items = [{...card(1, 'Cameroon sacks its national coach'), countries: ['CM']}, card(2, 'Second story')];
            await openEditor(items, 'Cameroon sacks its national coach');
            const section = carries('Cameroon sacks its national coach');
            expect(within(section).getByRole('checkbox', {name: 'Countries'})).toBeChecked();
            const group = within(section).getByRole('group', {name: /Countries in the e-mail/});
            expect(within(group).getByRole('checkbox', {name: /Cameroon/})).toBeChecked();
            expect(within(group).queryByText(/title names|named in its title/)).toBeNull();
            await sent({});
        });

        it('should let the reader take a country its title names out, as any other', async () => {
            const items = [{...card(1, 'Cameroon sacks its national coach'), countries: ['CM']}, card(2, 'Second story')];
            await openEditor(items, 'Cameroon sacks its national coach');
            fireEvent.click(within(carries('Cameroon sacks its national coach')).getByRole('checkbox', {name: /Cameroon/}));
            await sent({1: []});
        });

        it('should open the countries of a story that has none at first, and let the reader add any country of the world', async () => {
            await openEditor([card(1, 'First story'), card(2, 'Second story')], 'First story');
            const section = carries('First story');
            expect(within(section).getByText('none found: add one')).toBeInTheDocument();
            const group = within(section).getByRole('group', {name: /Countries in the e-mail/});
            // open without a click: the box of the section waits for a country
            expect(within(section).getByRole('checkbox', {name: 'Countries'})).toBeDisabled();
            fireEvent.change(within(group).getByRole('combobox', {name: 'Add a country to “First story”'}), {target: {value: 'Arub'}});
            fireEvent.click(within(group).getByRole('button', {name: 'Aruba'}));
            expect(within(group).getByRole('checkbox', {name: /Aruba/})).toBeChecked();
            expect(within(section).getByRole('checkbox', {name: 'Countries'})).toBeChecked();
            expect(within(section).getByRole('checkbox', {name: 'Countries'})).not.toBeDisabled();
            await sent({1: ['AW']});
        });

        it('should put off the countries a reader added by hand to a story that had none, with the box of its section', async () => {
            await openEditor([card(1, 'First story'), card(2, 'Second story')], 'First story');
            const section = carries('First story');
            const group = within(section).getByRole('group', {name: /Countries in the e-mail/});
            fireEvent.change(within(group).getByRole('combobox', {name: 'Add a country to “First story”'}), {target: {value: 'Arub'}});
            fireEvent.click(within(group).getByRole('button', {name: 'Aruba'}));
            fireEvent.click(within(section).getByRole('checkbox', {name: 'Countries'}));
            expect(within(group).getByRole('checkbox', {name: /Aruba/})).not.toBeChecked();
            // none found and none ticked is the default: nothing to send
            await sent({});
        });

        it('should tick again a country of the list that was unticked when its name is typed, not answer that none is left', async () => {
            await openEditor([{...card(1, 'First story'), countries: ['FR']}, card(2, 'Second story')], 'First story');
            const group = within(carries('First story')).getByRole('group', {name: /Countries in the e-mail/});
            fireEvent.click(within(group).getByRole('checkbox', {name: 'France'}));
            expect(within(group).getByRole('checkbox', {name: 'France'})).not.toBeChecked();
            fireEvent.change(within(group).getByRole('combobox', {name: 'Add a country to “First story”'}), {target: {value: 'fran'}});
            expect(within(group).queryByText(/No country left/)).toBeNull();
            fireEvent.click(within(group).getByRole('button', {name: 'France'}));
            expect(within(group).getByRole('checkbox', {name: 'France'})).toBeChecked();
            // as found again: no choice to send
            expect(screen.queryByText(/· countries changed/)).toBeNull();
            await sent({});
        });
    });

    // the title of a card is changed by default (its bait taken out, or rewritten by the AI): the editor offers the one the medium wrote
    describe('title as published', () => {
        const open = async (changes) => {
            const items = [{...card(1, 'Council votes the budget'), ...changes}, {...card(2, 'Second story')}];
            BriefingApi.getLatest.mockResolvedValue({mail: true, briefing: {...BRIEFING, items}});
            render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
            await screen.findByText('Council votes the budget');
            fireEvent.click(screen.getByRole('button', {name: 'Tick all the stories'}));
            fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
            fireEvent.click(screen.getByRole('button', {name: 'Edit “Council votes the budget” in the e-mail'}));
        };

        it('should show the title as the medium wrote it, and put it in the title of the e-mail when the reader asks', async () => {
            await open({titleAsPublished: 'Incredible news! Council votes the budget', language: 'en', titleRewritten: false});
            expect(screen.getByText('“Incredible news! Council votes the budget”')).toBeInTheDocument();
            const field = screen.getByLabelText('Its title in the e-mail');
            expect(field).toHaveValue('Council votes the budget');

            fireEvent.click(screen.getByRole('button', {name: 'Use the title as published'}));
            expect(field).toHaveValue('Incredible news! Council votes the budget');
            expect(screen.getByText(/· title changed/)).toBeInTheDocument();
            // it is the title now: nothing more to ask, and the card's own comes back with the button that was there
            expect(screen.getByRole('button', {name: 'Use the title as published'})).toBeDisabled();
            fireEvent.click(screen.getByRole('button', {name: 'Back to its own title'}));
            expect(field).toHaveValue('Council votes the budget');

            fireEvent.click(screen.getByRole('button', {name: 'Use the title as published'}));
            fireEvent.click(screen.getByRole('button', {name: 'Send'}));
            await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1, 2], 'reader@example.org', {}, {1: 'Incredible news! Council votes the budget'}, {}, undefined, [], {}, {}, 'light', expect.any(Object)));
        });

        it('should say the title as published is not translated when the card is', async () => {
            await open({title: 'Der Rat beschliesst das Budget', titleTranslation: 'Council votes the budget', titleAsPublished: 'Sensation: Der Rat beschliesst das Budget', language: 'de', titleRewritten: true});
            expect(screen.getByText(/Title as published \(German, not translated\)/)).toBeInTheDocument();
            expect(screen.getByText('“Sensation: Der Rat beschliesst das Budget”')).toBeInTheDocument();
        });

        it('should offer nothing for a card whose title is the one the medium wrote', async () => {
            await open({});
            expect(screen.queryByRole('button', {name: 'Use the title as published'})).toBeNull();
            expect(screen.queryByText(/Title as published/)).toBeNull();
        });
    });

    // the AI proposes a neutral title, the reader reads it against the title of the card and uses it or not (the user, 03.11.2026)
    describe('neutral title', () => {
        const openEditor = async (title = 'Incredible news! The council votes the budget') => {
            const items = [{...card(1, title)}, {...card(2, 'Second story')}];
            BriefingApi.getLatest.mockResolvedValue({mail: true, briefing: {...BRIEFING, items}});
            render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
            await screen.findByText(title);
            fireEvent.click(screen.getByRole('button', {name: 'Tick all the stories'}));
            fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
            fireEvent.click(screen.getByRole('button', {name: `Edit “${title}” in the e-mail`}));
        };
        const ASK = {name: /Suggest a neutral title/};
        const PROPOSAL = {name: 'Neutral title proposed by the AI'};

        it('should show the proposal against the title, what is taken out struck and what is put in underlined', async () => {
            BriefingApi.neutralTitle.mockResolvedValue({title: 'The council approves the budget'});
            await openEditor();
            fireEvent.click(screen.getByRole('button', ASK));
            const proposal = await screen.findByRole('group', PROPOSAL);
            expect(BriefingApi.neutralTitle).toHaveBeenCalledWith(9, 1);
            expect(within(proposal).getByText('Incredible').className).toContain('line-through');
            expect(within(proposal).getByText('news!').className).toContain('line-through');
            expect(within(proposal).getByText('approves').className).toContain('underline');
        });

        it('should put the proposal in the title field only when the reader uses it, and send it as the title of the e-mail', async () => {
            BriefingApi.neutralTitle.mockResolvedValue({title: 'The council votes the budget'});
            await openEditor();
            const field = screen.getByLabelText('Its title in the e-mail');
            fireEvent.click(screen.getByRole('button', ASK));
            await screen.findByRole('group', PROPOSAL);
            expect(field).toHaveValue('Incredible news! The council votes the budget');

            fireEvent.click(screen.getByRole('button', {name: 'Use this title'}));
            expect(field).toHaveValue('The council votes the budget');
            expect(screen.queryByRole('group', PROPOSAL)).toBeNull();
            expect(screen.getByText(/· title changed/)).toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', {name: 'Send'}));
            await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1, 2], 'reader@example.org', {}, {1: 'The council votes the budget'}, {}, undefined, [], {}, {}, 'light', expect.any(Object)));
        });

        it('should leave the title as it is when the reader keeps it', async () => {
            BriefingApi.neutralTitle.mockResolvedValue({title: 'The council votes the budget'});
            await openEditor();
            fireEvent.click(screen.getByRole('button', ASK));
            await screen.findByRole('group', PROPOSAL);
            fireEvent.click(screen.getByRole('button', {name: 'Keep the title'}));
            expect(screen.getByLabelText('Its title in the e-mail')).toHaveValue('Incredible news! The council votes the budget');
            expect(screen.queryByText(/· title changed/)).toBeNull();
        });

        it('should say when the title is neutral already, and when the AI changed what it says so nothing is shown', async () => {
            BriefingApi.neutralTitle.mockResolvedValueOnce({title: null, reason: 'same'});
            await openEditor('The council votes the budget');
            fireEvent.click(screen.getByRole('button', ASK));
            expect(await screen.findByText('This title is neutral already: nothing to change.')).toBeInTheDocument();

            BriefingApi.neutralTitle.mockResolvedValueOnce({title: null, reason: 'unsafe'});
            fireEvent.click(screen.getByRole('button', ASK));
            expect(await screen.findByText(/changed what the title says, so it is not shown/)).toBeInTheDocument();
            expect(screen.queryByRole('group', PROPOSAL)).toBeNull();
        });

        it('should say when the AI could not be asked, and leave the title alone', async () => {
            BriefingApi.neutralTitle.mockRejectedValue(new Error('The AI did not answer.'));
            await openEditor();
            fireEvent.click(screen.getByRole('button', ASK));
            expect(await screen.findByRole('alert')).toHaveTextContent('No neutral title: The AI did not answer.');
            expect(screen.getByLabelText('Its title in the e-mail')).toHaveValue('Incredible news! The council votes the budget');
        });
    });

    // light at first, dark when the reader chooses it, and the choice is for that e-mail only (the user, 02.11.2026)
    it('should send the e-mail in light colours, and in dark ones when the reader chooses them', async () => {
        await renderPage();
        fireEvent.click(screen.getAllByRole('checkbox', BOX)[0]);
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        const colours = screen.getByRole('group', {name: 'E-mail colours'});
        expect(within(colours).getByRole('radio', {name: 'Light'})).toBeChecked();
        expect(within(colours).getByRole('radio', {name: 'Dark'})).not.toBeChecked();

        fireEvent.click(within(colours).getByRole('radio', {name: 'Dark'}));
        expect(within(colours).getByRole('radio', {name: 'Dark'})).toBeChecked();
        // one of them always chosen: a second click on the one chosen changes nothing
        fireEvent.click(within(colours).getByRole('radio', {name: 'Dark'}));
        expect(within(colours).getByRole('radio', {name: 'Dark'})).toBeChecked();
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1], 'reader@example.org', {}, {}, {}, undefined, [], {}, {}, 'dark', expect.any(Object)));

        // sent: the next e-mail is light again
        await waitFor(() => expect(screen.queryByRole('button', {name: 'Send email'})).toBeNull());
        fireEvent.click(screen.getAllByRole('checkbox', BOX)[0]);
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        expect(within(screen.getByRole('group', {name: 'E-mail colours'})).getByRole('radio', {name: 'Light'})).toBeChecked();
    });

    it('should leave out of the e-mail the official source the reader unticks', async () => {
        const items = [{...card(1, 'First story'),
            official: [{party: 'UEFA', title: 'Čeferin seeks final term', url: 'https://www.uefa.com/n', channel: 'site', publishedAt: null}],
        }];
        BriefingApi.getLatest.mockResolvedValue({mail: true, briefing: {...BRIEFING, items}});
        render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
        await screen.findByText('First story');
        fireEvent.click(screen.getByRole('button', {name: 'Tick all the stories'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));

        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        showSection('Official source');
        const aside = screen.getByRole('group', {name: 'The official sources of “First story”'});
        expect(aside).toHaveTextContent('UEFA said it: Čeferin seeks final term');
        fireEvent.click(aside.querySelector('input[type=checkbox]'));
        expect(screen.getByText(/1 official source taken out/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1], 'reader@example.org', {}, {}, {1: {official: [0]}}, undefined, [], {}, {}, 'light', expect.any(Object)));
    });

    it('should join an image of the reader, and refuse a file that is not one', async () => {
        await renderPage();
        fireEvent.click(screen.getAllByRole('checkbox', BOX)[0]);
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        showSection('Picture');
        const input = await screen.findByLabelText('An image of yours for “First story”');

        fireEvent.change(input, {target: {files: [new File(['<svg/>'], 'a.svg', {type: 'image/svg+xml'})]}});
        expect(screen.getByText('A JPEG, PNG, GIF or WebP image.')).toBeInTheDocument();

        fireEvent.change(input, {target: {files: [new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'photo.png', {type: 'image/png'})]}});
        await screen.findByText('Your image: photo.png, joined to the e-mail.');
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1], 'reader@example.org', {1: {data: 'iVBORw=='}}, {}, {}, undefined, [], {}, {}, 'light', expect.any(Object)));
    });

    it('should tick them all, and untick them all', async () => {
        await renderPage();

        fireEvent.click(screen.getByRole('button', {name: 'Tick all the stories'}));
        expect(screen.getByText(/3 stories ticked/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Untick all'}));
        expect(screen.queryByRole('button', {name: 'Send email'})).toBeNull();
    });

    // the line over the cards and the form to add a news took a band of the page: they are round icons in the toolbar (the user, 05.11.2026)
    it('should have the tools in the toolbar, and no band of the page over the cards', async () => {
        await renderPage();
        expect(screen.queryByText(/Tick the stories to send them by e-mail/)).toBeNull();
        expect(screen.getByRole('button', {name: 'Tick all the stories'})).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByRole('button', {name: 'Add a news by its link'})).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('https://…')).toBeNull();
    });

    // on a phone the three tools have their words, there is room for them (the user, 05.11.2026); on a wider screen only their icons
    it('should give the tools their words for a phone, hidden from a tablet up, and not read them twice', async () => {
        await renderPage();
        for (const [name, words] of [['Tick all the stories', 'Tick all'], ['Add a news by its link', 'Add a news']]) {
            const tool = screen.getByRole('button', {name});
            expect(tool).toHaveTextContent(words);
            const text = within(tool).getByText(words);
            expect(text).toHaveClass('md:hidden');
            expect(text).toHaveAttribute('aria-hidden', 'true');
            expect(tool.className).toMatch(/max-md:w-auto/);
        }
        fireEvent.click(screen.getByRole('button', {name: 'Tick all the stories'}));
        expect(screen.getByRole('button', {name: 'Untick all the stories'})).toHaveTextContent('Untick all');
    });

    it('should tick every story from the toolbar, and untick them from the same button', async () => {
        await renderPage();
        fireEvent.click(screen.getByRole('button', {name: 'Tick all the stories'}));
        expect(screen.getByRole('button', {name: 'Untick all the stories'})).toHaveAttribute('aria-pressed', 'true');
        screen.getAllByRole('checkbox', BOX).forEach(box => expect(box).toBeChecked());
        fireEvent.click(screen.getByRole('button', {name: 'Untick all the stories'}));
        screen.getAllByRole('checkbox', BOX).forEach(box => expect(box).not.toBeChecked());
        expect(screen.getByRole('button', {name: 'Tick all the stories'})).toBeInTheDocument();
    });

    it('should add a news from the panel of its icon, and close the panel once it is added', async () => {
        BriefingApi.addNews.mockResolvedValue({item: card(4, 'Added story'), analysis: null, analyzing: false});
        await renderPage();
        fireEvent.click(screen.getByRole('button', {name: 'Add a news by its link'}));
        const field = await screen.findByPlaceholderText('https://…');
        fireEvent.change(field, {target: {value: 'https://media4.fr/story'}});
        fireEvent.click(screen.getByRole('button', {name: 'Add'}));
        await waitFor(() => expect(BriefingApi.addNews).toHaveBeenCalledWith(9, 'https://media4.fr/story'));
        await screen.findByText('Added story');
        await waitFor(() => expect(screen.queryByPlaceholderText('https://…')).toBeNull());
    });

    // the AI analysis is seen on the story itself: no tool for it in the toolbar, with an analysis or without (the user, 05.11.2026)
    it('should have no tool for the AI analysis in the toolbar, whether the briefing has analyses or not', async () => {
        BriefingApi.getLatest.mockResolvedValue({briefing: {...BRIEFING, analysis: {status: 'ready', picked: [{storyId: 1}, {storyId: 3}],
            cards: {1: {why: ['One.'], next: [], timeline: []}, 3: {why: ['Three.'], next: [], timeline: []}}}}, mail: true});
        render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
        await screen.findByText('First story');
        expect(screen.queryByRole('button', {name: /AI analysis of the stories/})).toBeNull();
        expect(screen.queryByText(/The AI wrote an analysis of the stories that need one/)).toBeNull();
        // the two other tools are there
        expect(screen.getByRole('button', {name: 'Tick all the stories'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Add a news by its link'})).toBeInTheDocument();
    });

    it('should show no tool for the e-mail without an account', async () => {
        await renderPage(false);
        expect(screen.queryByRole('button', {name: 'Add a news by its link'})).toBeNull();
        expect(screen.queryByRole('button', {name: 'Tick all the stories'})).toBeNull();
    });

    it('should show no box when the server has no e-mail account', async () => {
        await renderPage(false);
        expect(screen.queryAllByRole('checkbox', BOX)).toHaveLength(0);
        expect(screen.queryByRole('button', {name: 'Tick all the stories'})).toBeNull();
    });
});

describe('BriefingPage stories of the terms followed', () => {
    afterEach(() => vi.clearAllMocks());

    it('should show alone, on demand, the stories naming a term followed, at their place and marked', async () => {
        const items = [
            card(1, 'First story'),
            {...card(2, 'The VAR story'), marks: {title: [[4, 7]]}, found: [{term: 'VAR', angle: false}]},
            {...card(3, 'Third story'), found: [{term: 'Infantino', angle: true}]},
        ];
        BriefingApi.getLatest.mockResolvedValue({briefing: {...BRIEFING, items}, mail: false});
        const {container} = render(<MemoryRouter><WithSession user={{id: 4, username: 'reader'}}><BriefingPage/></WithSession></MemoryRouter>);
        await screen.findByText('First story');
        expect(container.querySelectorAll('mark')).toHaveLength(0);

        fireEvent.click(screen.getByRole('button', {name: 'What you follow, found · 2 stories'}));
        expect(screen.queryByText('First story')).toBeNull();
        expect(container.querySelectorAll('article')).toHaveLength(2);
        expect([...container.querySelectorAll('mark')].map(mark => mark.textContent)).toEqual(['VAR']);
        expect(screen.getByText('Infantino (other angle)')).toBeInTheDocument();
        expect(screen.getByText('03')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Show the whole briefing'}));
        expect(screen.getByText('First story')).toBeInTheDocument();
        expect(container.querySelectorAll('mark')).toHaveLength(0);
    });

    it('should show no button when no story names a term followed', async () => {
        await renderPage();
        expect(screen.queryByRole('button', {name: /What you follow, found/})).toBeNull();
    });
});
