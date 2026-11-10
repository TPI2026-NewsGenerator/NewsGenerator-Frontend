//
//  Author: Fabian Rostello
//  Date: 06.11.2026
//  File: preferences-sync.test.jsx
//  Description: The display preferences kept on the account (the user, 06.11.2026): the browser answers at once, the account wins once it
//               has been read, what it has none of is sent from here, each change goes up after a short wait, and a call that fails
//               keeps the value of the browser
//

import '@testing-library/jest-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, renderHook, screen} from '@testing-library/react';
import {useContext} from 'react';
import {AuthContext} from '@/features/auth/sessionContext.js';

vi.mock('@/features/preferences/preferencesApi.js', () => ({PreferencesApi: {get: vi.fn(), save: vi.fn()}}));

const {PreferencesApi} = await import('@/features/preferences/preferencesApi.js');
const {endPreferences, SEND_DELAY, startPreferences} = await import('@/features/preferences/preferences.js');
const {usePreference} = await import('@/features/preferences/usePreference.js');
const {AuthProvider} = await import('@/features/auth/AuthContext.jsx');
const {keepLayout, keptLayout, layoutPreference} = await import('@/features/briefing/mailEditorLayout.js');
const {keepSize, keptSize, sizePreference} = await import('@/features/briefing/sizes.js');
const {formatPreference, keepFormat, keptFormat} = await import('@/features/briefing/formats.js');
const {keepWatchLimit, keptWatchLimit, watchLimitPreference} = await import('@/features/briefing/windows.js');
const {BLOCK_LISTS, showPreference, useBlocks} = await import('@/features/briefing/blockPresets.js');

vi.setConfig({testTimeout: 20000});

const KEYS = {
    layout: 'newsgenerator.mail-editor', mailBlocks: 'newsgenerator.mail-blocks', pageBlocks: 'newsgenerator.page-blocks',
    mailPresets: 'newsgenerator.mail-presets', pagePresets: 'newsgenerator.page-presets', show: 'newsgenerator.briefing-show', format: 'newsgenerator.briefing-format', size: 'newsgenerator.briefing-size',
    followingNews: 'newsgenerator.following-news',
};

// the account answers with these preferences
const account = (preferences = {}) => PreferencesApi.get.mockResolvedValue({preferences});
// the reader signs in: their account is read
const signIn = (id = 4) => act(async () => { await startPreferences(id); });
// the wait before a change goes up has passed
const wait = (ms = SEND_DELAY) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    PreferencesApi.get.mockResolvedValue({preferences: {}});
    PreferencesApi.save.mockResolvedValue({preferences: {}});
});

afterEach(async () => {
    await endPreferences();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    localStorage.clear();
});

describe('a preference before the account is read', () => {
    it('should give what the browser kept at once, with no call, and the one at first when it kept nothing', () => {
        expect([keptLayout(), keptSize(), keptFormat(), keptWatchLimit()]).toEqual(['frames', 10, 'passages', 100]);
        // no list of blocks chosen: the lists at first are used (see useBlocks)
        expect([BLOCK_LISTS.mail.chosen(), BLOCK_LISTS.page.chosen()]).toEqual([undefined, undefined]);

        localStorage.setItem(KEYS.size, '20');
        localStorage.setItem(KEYS.layout, 'matrix');
        const {result} = renderHook(() => usePreference(sizePreference));
        expect(result.current[0]).toBe(20);
        expect(keptLayout()).toBe('matrix');
        expect(PreferencesApi.get).not.toHaveBeenCalled();
    });

    it('should keep a change in the browser alone, and call nothing, while nobody is signed in', async () => {
        keepSize(30);
        keepLayout('matrix');
        await wait(10 * SEND_DELAY);
        expect(localStorage.getItem(KEYS.size)).toBe('30');
        expect(keptLayout()).toBe('matrix');
        expect(PreferencesApi.get).not.toHaveBeenCalled();
        expect(PreferencesApi.save).not.toHaveBeenCalled();
    });

    it('should hold a change for the page when the browser keeps nothing', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
        keepWatchLimit(70);
        expect(keptWatchLimit()).toBe(70);
    });

    it('should tell every component that reads it when it changes, the setter of the hook included', () => {
        const first = renderHook(() => usePreference(layoutPreference));
        const second = renderHook(() => usePreference(layoutPreference));
        act(() => first.result.current[1]('matrix'));
        expect(first.result.current[0]).toBe('matrix');
        expect(second.result.current[0]).toBe('matrix');
        expect(localStorage.getItem(KEYS.layout)).toBe('matrix');
    });
});

