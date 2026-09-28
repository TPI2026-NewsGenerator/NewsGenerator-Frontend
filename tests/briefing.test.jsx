//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: briefing.test.jsx
//  Description: A story of the briefing: what the reader is told about who tells it, and its sources
//

import '@testing-library/jest-dom';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {BriefingCard} from '@/features/briefing/components/BriefingCard.jsx';
import {corroborationLabel} from '@/features/briefing/corroboration.js';

const article = (n) => ({title: `Article ${n}`, url: `https://media${n}.fr/story`, source: `media${n}.fr`, publishedAt: '2026-09-24T10:00:00.000Z'});

const item = (changes = {}) => ({
    storyId: 1,
    title: 'Toulon bat Vannes au bout du suspense',
    why: 'Du Top 14, que vous suivez.',
    summary: 'Premier paragraphe.\n\nSecond paragraphe.',
    topic: 'sport',
    sourcing: 'named',
    hedged: null,
    publishedAt: '2026-09-24T10:00:00.000Z',
    corroboration: {media: 3, read: 3, independent: 2, agencies: [], mediaNames: ['a.fr', 'b.fr', 'c.fr']},
    articles: [article(1), article(2), article(3)],
    ...changes,
});

describe('corroborationLabel', () => {
    it('should never count ten copies of one wire as ten confirmations', () => {
        expect(corroborationLabel({media: 10, read: 5, independent: 1, agencies: ['AFP']}))
            .toEqual({color: 'orange', text: 'Told by 10 media, one single text republished · wire: AFP'});
    });

    it('should say how many texts were written apart among the ones read', () => {
        expect(corroborationLabel({media: 4, read: 3, independent: 3}).text).toBe('Told by 4 media, 3 texts written independently of 3 read');
    });

    it('should not claim anything when too few texts could be read', () => {
        expect(corroborationLabel({media: 4, read: 1, independent: 1}).color).toBe('blue');
        expect(corroborationLabel({media: 1, read: 1, independent: 1}).text).toBe('Only one medium');
    });
});

describe('BriefingCard', () => {
    it('should show why the story was chosen, its summary and its sources', () => {
        render(<BriefingCard item={item()}/>);
        expect(screen.getByText('Du Top 14, que vous suivez.')).toBeInTheDocument();
        expect(screen.getByText('Second paragraphe.')).toBeInTheDocument();
        expect(screen.getByText('named sources')).toBeInTheDocument();
        expect(screen.getByText(/2 texts written independently of 3 read/)).toBeInTheDocument();
        expect(screen.getAllByRole('link')).toHaveLength(3);
    });

    it('should say when no article could be read, and when the article itself has no confirmation', () => {
        render(<BriefingCard item={item({summary: null, hedged: 'selon nos informations'})}/>);
        expect(screen.getByText(/could be read/)).toBeInTheDocument();
        expect(screen.getByText(/selon nos informations/)).toBeInTheDocument();
    });

    it('should show the first articles of a big story, and all of them on demand', () => {
        render(<BriefingCard item={item({articles: [1, 2, 3, 4, 5, 6].map(article)})}/>);
        expect(screen.getAllByRole('link')).toHaveLength(4);
        fireEvent.click(screen.getByRole('button', {name: 'Show the 6 articles'}));
        expect(screen.getAllByRole('link')).toHaveLength(6);
    });
});

describe('BriefingCard thumbs', () => {
    it('should give a thumb, and take it back with a second click', () => {
        const onVote = vi.fn();
        const {rerender} = render(<BriefingCard item={item({vote: null})} onVote={onVote}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Good for me'}));
        expect(onVote).toHaveBeenLastCalledWith('up');

        rerender(<BriefingCard item={item({vote: 'up'})} onVote={onVote}/>);
        expect(screen.getByRole('button', {name: 'Good for me'})).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', {name: 'Good for me'}));
        expect(onVote).toHaveBeenLastCalledWith(null);
        fireEvent.click(screen.getByRole('button', {name: 'Not for me'}));
        expect(onVote).toHaveBeenLastCalledWith('down');
    });

    it('should show no thumb without onVote', () => {
        render(<BriefingCard item={item()}/>);
        expect(screen.queryByRole('button', {name: 'Good for me'})).toBeNull();
    });
});

describe('BriefingCard and a trusted source', () => {
    it('should mark the article of a source the reader trusts', () => {
        render(<BriefingCard item={item({articles: [{...article(1), trusted: true}, article(2)]})}/>);
        expect(screen.getAllByLabelText('a source you trust')).toHaveLength(1);
    });
});

describe('BriefingCard passages', () => {
    it('should show the passages of the article with a gap between them, and a translation marked as such', () => {
        render(<BriefingCard item={item({summary: 'He was fined $10,000.\n\nThe appeal was heard on Thursday.',
            translation: 'Il a reçu une amende de 10 000 $.\n\nL\'appel a été entendu jeudi.'})}/>);
        expect(screen.getByText('He was fined $10,000.')).toBeInTheDocument();
        expect(screen.getAllByText('[…]')).toHaveLength(2);
        expect(screen.getByText('Machine translation')).toBeInTheDocument();
        expect(screen.getByText('Il a reçu une amende de 10 000 $.')).toBeInTheDocument();
        expect(screen.getByText(/the original above is the reference/)).toBeInTheDocument();
    });

    it('should show no translation for an article in the language of the reader', () => {
        render(<BriefingCard item={item()}/>);
        expect(screen.queryByText('Machine translation')).toBeNull();
    });
});
