//
//  Author: Fabian Rostello
//  Date: 02.11.2026
//  File: read-answer.test.js
//  Description: The answer of the API as data: a page of HTML (the tunnel, the proxy, a route that is not
//               there) is told as such instead of "Unexpected token '<'"
//

import {describe, expect, it} from 'vitest';
import {readAnswer} from '@/lib/readAnswer.js';

const answer = (body, status = 200) => new Response(body, {status});

describe('readAnswer', () => {
    it('should give the data of an answer in JSON, an error of the server included', async () => {
        expect(await readAnswer(answer('{"results": []}'))).toEqual({results: []});
        // a call that failed carries its status
        expect(await readAnswer(answer('{"error": "Too many names imported", "retryAfter": 60}', 429)))
            .toEqual({error: 'Too many names imported', retryAfter: 60, status: 429});
    });

    it('should say a page of HTML came, and the status, not that a token is unexpected', async () => {
        const {error} = await readAnswer(answer('<!DOCTYPE html><html><body>Error 524: A timeout occurred</body></html>', 524));
        expect(error).toContain('524');
        expect(error).toContain('with a page, not data');
        expect(error).toContain('Try again');
        expect(error).not.toContain('Unexpected token');
        expect((await readAnswer(answer('<html>Bad gateway</html>', 502))).status).toBe(502);
    });

    it('should say the status of an empty answer, or of a text that is not a page', async () => {
        expect((await readAnswer(answer('', 502))).error).toMatch(/^The server answered 502: it may be restarting/);
        expect((await readAnswer(answer('upstream connect error', 503))).error).not.toContain('page');
    });
});
