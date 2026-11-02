//
//  Author: Fabian Rostello
//  Date: 02.11.2026
//  File: briefing-api-email.test.js
//  Description: What the client sends with the e-mail of a briefing: the time zone of the reader's browser
//               (the hours of the e-mail are written in it), the dark colours only when chosen
//

import {afterEach, describe, expect, it, vi} from 'vitest';
import {BriefingApi} from '@/features/briefing/api/briefingApi.js';

const sent = () => JSON.parse(globalThis.fetch.mock.calls.at(-1)[1].body);

afterEach(() => vi.unstubAllGlobals());

describe('BriefingApi.email', () => {
    it('should tell the server the time zone of the browser, for the hours of the e-mail', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ok: true})));
        await BriefingApi.email(9, [1], 'reader@example.org');
        expect(sent().timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
        expect(sent()).toMatchObject({storyIds: [1], to: 'reader@example.org'});
        expect(sent()).not.toHaveProperty('theme');
    });

    it('should send the dark colours only when they are chosen', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ok: true})));
        await BriefingApi.email(9, [1], 'reader@example.org', {}, {}, {}, undefined, [], {}, {}, 'dark');
        expect(sent().theme).toBe('dark');
        await BriefingApi.email(9, [1], 'reader@example.org', {}, {}, {}, undefined, [], {}, {}, 'light');
        expect(sent()).not.toHaveProperty('theme');
    });

    it('should send no time zone when the browser tells none', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ok: true})));
        const resolved = vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({});
        await BriefingApi.email(9, [1], 'reader@example.org');
        resolved.mockRestore();
        expect(sent()).not.toHaveProperty('timeZone');
    });
});
