//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: marks.test.jsx
//  Description: The terms the profile follows marked where the server found them: in the title, the
//               passages and the other angles of a card, and in the news of the terms followed
//

import '@testing-library/jest-dom';
import {describe, expect, it} from 'vitest';
import {render} from '@testing-library/react';
import {paragraphsWithMarks, segmentsOf} from '@/features/briefing/marks.js';
import {BriefingCard} from '@/features/briefing/components/BriefingCard.jsx';
import {WatchedNews} from '@/features/briefing/components/WatchedNews.jsx';

const marked = (container) => [...container.querySelectorAll('mark')].map(mark => mark.textContent);

describe('segmentsOf and paragraphsWithMarks', () => {
    it('should cut a text at the places of the terms', () => {
        expect(segmentsOf('La VAR a parlé', [[3, 6]])).toEqual([
            {text: 'La ', marked: false}, {text: 'VAR', marked: true}, {text: ' a parlé', marked: false},
        ]);
        // places out of the text or overlapping are left out, never a crash
        expect(segmentsOf('VAR', [[0, 3], [1, 2], [5, 9]])).toEqual([{text: 'VAR', marked: true}]);
    });

    it('should give each paragraph the places of the terms in it, from its own start', () => {
        expect(paragraphsWithMarks('La VAR a parlé.\n\nInfantino aussi.', [[3, 6], [17, 26]])).toEqual([
            {text: 'La VAR a parlé.', marks: [[3, 6]]},
            {text: 'Infantino aussi.', marks: [[0, 9]]},
        ]);
        expect(paragraphsWithMarks(null, [])).toEqual([]);
    });
});

describe('BriefingCard and WatchedNews marks', () => {
    const item = {
        storyId: 1, title: 'Infantino face à la VAR', summary: 'La VAR a parlé.\n\nInfantino aussi.', articles: [],
        corroboration: {media: 1, read: 1, independent: 1, agencies: []},
        marks: {title: [[0, 9], [20, 23]], summary: [[3, 6], [17, 26]]},
        found: [{term: 'Infantino', angle: false}, {term: 'VAR', angle: false}, {term: 'Malagò', angle: true}],
        angles: [{title: 'La VAR au Nigeria', url: 'https://rfi.fr/n', source: 'rfi.fr', marks: {title: [[3, 6]]}}],
    };

    it('should mark the terms in the title, the passages and the other angles of a card, and say which it names', () => {
        const {container, getByText} = render(<BriefingCard item={item} marked/>);
        expect(marked(container)).toEqual(['Infantino', 'VAR', 'VAR', 'Infantino', 'VAR']);
        expect(getByText('Infantino · VAR · Malagò (other angle)')).toBeInTheDocument();
        expect(container.querySelector('h2')).toHaveTextContent('Infantino face à la VAR');
    });

    it('should show a card as written when it is not asked marked, and one of a briefing made before the marks', () => {
        const {container, queryByText} = render(<BriefingCard item={item}/>);
        expect(marked(container)).toEqual([]);
        expect(queryByText('Found')).toBeNull();
        const older = render(<BriefingCard item={{...item, marks: undefined, found: undefined, angles: []}} marked/>).container;
        expect(marked(older)).toEqual([]);
        expect(older.querySelector('h2')).toHaveTextContent('Infantino face à la VAR');
    });

    it('should show the words around the term when the title does not name it, the term marked', () => {
        const {container, getByText} = render(<WatchedNews watched={[{term: 'VAR', count: 1, news: [
            {title: 'Un match nul', url: 'https://x/1', source: 'x.fr', excerpt: '…la VAR a annulé le but…', marks: {excerpt: [[4, 7]]}},
        ]}]}/>);
        expect(getByText(/a annulé le but/)).toBeInTheDocument();
        expect(marked(container)).toEqual(['VAR']);
    });
});
