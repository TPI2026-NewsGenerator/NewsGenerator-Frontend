//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: fifa-leader-news.test.jsx
//  Description: The tab "Leadership profile" of the sheet shows the news that name the president (the news of the last 30 days, newest first, fifty at a time), asked when
//               the tab is opened and not with the sheet: a segmented control "Football news (n) | All news (n)" (football by default), the heading with the total of the
//               scope, "Show more" that pages with the same scope, the line that says how many are hidden (not about football) with "Show all", the tag "Not football" in
//               All, a loading state, an error state, the empty states, and the captions
//
//  The associations, the presidents and the news are the invented ones of bench/fifa/mock-data.mjs
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {configure, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {buildMock} from '../bench/fifa/mock-data.mjs';

// the map is 211 shapes drawn again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});
configure({asyncUtilTimeout: 10000});

const {api} = vi.hoisted(() => ({api: {map: vi.fn(), association: vi.fn(), presidents: vi.fn(), confederations: vi.fn(), leaderNews: vi.fn()}}));
vi.mock('@/features/fifa/fifaApi.js', () => ({FifaApi: api}));

const topology = JSON.parse(readFileSync(resolve(process.cwd(), 'public/fifa-map.topo.json'), 'utf8'));
const {FifaBoard} = await import('@/features/fifa/components/FifaBoard.jsx');

const LEADERLESS = ['GIB'];
const mock = buildMock({leaderless: LEADERLESS});
const qidOf = (fifa) => mock.map.members.find(member => member.fifa === fifa).qid;

const serve = () => {
    api.map.mockResolvedValue(mock.map);
    api.association.mockImplementation(async qid => mock.association(qid));
    api.presidents.mockResolvedValue(mock.presidents);
    api.confederations.mockResolvedValue(mock.confederations);
    api.leaderNews.mockImplementation(async (qid, options) => mock.leaderNews(qid, options));
};
const show = () => render(<MemoryRouter initialEntries={['/fifa']}><FifaBoard reader="reader"/></MemoryRouter>);
const mapReady = () => screen.findByRole('group', {name: 'Map of the 211 FIFA member associations'});
// hidden: the page behind an open sheet is aria-hidden, and the map is still the thing looked at
const shape = (fifa) => screen.getByRole('button', {name: new RegExp(`^[^,]+, ${fifa},`), hidden: true});
const openSheet = async (fifa) => {
    await mapReady();
    fireEvent.click(shape(fifa));
    const sheet = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
    await within(sheet).findAllByRole('region', {name: /^Mock candidate [A-E]$/});
    return sheet;
};
// the tab Leadership profile: its content is there only once the tab is opened
const openLeadership = async (fifa) => {
    const sheet = await openSheet(fifa);
    fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Leadership profile'}));
    return sheet;
};
const news = (sheet) => within(sheet).getByRole('list', {name: 'News'});
const items = (sheet) => within(news(sheet)).getAllByRole('listitem');
const control = (sheet) => within(sheet).getByRole('radiogroup', {name: 'News shown'});

beforeEach(() => {
    Object.values(api).forEach(fn => fn.mockReset());
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => topology})));
    serve();
});