describe('the account read after the sign-in', () => {
    it('should be read once for a reader, however many times the sign-in is told', async () => {
        await signIn(4);
        await signIn(4);
        expect(PreferencesApi.get).toHaveBeenCalledTimes(1);
    });

    it('should win over what the browser kept, and be kept in the browser from then on', async () => {
        localStorage.setItem(KEYS.size, '10');
        localStorage.setItem(KEYS.layout, 'frames');
        const {result} = renderHook(() => [usePreference(sizePreference)[0], usePreference(layoutPreference)[0]]);
        expect(result.current).toEqual([10, 'frames']);

        account({size: 30, layout: 'matrix', format: 'points', mailBlocks: ['names', 'picture'], followingNews: 40});
        await signIn();
        // the components draw again with the account's values, and the browser has them for the next time
        expect(result.current).toEqual([30, 'matrix']);
        expect([keptSize(), keptLayout(), keptFormat(), BLOCK_LISTS.mail.chosen(), keptWatchLimit()]).toEqual([30, 'matrix', 'points', ['picture', 'names'], 40]);
        expect(localStorage.getItem(KEYS.size)).toBe('30');
        expect(localStorage.getItem(KEYS.followingNews)).toBe('40');
        // nothing to send: the account already has them
        await wait(5 * SEND_DELAY);
        expect(PreferencesApi.save).not.toHaveBeenCalled();
    });

    it('should show the account\'s lists of blocks, in the order of the blocks, the one it has none of staying as at first', async () => {
        account({mailBlocks: ['names', 'picture']});
        const {result} = renderHook(() => ({mail: useBlocks('mail'), page: useBlocks('page')}));
        const first = result.current.page.list;
        await signIn();
        expect(result.current.mail.list).toEqual(['picture', 'names']);
        expect(result.current.mail.changed).toBe(true);
        expect(result.current.page.list).toEqual(first);
        expect(result.current.page.changed).toBe(false);
    });

    it('should carry over the presets the account has from before, as long as it has no list of blocks', async () => {
        // the page: the preset it showed, with the blocks ticked for it; the e-mail: the preset that was changed
        account({mailPresets: {short: ['picture']}, pagePresets: {standard: ['names', 'picture']}, show: 'standard'});
        const {result} = renderHook(() => ({mail: useBlocks('mail'), page: useBlocks('page')}));
        await signIn();
        expect(result.current.mail.list).toEqual(['picture']);
        expect(result.current.page.list).toEqual(['picture', 'names']);
        // a list chosen since wins
        act(() => BLOCK_LISTS.page.keep(['coverage']));
        expect(result.current.page.list).toEqual(['coverage']);
    });

    it('should send up what the browser kept when the account has none of it, and only that', async () => {
        localStorage.setItem(KEYS.layout, 'matrix');
        localStorage.setItem(KEYS.format, 'points');
        localStorage.setItem(KEYS.size, '20');
        account({size: 30});
        await signIn();
        // the size is the account's, the layout and the format were this browser's alone
        expect(keptSize()).toBe(30);
        expect(PreferencesApi.save).not.toHaveBeenCalled();
        await wait();
        expect(PreferencesApi.save).toHaveBeenCalledTimes(1);
        expect(PreferencesApi.save).toHaveBeenCalledWith({layout: 'matrix', format: 'points'});
    });

    it('should send up the presets the browser kept, as lists of known blocks only', async () => {
        localStorage.setItem(KEYS.mailPresets, JSON.stringify({short: ['names', 'picture', 'sparkles'], standard: 'all'}));
        await signIn();
        await wait();
        expect(PreferencesApi.save).toHaveBeenCalledWith({mailPresets: {short: ['picture', 'names']}});
    });

    it('should send nothing when neither the account nor the browser has a preference', async () => {
        await signIn();
        await wait(5 * SEND_DELAY);
        expect(PreferencesApi.save).not.toHaveBeenCalled();
    });

    it('should leave out of its reach a value of the account that the page does not offer', async () => {
        localStorage.setItem(KEYS.size, '20');
        account({size: 25, layout: 'carousel', followingNews: 55, mailPresets: 'all', mailBlocks: 'all', pageBlocks: null, show: null});
        await signIn();
        expect([keptSize(), keptLayout(), keptWatchLimit(), showPreference.kept()]).toEqual([20, 'frames', 100, 'everything']);
        expect([BLOCK_LISTS.mail.chosen(), BLOCK_LISTS.page.chosen()]).toEqual([undefined, undefined]);
        // not a choice of the account: what the browser had goes up in its place
        await wait();
        expect(PreferencesApi.save).toHaveBeenCalledWith({size: 20});
    });

    it('should keep the browser\'s values, silently, when the account can not be read', async () => {
        localStorage.setItem(KEYS.size, '20');
        PreferencesApi.get.mockRejectedValueOnce(new Error('network down'));
        await expect(startPreferences(4)).resolves.toBeUndefined();
        expect(keptSize()).toBe(20);

        await endPreferences();
        PreferencesApi.get.mockResolvedValueOnce({error: 'The server answered 502 with a page, not data: it may be restarting or busy. Try again in a moment.', status: 502});
        await signIn();
        expect(keptSize()).toBe(20);
        PreferencesApi.get.mockResolvedValueOnce({preferences: null});
        await endPreferences();
        await signIn();
        expect(keptSize()).toBe(20);
    });

    it('should still send the changes made while the account is not read', async () => {
        PreferencesApi.get.mockResolvedValue({error: 'down'});
        await signIn();
        keepSize(30);
        await wait();
        expect(PreferencesApi.save).toHaveBeenCalledWith({size: 30});
    });

    it('should keep what a change made while the account was being read, over what it says', async () => {
        let answer;
        PreferencesApi.get.mockReturnValue(new Promise(resolve => { answer = resolve; }));
        const reading = startPreferences(4);
        keepSize(30);
        answer({preferences: {size: 20}});
        await act(async () => { await reading; });
        expect(keptSize()).toBe(30);
        await wait();
        expect(PreferencesApi.save).toHaveBeenCalledWith({size: 30});
    });
});

