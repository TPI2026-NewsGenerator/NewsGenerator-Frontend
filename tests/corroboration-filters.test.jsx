//
//  Author: Fabian Rostello
//  Date: 23.09.2026
//  File: corroboration-filters.test.jsx
//  Description: The filters on what the grouping measured: how widely a news is carried, and
//               whether the article says itself it has no confirmation
//

import '@testing-library/jest-dom';
import { it, expect, describe } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FeedList } from '@/features/search/components/feed-list/FeedList.jsx';

const news = (title, {media = 1, wordings = 1, hedged = null} = {}) => ({
    url: `https://example.com/${title.replace(/\s+/g, '-')}`,
    source: 'example.com',
    publishedAt: '2026-09-23T10:00:00.000Z',
    title: title,
    description: '',
    thumbnail: null,
    topic: null,
    sourcing: null,
    hedged: hedged,
    sources: [],
    corroboration: {media, wordings},
});

const NEWS = [
    news('Carried by three papers', {media: 3, wordings: 3}),
    news('Three papers, one wire', {media: 3, wordings: 1}),
    news('Only this one has it'),
    news('Nobody could confirm it', {hedged: 'reportedly'}),
    news('Nobody could confirm that either', {hedged: 'allegedly'}),
];

const openFilters = () => {
    render(<FeedList newsList={NEWS} onGenerate={() => {}} isGenerating={false}/>);
    fireEvent.click(screen.getByRole('button', {name: /filter/i}));
};

// the pickers are native selects: the option is found by its text, and chosen by its value
const choose = (label, option) => {
    const picker = screen.getByLabelText(label);
    fireEvent.change(picker, {target: {value: within(picker).getByRole('option', {name: option}).value}});
};

const apply = () => fireEvent.click(screen.getByRole('button', {name: /apply filters/i}));
const kept = () => screen.getByText(/kept by the filters/).textContent.match(/(\d+) kept/)[1];

describe('filtering on how widely a news is carried', () => {
    it('keeps only the news several media tell', () => {
        openFilters();
        choose('How widely it is carried', 'Carried by several media');
        apply();

        expect(kept()).toBe('2');
    });

    it('a wire republished by three papers is one wording, so it is left out', () => {
        openFilters();
        choose('How widely it is carried', 'Several media, each its own wording');
        apply();

        // only "Carried by three papers" has several wordings, the wire has one
        expect(kept()).toBe('1');
    });

    it('keeps the news no other medium carries', () => {
        openFilters();
        choose('How widely it is carried', 'This source only');
        apply();

        expect(kept()).toBe('3');
    });
});

describe('filtering on the words the article used to hedge', () => {
    it('keeps every article saying it has no confirmation', () => {
        openFilters();
        choose('The article says it has no confirmation', 'Any of these words');
        apply();

        expect(kept()).toBe('2');
    });

    it('offers the words really present, and keeps the articles using the chosen one', () => {
        openFilters();
        // the list is built from these results, not from a list of our own
        choose('The article says it has no confirmation', '"reportedly"');
        apply();

        expect(kept()).toBe('1');
    });
});
