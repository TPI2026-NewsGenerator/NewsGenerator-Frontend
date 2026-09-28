//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: thread-timeline.test.jsx
//  Description: A card of the search showing its affair: the facts in their order, the ones the
//               search did not find marked, each one chosen on its own for its key passages
//

import '@testing-library/jest-dom';
import { it, expect, describe, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FeedList } from '@/features/search/components/feed-list/FeedList.jsx';

const fact = (title, day, found = true, media = 1) => ({
    url: `https://example.com/${title.replace(/\s+/g, '-')}`,
    source: 'example.com',
    publishedAt: `2026-09-${day}T10:00:00.000Z`,
    title,
    description: '',
    thumbnail: null,
    sources: [],
    corroboration: {media, wordings: 1},
    found,
});

const preview = fact('What to expect from the final', 25, false, 3);
const result = fact('The Liberty win the final', 27, true, 5);
const reactions = fact('Reactions after the final', 28, true, 2);
const card = {...result, match: 'answer', facts: [preview, result, reactions]};

describe('the affair of a card', () => {
    it('should show the facts of the affair in their order, the card\'s own and the ones not found marked', () => {
        render(<FeedList newsList={[card]} onGenerate={() => {}} isGenerating={false} mode="meaning" checked/>);

        const affair = screen.getByRole('region', {name: 'The affair'});
        expect(affair).toHaveTextContent('3 facts');
        const facts = within(affair).getAllByRole('listitem');
        expect(facts.map(item => within(item).getByRole('link').textContent)).toEqual([preview.title, result.title, reactions.title]);
        expect(facts[0]).toHaveTextContent('also in the affair');
        expect(facts[0]).toHaveTextContent('3 media');
        expect(facts[1]).toHaveTextContent('this news');
        // the card's own fact is chosen with the card, the others each on their own
        expect(within(affair).getAllByRole('checkbox')).toHaveLength(2);
    });

    it('should choose a fact of the affair for its key passages', () => {
        const onGenerate = vi.fn();
        render(<FeedList newsList={[card]} onGenerate={onGenerate} isGenerating={false} mode="meaning" checked/>);

        fireEvent.click(screen.getByRole('checkbox', {name: `Select “${preview.title}” for its key passages`}));
        fireEvent.click(screen.getByRole('button', {name: 'Show the key passages'}));

        expect(onGenerate).toHaveBeenCalledWith([preview.url]);
    });

    it('should fold a long affair until asked', () => {
        const long = {...card, facts: [preview, fact('Team news', 26), result, reactions, fact('The parade', 29)]};
        render(<FeedList newsList={[long]} onGenerate={() => {}} isGenerating={false} mode="meaning" checked/>);

        const affair = screen.getByRole('region', {name: 'The affair'});
        expect(within(affair).queryAllByRole('listitem')).toHaveLength(0);
        fireEvent.click(within(affair).getByRole('button', {name: 'Follow it'}));
        expect(within(affair).getAllByRole('listitem')).toHaveLength(5);
    });

    it('should show no affair for a news in no thread', () => {
        render(<FeedList newsList={[{...result, facts: [result]}]} onGenerate={() => {}} isGenerating={false} mode="meaning" checked/>);
        expect(screen.queryByRole('region', {name: 'The affair'})).not.toBeInTheDocument();
    });
});