describe('a change sent to the account', () => {
    beforeEach(() => signIn());

    it('should go up after the wait, with nothing else than what changed', async () => {
        keepLayout('matrix');
        expect(PreferencesApi.save).not.toHaveBeenCalled();
        await wait(SEND_DELAY - 1);
        expect(PreferencesApi.save).not.toHaveBeenCalled();
        await wait(1);
        expect(PreferencesApi.save).toHaveBeenCalledTimes(1);
        expect(PreferencesApi.save).toHaveBeenCalledWith({layout: 'matrix'});
    });

    it('should go up once for several changes in a row, the last of each', async () => {
        keepSize(20);
        await wait(SEND_DELAY / 2);
        keepSize(30);
        await wait(SEND_DELAY / 2);
        // each change starts the wait again
        expect(PreferencesApi.save).not.toHaveBeenCalled();
        keepFormat('digest');
        keepWatchLimit(50);
        await wait();
        expect(PreferencesApi.save).toHaveBeenCalledTimes(1);
        expect(PreferencesApi.save).toHaveBeenCalledWith({size: 30, format: 'digest', followingNews: 50});
    });

    it('should send nothing for a value that is the one the browser has already', async () => {
        keepSize(20);
        await wait();
        PreferencesApi.save.mockClear();
        keepSize(20);
        await wait(5 * SEND_DELAY);
        expect(PreferencesApi.save).not.toHaveBeenCalled();
    });

    it('should send the list whole when the reader unticks a block of the page, and nothing of the e-mail', async () => {
        const {result} = renderHook(() => useBlocks('page'));
        act(() => result.current.set('picture', false));
        await wait();
        const [{pageBlocks}] = PreferencesApi.save.mock.calls[0];
        expect(pageBlocks).toEqual(['countries', 'media', 'contested', 'official', 'unconfirmed', 'names', 'analysis', 'angles', 'affair', 'coverage']);
        expect(PreferencesApi.save.mock.calls[0][0]).not.toHaveProperty('mailBlocks');
    });

    it('should start the list from the preset of before when the reader ticks a block of it', async () => {
        localStorage.setItem(KEYS.show, 'short');
        const {result} = renderHook(() => useBlocks('page'));
        act(() => result.current.set('picture', true));
        await wait();
        expect(PreferencesApi.save).toHaveBeenCalledWith({pageBlocks: ['picture', 'media', 'contested', 'official', 'unconfirmed']});
    });

    it('should send the list of the e-mail, empty as well, and the way a card is read', async () => {
        BLOCK_LISTS.mail.keep(['names', 'picture']);
        keepFormat('points');
        await wait();
        expect(PreferencesApi.save).toHaveBeenCalledWith({mailBlocks: ['picture', 'names'], format: 'points'});
        PreferencesApi.save.mockClear();
        BLOCK_LISTS.mail.keep([]);
        await wait();
        expect(PreferencesApi.save).toHaveBeenCalledWith({mailBlocks: []});
    });

    it('should never send what stays on the device: the theme, the profile, the last search', async () => {
        localStorage.setItem('theme', 'dark');
        localStorage.setItem('newsgenerator.profile', '3');
        localStorage.setItem('newsgenerator.search', '{"query":"var"}');
        keepSize(20);
        await wait();
        expect(Object.keys(PreferencesApi.save.mock.calls[0][0])).toEqual(['size']);
        expect([localStorage.getItem('theme'), localStorage.getItem('newsgenerator.profile'), localStorage.getItem('newsgenerator.search')])
            .toEqual(['dark', '3', '{"query":"var"}']);
    });

    it('should keep the value in the browser, silently, when the call fails', async () => {
        for (const failure of [() => Promise.reject(new Error('network down')), () => Promise.resolve({error: 'Too many preferences saved', status: 429}),
            () => Promise.resolve({error: 'Forbidden, invalid or expired token', status: 403})]) {
            PreferencesApi.save.mockImplementationOnce(failure);
            keepSize(keptSize() === 20 ? 30 : 20);
            await wait();
            expect(PreferencesApi.save).toHaveBeenCalled();
            PreferencesApi.save.mockClear();
        }
        expect(keptSize()).toBe(20);
        expect(localStorage.getItem(KEYS.size)).toBe('20');
    });

    it('should send again, with the next change, what did not go up', async () => {
        PreferencesApi.save.mockResolvedValueOnce({error: 'The server answered 502', status: 502});
        keepSize(20);
        await wait();
        keepLayout('matrix');
        await wait();
        expect(PreferencesApi.save).toHaveBeenLastCalledWith({layout: 'matrix'});
        // the layout goes up; the size is still waiting, for the next sign-in
        expect(JSON.parse(localStorage.getItem('newsgenerator.preferences-unsent'))).toEqual(['size']);
    });

    it('should win over the account at the next sign-in, when it never went up', async () => {
        PreferencesApi.save.mockResolvedValue({error: 'The server answered 502', status: 502});
        keepSize(20);
        await wait();
        PreferencesApi.save.mockResolvedValue({preferences: {}});
        // the page is opened again: the account still has the size of before
        await endPreferences();
        account({size: 10, layout: 'matrix'});
        await signIn();
        expect([keptSize(), keptLayout()]).toEqual([20, 'matrix']);
        await wait();
        expect(PreferencesApi.save).toHaveBeenLastCalledWith({size: 20});
        expect(localStorage.getItem('newsgenerator.preferences-unsent')).toBeNull();
        // once it went up, the account wins again
        await endPreferences();
        account({size: 30});
        await signIn();
        expect(keptSize()).toBe(30);
    });

    it('should wait for a change made again while the first was on its way', async () => {
        let done;
        PreferencesApi.save.mockReturnValueOnce(new Promise(resolve => { done = resolve; }));
        keepSize(20);
        await wait();
        keepSize(30);
        await act(async () => done({preferences: {size: 20}}));
        // the first went up, not the second
        expect(JSON.parse(localStorage.getItem('newsgenerator.preferences-unsent'))).toEqual(['size']);
        await wait();
        expect(PreferencesApi.save).toHaveBeenLastCalledWith({size: 30});
        expect(localStorage.getItem('newsgenerator.preferences-unsent')).toBeNull();
    });
});

