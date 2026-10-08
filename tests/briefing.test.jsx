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
import {coverageLabel} from '@/features/briefing/corroboration.js';

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

describe('coverageLabel of the texts read', () => {
    it('should never count ten copies of one wire as ten confirmations', () => {
        expect(coverageLabel({media: 10, read: 5, independent: 1, agencies: ['AFP']}).text)
            .toBe('Told by 10 media, one single text republished · wire: AFP');
    });

    it('should say how many texts were written apart among the ones read', () => {
        expect(coverageLabel({media: 4, read: 3, independent: 3}).text).toBe('Told by 4 media, 3 texts written independently of 3 read');
    });

    it('should not claim anything when too few texts could be read', () => {
        expect(coverageLabel({media: 4, read: 1, independent: 1}).text).toBe('Told by 4 media, too few texts could be read to compare them');
        expect(coverageLabel({media: 1, read: 1, independent: 1}).text).toBe('Only one medium');
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

    it('should send to read the article of the passages, and name the others as covering it', () => {
        render(<BriefingCard item={item({lead: article(2)})}/>);
        expect(screen.getByRole('link', {name: /Read the article at media2.fr/})).toHaveAttribute('href', 'https://media2.fr/story');
        expect(screen.getByText(/as the article of media2.fr published them/)).toBeInTheDocument();
        expect(screen.getByText(/Also covered by/)).toHaveTextContent('Also covered by media1.fr, media3.fr');
    });

    it('should send to its first article a card of a briefing made before the article of the passages was given', () => {
        render(<BriefingCard item={item()}/>);
        expect(screen.getByRole('link', {name: /Read the article at media1.fr/})).toBeInTheDocument();
    });

    it('should say when no article could be read, and when the article itself has no confirmation', () => {
        render(<BriefingCard item={item({summary: null, hedged: 'selon nos informations'})}/>);
        expect(screen.getByText(/could be read/)).toBeInTheDocument();
        expect(screen.getByText(/selon nos informations/)).toBeInTheDocument();
    });

    it('should name the first media of a big story, and all of them on demand', () => {
        render(<BriefingCard item={item({articles: Array.from({length: 12}, (_, i) => article(i + 1))})}/>);
        // the article to read and 8 others
        expect(screen.getAllByRole('link')).toHaveLength(9);
        fireEvent.click(screen.getByRole('button', {name: 'and 3 more'}));
        expect(screen.getAllByRole('link')).toHaveLength(12);
    });
});

describe('BriefingCard explanations', () => {
    it('should say what its sources mean on a tap of the "i", where nothing is hovered', async () => {
        render(<BriefingCard item={item()}/>);
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'What “named sources” means'}));
        expect(await screen.findByRole('tooltip')).toHaveTextContent(/names who it quotes: a person, a club, an institution/);
    });

    it('should name the media telling it in the explanation of who tells it', async () => {
        render(<BriefingCard item={item()}/>);
        fireEvent.click(screen.getByRole('button', {name: /What “Told by 3 media/}));
        expect(await screen.findByRole('tooltip')).toHaveTextContent('Media: a.fr, b.fr, c.fr.');
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
    it('should show the translated passages with a gap between them, and the original only when asked', () => {
        render(<BriefingCard item={item({language: 'en', summary: 'He was fined $10,000.\n\nThe appeal was heard on Thursday.',
            translation: 'Il a reçu une amende de 10 000 $.\n\nL\'appel a été entendu jeudi.'})}/>);
        expect(screen.getByText('Il a reçu une amende de 10 000 $.')).toBeInTheDocument();
        expect(screen.getAllByText('[…]')).toHaveLength(1);
        expect(screen.getByText(/the original is the reference/)).toBeInTheDocument();
        expect(screen.queryByText('He was fined $10,000.')).toBeNull();

        fireEvent.click(screen.getByRole('button', {name: 'Show original'}));
        expect(screen.getByText('He was fined $10,000.')).toBeInTheDocument();
        expect(screen.getAllByText('[…]')).toHaveLength(2);
        fireEvent.click(screen.getByRole('button', {name: 'Hide original'}));
        expect(screen.queryByText('He was fined $10,000.')).toBeNull();
    });

    it('should show no translation for an article in the language of the reader', () => {
        render(<BriefingCard item={item()}/>);
        expect(screen.queryByText(/translated/i)).toBeNull();
        expect(screen.queryByRole('button', {name: 'Show original'})).toBeNull();
    });

    it('should show a translated title, and the title as written once the original is shown', () => {
        render(<BriefingCard item={item({title: 'Thierno Barry goal decision upheld', language: 'en',
            titleTranslation: 'La décision sur le but de Thierno Barry maintenue'})}/>);
        expect(screen.getByRole('heading', {name: 'La décision sur le but de Thierno Barry maintenue'})).toBeInTheDocument();
        expect(screen.getByText('Translated from English')).toBeInTheDocument();
        expect(screen.queryByText('“Thierno Barry goal decision upheld”')).toBeNull();
        fireEvent.click(screen.getByRole('button', {name: 'Show original'}));
        expect(screen.getByText('“Thierno Barry goal decision upheld”')).toBeInTheDocument();
    });
});

describe('BriefingCard contested', () => {
    const denial = {by: 'Manchester City', sentence: 'Manchester City denies any wrongdoing.', language: 'en', translation: null,
        source: 'bbc.com', url: 'https://bbc.com/city', publishedAt: '2026-09-24T09:00:00.000Z'};

    it('should quote who denies the news and where, with a machine translation marked as such', () => {
        render(<BriefingCard item={item({contested: [{...denial, translation: 'Manchester City nie toute faute.'}]})}/>);
        expect(screen.getByText('Contested')).toBeInTheDocument();
        expect(screen.getByText('Manchester City denies:')).toBeInTheDocument();
        expect(screen.getByText('“Manchester City denies any wrongdoing.”')).toBeInTheDocument();
        expect(screen.getByText('Machine translation: “Manchester City nie toute faute.”')).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'bbc.com'})).toHaveAttribute('href', 'https://bbc.com/city');
    });

    it('should say nothing on a card nobody denies, or of a briefing made before', () => {
        render(<BriefingCard item={item({contested: []})}/>);
        render(<BriefingCard item={item()}/>);
        expect(screen.queryByText('Contested')).toBeNull();
    });
});