describe('the mock: the news that name a president', () => {
    const fra = qidOf('FRA');

    it('should give France 145 news, 126 about football, three pages of 50 newest first', () => {
        const first = mock.leaderNews(fra);
        expect(first).toMatchObject({scope: 'football', total: 126, total_all: 145, total_football: 126, limit: 50, offset: 0, leader: {name: 'Mock president FRA'}});
        expect(first.articles).toHaveLength(50);
        const pages = [0, 50, 100].map(offset => mock.leaderNews(fra, {offset}).articles);
        expect(pages.map(page => page.length)).toEqual([50, 50, 26]);
        const dates = pages.flat().map(article => article.published_at);
        expect(dates).toEqual([...dates].sort().reverse());
        expect(new Set(pages.flat().map(article => article.id)).size).toBe(126);
        // the president's count of the list is the same
        expect(mock.presidents.presidents.find(one => one.member_qid === fra).articles_30d).toBe(145);
    });

    it('should hold a few news that are not about football, shown in All, and say relevant: true for every news of the scope football', () => {
        const all = mock.leaderNews(fra, {scope: 'all', limit: 100});
        expect(all).toMatchObject({scope: 'all', total: 145, total_all: 145, total_football: 126});
        // 19 of the 145 are not about football (145 - 126)
        const rest = mock.leaderNews(fra, {scope: 'all', limit: 100, offset: 100});
        expect(all.articles.length + rest.articles.length).toBe(145);
        expect([...all.articles, ...rest.articles].filter(article => !article.relevant)).toHaveLength(19);
        expect(mock.leaderNews(fra, {limit: 100}).articles.every(article => article.relevant)).toBe(true);
        const away = all.articles.find(article => !article.relevant);
        expect(away.title).toMatch(/opens a school/);
        for (const article of all.articles) expect(Object.keys(article).sort()).toEqual(['description', 'id', 'lang', 'medium', 'published_at', 'relevant', 'title', 'url']);
    });

    it('should keep the total of an association with a few news, none for a president that nobody names, and no president for the leaderless one', () => {
        const some = mock.presidents.presidents.find(one => one.articles_30d > 0 && one.member_qid !== fra);
        expect(mock.leaderNews(some.member_qid, {scope: 'all'})).toMatchObject({total: some.articles_30d, total_all: some.articles_30d});
        const none = mock.presidents.presidents.find(one => one.articles_30d === 0);
        expect(mock.leaderNews(none.member_qid)).toMatchObject({total: 0, total_all: 0, total_football: 0, articles: []});
        expect(mock.leaderNews(qidOf('GIB'))).toMatchObject({leader: null, total: 0, total_all: 0, total_football: 0, articles: []});
        expect(mock.leaderNews('Qnobody')).toBeNull();
        // the list of the presidents has 210 of them, the default mock 211
        expect(mock.presidents.presidents).toHaveLength(210);
        expect(buildMock().presidents.presidents).toHaveLength(211);
    });
});