describe('another reader, and signing out', () => {
    it('should send up at once what waits when the reader signs out, then nothing more', async () => {
        await signIn();
        keepSize(30);
        await endPreferences();
        expect(PreferencesApi.save).toHaveBeenCalledWith({size: 30});
        PreferencesApi.save.mockClear();
        keepSize(20);
        await wait(5 * SEND_DELAY);
        expect(PreferencesApi.save).not.toHaveBeenCalled();
    });

    it('should leave the preferences in the browser for the same reader, who has them back at once', async () => {
        account({size: 30});
        await signIn(4);
        await endPreferences();
        expect(keptSize()).toBe(30);
        await signIn(4);
        expect(keptSize()).toBe(30);
        expect(PreferencesApi.get).toHaveBeenCalledTimes(2);
    });

    it('should not give the preferences of a reader to the account of another', async () => {
        account({size: 30, layout: 'matrix'});
        await signIn(4);
        keepFormat('points');
        // the other reader signs in on the same browser, without the first having signed out
        account({pageBlocks: ['media']});
        const {result} = renderHook(() => usePreference(sizePreference));
        expect(result.current[0]).toBe(30);
        await signIn(9);
        await wait();
        expect(result.current[0]).toBe(10);
        expect([keptLayout(), keptFormat(), BLOCK_LISTS.page.chosen()]).toEqual(['frames', 'passages', ['media']]);
        // the change of the first reader, waiting to go up, never goes up under the cookie of the second
        expect(PreferencesApi.save).not.toHaveBeenCalled();
        expect(localStorage.getItem('newsgenerator.preferences-unsent')).toBeNull();
    });

    it('should take what a browser kept before there were accounts for the first reader who signs in', async () => {
        localStorage.setItem(KEYS.size, '20');
        await signIn(4);
        await wait();
        expect(PreferencesApi.save).toHaveBeenCalledWith({size: 20});
        expect(localStorage.getItem('newsgenerator.preferences-owner')).toBe('4');
    });
});

