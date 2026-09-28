//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: search-meaning.test.jsx
//  Description: A search written as a sentence: the news answering it, then the ones close to it,
//               and what the reader is told when none answers
//

import '@testing-library/jest-dom';
import { it, expect, describe } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedList } from '@/features/search/components/feed-list/FeedList.jsx';

const news = (title, match) => ({
    url: `https://example.com/${title.replace(/\s+/g, '-')}`,
    source: 'example.com',
    publishedAt: '2026-09-28T10:00:00.000Z',
    title: title,
    description: '',
    thumbnail: null,
    topic: null,
    sourcing: null,
    hedged: null,
    sources: [],
    corroboration: {media: 1, wordings: 1},
    match: match,
});

const NEWS = [news('The bridge closes to cars', 'answer'), news('The council votes the budget', 'answer'), news('Works on the lake road', 'related')];

describe('FeedList of a search by meaning', () => {
    it('should count the answers and mark where the news only close to the search start', () => {
        render(<FeedList newsList={NEWS} onGenerate={() => {}} isGenerating={false} mode="meaning" checked/>);
        expect(screen.getByText(/2 news answer your search, 1 is close to it/)).toBeInTheDocument();

        const rows = screen.getAllByRole('listitem');
        expect(rows[2]).toHaveTextContent('Close to your search');
        expect(rows[1]).not.toHaveTextContent('Close to your search');
    });

    it('should say when the AI could not sort them', () => {
        render(<FeedList newsList={NEWS.map(item => ({...item, match: null}))} onGenerate={() => {}} isGenerating={false} mode="meaning" checked={false}/>);
        expect(screen.getByText(/the news closest in meaning to your search/)).toBeInTheDocument();
        expect(screen.queryByText('Close to your search')).not.toBeInTheDocument();
    });

    it('should tell that no news answers, and show nothing before a search', () => {
        const {container, rerender} = render(<FeedList newsList={[]} onGenerate={() => {}} isGenerating={false}/>);
        expect(container).toBeEmptyDOMElement();

        rerender(<FeedList newsList={[]} onGenerate={() => {}} isGenerating={false} mode="meaning"/>);
        expect(screen.getByText('No news answers your search in this period.')).toBeInTheDocument();
    });
});
