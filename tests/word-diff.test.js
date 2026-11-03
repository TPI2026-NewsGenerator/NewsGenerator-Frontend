//
//  Author: Fabian Rostello
//  Date: 03.11.2026
//  File: word-diff.test.js
//  Description: What a rewrite of a title took out and put in, word by word
//

import {describe, expect, it} from 'vitest';
import {wordDiff} from '@/features/briefing/wordDiff.js';

const changed = (words) => words.filter(word => word.changed).map(word => word.text);

describe('wordDiff', () => {
    it('should mark the words taken out of the title and the ones put in', () => {
        const {before, after} = wordDiff('Incredible news! The council votes the budget', 'The council approves the budget');
        expect(changed(before)).toEqual(['Incredible', 'news!', 'votes']);
        expect(changed(after)).toEqual(['approves']);
    });

    it('should not count the punctuation or the case of a word as a change', () => {
        const {before, after} = wordDiff('Judges named for Europe!', 'Judges named in europe.');
        expect(changed(before)).toEqual(['for']);
        expect(changed(after)).toEqual(['in']);
    });

    it('should mark nothing in two equal titles, and everything in two titles with no word in common', () => {
        expect(changed(wordDiff('Same title', 'same  TITLE').before)).toEqual([]);
        const {before, after} = wordDiff('One two', 'Three four');
        expect([changed(before), changed(after)]).toEqual([['One', 'two'], ['Three', 'four']]);
    });

    it('should keep all the words, in order, whatever was changed', () => {
        const {before, after} = wordDiff('A b c', 'A c d');
        expect(before.map(word => word.text)).toEqual(['A', 'b', 'c']);
        expect(after.map(word => word.text)).toEqual(['A', 'c', 'd']);
    });

    it('should accept an empty text', () => {
        expect(wordDiff('', 'Words')).toEqual({before: [], after: [{text: 'Words', changed: true}]});
        expect(wordDiff(null, undefined)).toEqual({before: [], after: []});
    });
});