describe('the sign-in of the page', () => {
    // a page under the provider: who signs out and what it shows
    let signOut;
    const Reader = () => {
        const {user, forget} = useContext(AuthContext);
        signOut = forget;
        return <p>{user ? `reader ${user.id}` : 'nobody'}</p>;
    };
    const answerSession = (user) => vi.stubGlobal('fetch', vi.fn(async (_url, init) => ({
        ok: init?.method !== 'DELETE' && user !== null,
        status: user ? 200 : 403,
        json: async () => user,
    })));

    afterEach(() => vi.unstubAllGlobals());

    it('should read the account once the session tells who the reader is', async () => {
        answerSession({id: 4, username: 'lecteur'});
        vi.useRealTimers();
        render(<AuthProvider><Reader/></AuthProvider>);
        expect(await screen.findByText('reader 4')).toBeInTheDocument();
        await vi.waitFor(() => expect(PreferencesApi.get).toHaveBeenCalledTimes(1));
    });

    it('should read nothing when nobody is signed in', async () => {
        answerSession(null);
        vi.useRealTimers();
        render(<AuthProvider><Reader/></AuthProvider>);
        expect(await screen.findByText('nobody')).toBeInTheDocument();
        expect(PreferencesApi.get).not.toHaveBeenCalled();
    });

    it('should send what waits before the session ends when the reader signs out', async () => {
        answerSession({id: 4, username: 'lecteur'});
        vi.useRealTimers();
        render(<AuthProvider><Reader/></AuthProvider>);
        await screen.findByText('reader 4');
        await vi.waitFor(() => expect(PreferencesApi.get).toHaveBeenCalled());
        act(() => keepSize(30));
        await act(async () => { await signOut(); });
        expect(PreferencesApi.save).toHaveBeenCalledWith({size: 30});
        const calls = fetch.mock.calls.map(([, init]) => init?.method ?? 'GET');
        expect(calls).toContain('DELETE');
        expect(await screen.findByText('nobody')).toBeInTheDocument();
    });
});

describe('the preferences, their public helpers', () => {
    it('should give each one its name on the account and its place in the browser', () => {
        expect([layoutPreference, sizePreference, formatPreference, BLOCK_LISTS.mail, BLOCK_LISTS.page, watchLimitPreference].map(one => [one.name, one.key]))
            .toEqual([
                ['layout', KEYS.layout], ['size', KEYS.size], ['format', KEYS.format], ['mailBlocks', KEYS.mailBlocks], ['pageBlocks', KEYS.pageBlocks],
                ['followingNews', KEYS.followingNews],
            ]);
    });

    it('should refuse in the browser what the page does not offer, as before', () => {
        localStorage.setItem(KEYS.size, '25');
        localStorage.setItem(KEYS.followingNews, '55');
        localStorage.setItem(KEYS.format, 'summary');
        expect([keptSize(), keptWatchLimit(), keptFormat()]).toEqual([10, 100, 'passages']);
        expect([sizePreference.chosen(), watchLimitPreference.chosen(), formatPreference.chosen()]).toEqual([undefined, undefined, undefined]);
    });
});
