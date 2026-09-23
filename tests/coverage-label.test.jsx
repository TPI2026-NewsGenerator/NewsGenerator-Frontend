//
//  Author: Fabian Rostello
//  Date: 23.09.2026
//  File: coverage-label.test.jsx
//  Description: What a card claims about how widely a news is carried, and where it stops
//               claiming it is one news
//

import '@testing-library/jest-dom';
import { it, expect, describe } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Article } from '@/features/search/components/article/Article.jsx';

// 'others' is how many other articles are in the group, 'media' how many different media
const card = ({media = 1, wordings = 1, others = 0} = {}) => ({
    url: 'https://example.com/news',
    source: 'example.com',
    publishedAt: '2026-09-23T10:00:00.000Z',
    title: 'A news',
    description: '',
    thumbnail: null,
    topic: null,
    sourcing: null,
    hedged: null,
    sources: Array.from({length: others}, (_, i) => ({
        url: `https://other${i}.com/news`, source: `other${i}.com`, title: `Also this ${i}`, publishedAt: '',
    })),
    corroboration: {media, wordings},
});

const show = (news) => render(<Article id={news.url} onSelect={() => true} news={news}/>);

describe('what the card claims', () => {
    it('says so plainly when no other medium carries it', () => {
        show(card({media: 1, wordings: 1}));
        expect(screen.getByText('this source only')).toBeInTheDocument();
    });

    it('counts the media and the wordings of a small group', () => {
        show(card({media: 3, wordings: 3, others: 2}));
        expect(screen.getByText('3 media, 3 wordings')).toBeInTheDocument();
    });

    it('calls one text republished by three papers one wording', () => {
        show(card({media: 3, wordings: 1, others: 2}));
        expect(screen.getByText('3 media, same wording')).toBeInTheDocument();
    });
});

describe('a group too big to be one news', () => {
    it('stops implying one news from ten articles up', () => {
        show(card({media: 6, wordings: 6, others: 9}));

        expect(screen.getByText('6 media on this story')).toBeInTheDocument();
        expect(screen.queryByText('6 media, 6 wordings')).not.toBeInTheDocument();
    });

    it('still counts the wordings just under the limit', () => {
        show(card({media: 4, wordings: 4, others: 8}));
        expect(screen.getByText('4 media, 4 wordings')).toBeInTheDocument();
    });

    // eight papers on the diesel export ban is one news, and the card must say so plainly
    it('a real story told by eight papers keeps its precise count', () => {
        show(card({media: 4, wordings: 4, others: 7}));
        expect(screen.getByText('4 media, 4 wordings')).toBeInTheDocument();
    });

    it('a wire republished many times stays a wire, whatever the size', () => {
        // identical texts are one report however many papers ran it, which is worth saying
        show(card({media: 9, wordings: 1, others: 14}));
        expect(screen.getByText('9 media, same wording')).toBeInTheDocument();
    });

    it('warns in the tag title that the count is media on a story, not confirmations', () => {
        show(card({media: 6, wordings: 6, others: 9}));

        expect(screen.getByText('6 media on this story').closest('[title]'))
            .toHaveAttribute('title', expect.stringContaining('running story'));
    });
});