describe('the news of the president', () => {
    it('should not be asked with the sheet: only when the tab Leadership profile is opened', async () => {
        show();
        const sheet = await openSheet('FRA');
        await new Promise(done => setTimeout(done, 100));
        expect(api.leaderNews).not.toHaveBeenCalled();
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Leadership profile'}));
        await waitFor(() => expect(api.leaderNews).toHaveBeenCalledTimes(1));
        expect(api.leaderNews).toHaveBeenCalledWith(qidOf('FRA'), {scope: 'football', limit: 50, offset: 0});
    });

    it('should say that it reads the news while it waits', async () => {
        let release;
        api.leaderNews.mockImplementation(() => new Promise((done) => { release = done; }));
        show();
        const sheet = await openLeadership('FRA');
        expect(await within(sheet).findByRole('status')).toHaveTextContent('Reading the news…');
        expect(within(sheet).queryByRole('list', {name: 'News'})).toBeNull();
        release(mock.leaderNews(qidOf('FRA')));
        await waitFor(() => expect(within(sheet).queryByText('Reading the news…')).toBeNull());
        expect(items(sheet)).toHaveLength(50);
    });

    it('should show the football news first: the heading with the total, the control with both counts, fifty news', async () => {
        show();
        const sheet = await openLeadership('FRA');
        expect(await within(sheet).findByRole('heading', {name: '126 football news in the last 30 days'})).toBeInTheDocument();
        const football = within(control(sheet)).getByRole('radio', {name: 'Football news (126)'});
        const all = within(control(sheet)).getByRole('radio', {name: 'All news (145)'});
        expect(football).toBeChecked();
        expect(all).not.toBeChecked();
        expect(items(sheet)).toHaveLength(50);
        expect(within(sheet).getByText('50 of 126 shown')).toBeInTheDocument();
        // the president's lines are above the news
        const dl = sheet.querySelector('dl');
        expect(dl).toHaveTextContent('Mock president FRA');
        expect(dl.compareDocumentPosition(news(sheet)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('should list a news with its date and medium, its title as a link that opens in a new tab, and its description cut to two lines', async () => {
        show();
        const sheet = await openLeadership('FRA');
        await within(sheet).findByRole('list', {name: 'News'});
        const first = mock.leaderNews(qidOf('FRA')).articles[0];
        const item = items(sheet)[0];
        const link = within(item).getByRole('link', {name: first.title});
        expect(link).toHaveAttribute('href', first.url);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link.getAttribute('rel').split(' ').sort()).toEqual(['noopener', 'noreferrer']);
        expect(link).toHaveAttribute('lang', first.lang);
        expect(item).toHaveTextContent(first.medium);
        expect(item).toHaveTextContent(new Date(first.published_at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}));
        const description = within(item).getByText(first.description);
        expect(description).toHaveClass('line-clamp-2');
        expect(description).toHaveClass('text-ink-mute');
        // a news with no description is just the link
        const bare = items(sheet).find(one => !one.querySelector('p:nth-of-type(2)'));
        expect(bare).toBeDefined();
    });

    it('should show more: the next fifty with the same scope, until the total, then no button', async () => {
        show();
        const sheet = await openLeadership('FRA');
        await within(sheet).findByRole('list', {name: 'News'});
        fireEvent.click(within(sheet).getByRole('button', {name: 'Show more'}));
        await waitFor(() => expect(items(sheet)).toHaveLength(100));
        expect(api.leaderNews).toHaveBeenLastCalledWith(qidOf('FRA'), {scope: 'football', limit: 50, offset: 50});
        expect(within(sheet).getByText('100 of 126 shown')).toBeInTheDocument();
        fireEvent.click(within(sheet).getByRole('button', {name: 'Show more'}));
        await waitFor(() => expect(items(sheet)).toHaveLength(126));
        expect(api.leaderNews).toHaveBeenLastCalledWith(qidOf('FRA'), {scope: 'football', limit: 50, offset: 100});
        expect(within(sheet).getByText('126 of 126 shown')).toBeInTheDocument();
        expect(within(sheet).queryByRole('button', {name: 'Show more'})).toBeNull();
        // newest first through the pages, no news twice
        const titles = items(sheet).map(item => item.querySelector('a').textContent);
        expect(new Set(titles).size).toBe(126);
    });

    it('should say how many news are hidden (not about football) and show all of them with "Show all"', async () => {
        show();
        const sheet = await openLeadership('FRA');
        await within(sheet).findByRole('list', {name: 'News'});
        expect(within(sheet).getByText(/19 news that name this president are hidden \(not about football\)\./)).toBeInTheDocument();
        fireEvent.click(within(sheet).getByRole('button', {name: 'Show all'}));
        await within(sheet).findByRole('heading', {name: '145 news in the last 30 days'});
        expect(within(control(sheet)).getByRole('radio', {name: 'All news (145)'})).toBeChecked();
        expect(api.leaderNews).toHaveBeenLastCalledWith(qidOf('FRA'), {scope: 'all', limit: 50, offset: 0});
        // nothing is hidden any more
        expect(within(sheet).queryByText(/are hidden/)).toBeNull();
        expect(within(sheet).queryByRole('button', {name: 'Show all'})).toBeNull();
    });

    it('should switch the scope with the control, reload from the first news, and mark in All the news that are not about football', async () => {
        show();
        const sheet = await openLeadership('FRA');
        await within(sheet).findByRole('list', {name: 'News'});
        expect(within(sheet).queryByText('Not football')).toBeNull();
        fireEvent.click(within(control(sheet)).getByRole('radio', {name: 'All news (145)'}));
        await within(sheet).findByRole('heading', {name: '145 news in the last 30 days'});
        await waitFor(() => expect(items(sheet)).toHaveLength(50));
        const tagged = items(sheet).filter(item => within(item).queryByText('Not football'));
        const expected = mock.leaderNews(qidOf('FRA'), {scope: 'all'}).articles.filter(article => !article.relevant);
        expect(tagged).toHaveLength(expected.length);
        expect(expected.length).toBeGreaterThan(0);
        for (const item of tagged) expect(within(item).getByRole('link')).toHaveTextContent(/opens a school/);
        // paging goes on in the same scope
        fireEvent.click(within(sheet).getByRole('button', {name: 'Show more'}));
        await waitFor(() => expect(items(sheet)).toHaveLength(100));
        expect(api.leaderNews).toHaveBeenLastCalledWith(qidOf('FRA'), {scope: 'all', limit: 50, offset: 50});
        // and back to football: from the first news again
        fireEvent.click(within(control(sheet)).getByRole('radio', {name: 'Football news (126)'}));
        await within(sheet).findByRole('heading', {name: '126 football news in the last 30 days'});
        await waitFor(() => expect(items(sheet)).toHaveLength(50));
        expect(within(sheet).queryByText('Not football')).toBeNull();
    });

    it('should drop the answer of a scope that was left: the news shown are the ones of the scope chosen', async () => {
        const releases = [];
        api.leaderNews.mockImplementation((qid, options) => new Promise((done) => { releases.push(() => done(mock.leaderNews(qid, options))); }));
        show();
        const sheet = await openLeadership('FRA');
        await waitFor(() => expect(releases).toHaveLength(1));
        // while football is on its way, the reader asks for All
        fireEvent.click(within(control(sheet)).getByRole('radio', {name: 'All news'}));
        await waitFor(() => expect(releases).toHaveLength(2));
        releases[1]();
        await within(sheet).findByRole('heading', {name: '145 news in the last 30 days'});
        // the answer of football comes late: it changes nothing
        releases[0]();
        await new Promise(done => setTimeout(done, 100));
        expect(within(sheet).getByRole('heading', {name: '145 news in the last 30 days'})).toBeInTheDocument();
        expect(within(control(sheet)).getByRole('radio', {name: 'All news (145)'})).toBeChecked();
    });

    it('should say when no football news name the president but others do, with the way to see them', async () => {
        api.leaderNews.mockImplementation(async (qid, options) => ({
            mock: true, leader: {name: 'Mock president FRA', person_qid: null}, scope: options.scope, total: options.scope === 'all' ? 3 : 0, total_all: 3, total_football: 0,
            limit: 50, offset: 0, articles: options.scope === 'all' ? mock.leaderNews(qid, {scope: 'all'}).articles.slice(0, 3).map(one => ({...one, relevant: false})) : [],
        }));
        show();
        const sheet = await openLeadership('FRA');
        expect(await within(sheet).findByText('No football news name this president in the last 30 days.')).toBeInTheDocument();
        expect(within(sheet).getByText(/3 news that name this president are hidden/)).toBeInTheDocument();
        expect(within(sheet).queryByRole('list', {name: 'News'})).toBeNull();
        fireEvent.click(within(sheet).getByRole('button', {name: 'Show all'}));
        await waitFor(() => expect(items(sheet)).toHaveLength(3));
        expect(within(sheet).getAllByText('Not football')).toHaveLength(3);
    });

    it('should say that no news name the president when none does', async () => {
        const quiet = mock.presidents.presidents.find(one => one.articles_30d === 0 && mock.map.members.find(member => member.qid === one.member_qid).level === 'association');
        const fifa = mock.map.members.find(member => member.qid === quiet.member_qid).fifa;
        show();
        const sheet = await openLeadership(fifa);
        expect(await within(sheet).findByText('No news name this president in the last 30 days.')).toBeInTheDocument();
        expect(within(sheet).queryByRole('list', {name: 'News'})).toBeNull();
        expect(within(sheet).queryByRole('button', {name: 'Show more'})).toBeNull();
        expect(within(sheet).queryByText(/are hidden/)).toBeNull();
        expect(within(sheet).getByRole('heading', {name: '0 football news in the last 30 days'})).toBeInTheDocument();
    });

    it('should say an error and ask again with "Try again": the words of the server, then the list', async () => {
        api.leaderNews.mockResolvedValueOnce({error: 'Too many requests: wait a moment.', status: 429});
        show();
        const sheet = await openLeadership('FRA');
        const alert = await within(sheet).findByRole('alert');
        expect(alert).toHaveTextContent('Too many requests: wait a moment.');
        fireEvent.click(within(alert).getByRole('button', {name: 'Try again'}));
        await within(sheet).findByRole('list', {name: 'News'});
        expect(within(sheet).queryByRole('alert')).toBeNull();
        expect(api.leaderNews).toHaveBeenCalledTimes(2);
        expect(items(sheet)).toHaveLength(50);
    });

    it('should say that the news could not be read when the call fails', async () => {
        api.leaderNews.mockRejectedValueOnce(new Error('offline'));
        show();
        const sheet = await openLeadership('FRA');
        expect(await within(sheet).findByRole('alert')).toHaveTextContent('The news could not be read. Try again in a moment.');
    });

    it('should keep the news shown when the next ones cannot be read, and say it', async () => {
        show();
        const sheet = await openLeadership('FRA');
        await within(sheet).findByRole('list', {name: 'News'});
        api.leaderNews.mockResolvedValueOnce({error: 'Too many requests: wait a moment.', status: 429});
        fireEvent.click(within(sheet).getByRole('button', {name: 'Show more'}));
        expect(await within(sheet).findByRole('alert')).toHaveTextContent('Too many requests: wait a moment.');
        expect(items(sheet)).toHaveLength(50);
        // the button is still there: it asks again
        fireEvent.click(within(sheet).getByRole('button', {name: 'Show more'}));
        await waitFor(() => expect(items(sheet)).toHaveLength(100));
        expect(within(sheet).queryByRole('alert')).toBeNull();
    });

    it('should say what the list is, and that the football filter can hide a football news', async () => {
        show();
        const sheet = await openLeadership('FRA');
        await within(sheet).findByRole('list', {name: 'News'});
        expect(within(sheet).getByText('The list is the news that name the person, in any context: a namesake or a passing mention can appear.')).toBeInTheDocument();
        expect(within(sheet).getByText(/The football filter reads the words and the links of each news, so in some languages a football news can be hidden: .All news. always shows everything\./)).toBeInTheDocument();
    });

    it('should ask nothing for an association with no president listed, and say so', async () => {
        show();
        const sheet = await openLeadership('GIB');
        expect(await within(sheet).findByText('No president is listed for this association.')).toBeInTheDocument();
        await new Promise(done => setTimeout(done, 100));
        expect(api.leaderNews).not.toHaveBeenCalled();
        expect(within(sheet).queryByRole('radiogroup', {name: 'News shown'})).toBeNull();
    });

    it('should ask again when the tab is opened again (it is not kept)', async () => {
        show();
        const sheet = await openLeadership('FRA');
        await within(sheet).findByRole('list', {name: 'News'});
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Positions'}));
        fireEvent.mouseDown(within(sheet).getByRole('tab', {name: 'Leadership profile'}));
        await within(sheet).findByRole('list', {name: 'News'});
        expect(api.leaderNews).toHaveBeenCalledTimes(2);
        expect(within(control(sheet)).getByRole('radio', {name: /^Football news/})).toBeChecked();
    });
});
