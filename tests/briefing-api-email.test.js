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

    it('should send the descriptions the reader wrote, an empty one for none, and nothing when there are none (11.11.2026)', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ok: true})));
        await BriefingApi.email(9, [1, 2], 'reader@example.org', {}, {}, {}, undefined, [], {}, {}, 'light', {}, {1: 'My words.', 2: ''});
        expect(sent().descriptions).toEqual({1: 'My words.', 2: ''});
        await BriefingApi.email(9, [1], 'reader@example.org', {}, {}, {}, undefined, [], {}, {}, 'light', {}, {});
        expect(sent()).not.toHaveProperty('descriptions');
        vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => ({html: '<p>x</p>'})})));
        await BriefingApi.emailPreview(9, {storyIds: [1], descriptions: {1: 'Preview.'}});
        expect(sent().descriptions).toEqual({1: 'Preview.'});
    });

    it('should ask the server to write the AI version of a card, and throw when the server refuses or does not answer (11.11.2026)', async () => {
        const answered = (status, body) => vi.fn(async () => ({ok: status < 400, status, text: async () => body}));
        vi.stubGlobal('fetch', answered(200, JSON.stringify({ai: {points: ['A point.'], summary: null, model: 'x'}})));
        expect(await BriefingApi.writeAiVersion(9, 3)).toEqual({ai: {points: ['A point.'], summary: null, model: 'x'}});
        expect(globalThis.fetch.mock.calls[0][0]).toMatch(/\/briefing\/9\/stories\/3\/ai-version$/);
        expect(globalThis.fetch.mock.calls[0][1].method).toBe('POST');
        vi.stubGlobal('fetch', answered(200, JSON.stringify({ai: null, reason: 'no-answer'})));
        expect(await BriefingApi.writeAiVersion(9, 3)).toEqual({ai: null, reason: 'no-answer'});
        vi.stubGlobal('fetch', answered(404, JSON.stringify({error: 'Unknown card.'})));
        await expect(BriefingApi.writeAiVersion(9, 3)).rejects.toThrow('Unknown card.');
        vi.stubGlobal('fetch', answered(502, '<html>Bad gateway</html>'));
        await expect(BriefingApi.writeAiVersion(9, 3)).rejects.toThrow(/may be restarting or busy/);
    });

    it('should send no time zone when the browser tells none', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ok: true})));
        const resolved = vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({});
        await BriefingApi.email(9, [1], 'reader@example.org');
        resolved.mockRestore();
        expect(sent()).not.toHaveProperty('timeZone');
    });
});
