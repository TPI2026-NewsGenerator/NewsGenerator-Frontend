//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: briefing-email.test.jsx
//  Description: The cards ticked in the briefing sent by the server to the address the reader confirms,
//               the one of the account written in, the boxes shown only when the server has an e-mail account
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {WithSession} from "./session.jsx";

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    BriefingApi: {getLatest: vi.fn(), start: vi.fn(), vote: vi.fn(), email: vi.fn(async () => {}), pictures: vi.fn(async () => ({pictures: [
        {url: 'https://cdn.example/first.jpg', source: 'media1.fr'}, {url: 'https://cdn.example/other.jpg', source: 'kicker.de'},
    ]}))},
    ProfileApi: {get: vi.fn(async () => ({profile: {text: 'Le football.', language: 'fr'}}))},
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
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1, 3], 'reader@example.org', {}, {}));
        await waitFor(() => expect(screen.queryByRole('button', {name: 'Send email'})).toBeNull());
        screen.getAllByRole('checkbox', BOX).forEach(box => expect(box).not.toBeChecked());
    });

    it('should send the stories in the order the reader gives them, their place in the briefing told', async () => {
        await renderPage();
        fireEvent.click(screen.getByRole('button', {name: 'tick them all'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));

        const order = screen.getByRole('list', {name: 'The stories of the e-mail, in their order'});
        expect(screen.getByRole('button', {name: 'Move “First story” up'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Move “Third story” down'})).toBeDisabled();
        // the first of the briefing second, the third first
        fireEvent.click(screen.getByRole('button', {name: 'Move “First story” down'}));
        fireEvent.click(screen.getByRole('button', {name: 'Move “Third story” up'}));
        fireEvent.click(screen.getByRole('button', {name: 'Move “Third story” up'}));
        expect([...order.querySelectorAll('li')].map(li => li.textContent)).toEqual([
            '01Third story03 in the briefingEdit', '02Second story02 in the briefingEdit', '03First story01 in the briefingEdit',
        ]);

        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [3, 2, 1], 'reader@example.org', {}, {}));
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

        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [2], 'reader@example.org', {}, {}));
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
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1], 'friend@example.org', {}, {}));
    });

    it('should send the picture the reader chose for a story, none for another, and their own for the others', async () => {
        BriefingApi.getLatest.mockResolvedValue({mail: true, briefing: {...BRIEFING, items: BRIEFING.items.map(item => ({
            ...item, thumbnail: `https://cdn.example/${item.storyId === 1 ? 'first' : item.storyId}.jpg`, thumbnailSource: item.lead.source,
        }))}});
        render(<MemoryRouter><WithSession user={{id: 4, username: 'reader', email: 'reader@example.org'}}><BriefingPage/></WithSession></MemoryRouter>);
        await screen.findByText('First story');
        fireEvent.click(screen.getByRole('button', {name: 'tick them all'}));
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));

        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        const own = await screen.findByRole('button', {name: 'The picture of media1.fr'});
        expect(BriefingApi.pictures).toHaveBeenCalledWith(9, 1);
        expect(own).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', {name: 'The picture of kicker.de'}));
        expect(screen.getByText(/picture changed/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Done'}));

        fireEvent.click(screen.getByRole('button', {name: 'Edit “Second story” in the e-mail'}));
        fireEvent.click(await screen.findByRole('button', {name: 'No picture'}));
        fireEvent.click(screen.getByRole('button', {name: 'Done'}));

        // the third: an address pasted, then back to its own
        fireEvent.click(screen.getByRole('button', {name: 'Edit “Third story” in the e-mail'}));
        fireEvent.change(await screen.findByLabelText('Or the address of an image'), {target: {value: 'https://web.example/a.png'}});
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
        }, {3: 'The third, told my way'}));
    });

    it('should join an image of the reader, and refuse a file that is not one', async () => {
        await renderPage();
        fireEvent.click(screen.getAllByRole('checkbox', BOX)[0]);
        fireEvent.click(screen.getByRole('button', {name: 'Send email'}));
        fireEvent.click(screen.getByRole('button', {name: 'Edit “First story” in the e-mail'}));
        const input = await screen.findByLabelText('An image of yours for “First story”');

        fireEvent.change(input, {target: {files: [new File(['<svg/>'], 'a.svg', {type: 'image/svg+xml'})]}});
        expect(screen.getByText('A JPEG, PNG, GIF or WebP image.')).toBeInTheDocument();

        fireEvent.change(input, {target: {files: [new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'photo.png', {type: 'image/png'})]}});
        await screen.findByText('Your image: photo.png, joined to the e-mail.');
        fireEvent.click(screen.getByRole('button', {name: 'Send'}));
        await waitFor(() => expect(BriefingApi.email).toHaveBeenCalledWith(9, [1], 'reader@example.org', {1: {data: 'iVBORw=='}}, {}));
    });

    it('should tick them all, and untick them all', async () => {
        await renderPage();

        fireEvent.click(screen.getByRole('button', {name: 'tick them all'}));
        expect(screen.getByText(/3 stories ticked/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Untick all'}));
        expect(screen.queryByRole('button', {name: 'Send email'})).toBeNull();
    });

    it('should show no box when the server has no e-mail account', async () => {
        await renderPage(false);
        expect(screen.queryAllByRole('checkbox', BOX)).toHaveLength(0);
        expect(screen.queryByRole('button', {name: 'tick them all'})).toBeNull();
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

        fireEvent.click(screen.getByRole('button', {name: 'Names and terms found · 2 stories'}));
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
        expect(screen.queryByRole('button', {name: /Names and terms found/})).toBeNull();
    });
});
