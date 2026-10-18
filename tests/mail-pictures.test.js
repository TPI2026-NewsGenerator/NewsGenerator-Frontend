//
//  Author: Fabian Rostello
//  Date: 18.10.2026
//  File: mail-pictures.test.js
//  Description: The picture the e-mail takes for a story whose own is too small: one of its articles
//               before its illustration (Wikimedia Commons, of who it names), however wide that one is
//

import {describe, expect, it} from 'vitest';
import {bestPicture} from '../src/features/briefing/mailPictures.js';

describe('bestPicture', () => {
    const sizes = {
        'https://a/small.jpg': {width: 300, height: 200},
        'https://a/article.jpg': {width: 1200, height: 675},
        'https://a/standing.jpg': {width: 1600, height: 2400},
        'https://w/illustration.jpg': {width: 1280, height: 960},
    };

    it("should take a sharp picture of the story's articles before its illustration", () => {
        expect(bestPicture([{url: 'https://w/illustration.jpg', illustration: true}, {url: 'https://a/small.jpg'}, {url: 'https://a/article.jpg'}], sizes))
            .toBe('https://a/article.jpg');
        expect(bestPicture([{url: 'https://w/illustration.jpg', illustration: true}, {url: 'https://a/standing.jpg'}], sizes))
            .toBe('https://a/standing.jpg');
    });

    it('should take the illustration when no picture of its articles is sharp, none when none is', () => {
        expect(bestPicture([{url: 'https://a/small.jpg'}, {url: 'https://w/illustration.jpg', illustration: true}], sizes)).toBe('https://w/illustration.jpg');
        expect(bestPicture([{url: 'https://a/small.jpg'}], sizes)).toBeUndefined();
    });
});