describe('BriefingCard other angles', () => {
    const angle = {title: 'Infantino tiene por ahora el camino despejado', titleTranslation: 'Infantino a pour l’instant le chemin dégagé',
        url: 'https://si.com/infantino', source: 'si.com', language: 'es', publishedAt: '2026-10-08T07:00:00.000Z', media: 3};

    it('should list the other angles, translated, with their source, language and media', () => {
        render(<BriefingCard item={item({angles: [angle]})}/>);
        expect(screen.getByText('Same affair, other angles')).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Infantino a pour l’instant le chemin dégagé'})).toHaveAttribute('href', 'https://si.com/infantino');
        expect(screen.getByText(/told by 3 media/)).toBeInTheDocument();
        expect(screen.getByLabelText('written in Spanish')).toBeInTheDocument();
        expect(screen.queryByText('“Infantino tiene por ahora el camino despejado”')).toBeNull();
    });

    it('should show the original title of an angle with the original of the card', () => {
        render(<BriefingCard item={item({title: 'Summit in Berlin', language: 'en', titleTranslation: 'Sommet à Berlin', angles: [angle]})}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Show original'}));
        expect(screen.getByText('“Infantino tiene por ahora el camino despejado”')).toBeInTheDocument();
    });

    it('should say nothing on a card without any, or of a briefing made before', () => {
        render(<BriefingCard item={item({angles: []})}/>);
        render(<BriefingCard item={item()}/>);
        expect(screen.queryByText('Same affair, other angles')).toBeNull();
    });
});
