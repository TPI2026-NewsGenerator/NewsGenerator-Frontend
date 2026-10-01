//
//  Author: Fabian Rostello
//  Date: 29.09.2026
//  File: search-page.test.jsx
//  Description: The search form: every category ticked by default, and a saved search replaced or
//               kept when saved again, the list shown as saved
//

import '@testing-library/jest-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";

vi.mock('@/features/search/api/searchApi.js', () => ({
    SearchApi: {
        getCategories: vi.fn(async (language) => ({categories: language === 'fr' ? ['sport', 'politics'] : ['world', 'sport', 'science']})),
        getNews: vi.fn(),
    },
}));
vi.mock('@/features/search/api/feedApi.js', () => ({FeedApi: {}}));
vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    ProfileApi: {get: vi.fn(async () => ({profile: {languages: ['en']}}))},
}));
vi.mock('@/features/custom-search/api/customSearchApi.js', () => ({
    CustomSearchApi: {getUserCustomSearch: vi.fn(), postUserCustomSearch: vi.fn(), deleteUserCustomSearch: vi.fn()},
}));
vi.mock('@/lib/toast.js', () => ({toast: {success: vi.fn(), error: vi.fn()}}));

const {CustomSearchApi} = await import('@/features/custom-search/api/customSearchApi.js');
const {ProfileApi} = await import('@/features/briefing/api/briefingApi.js');
const {toast} = await import('@/lib/toast.js');
const {SearchPage} = await import('@/pages/Search.jsx');

const FOOT = {id: 13, title: 'Foot', keyword: 'referee football soccer', language: 'en', timeframe: 'Weekly', category: ['sport']};
// a token jwtDecode can read, the server is mocked
const TOKEN = ['{"alg":"HS256"}', '{"id":4,"username":"reader"}'].map(part => btoa(part)).join('.') + '.signature';

const renderPage = () => render(<MemoryRouter><SearchPage/></MemoryRouter>);
const ticked = () => screen.getAllByRole('checkbox').filter(box => box.checked).map(box => box.closest('label').textContent.trim());

describe('SearchPage', () => {
    beforeEach(() => localStorage.setItem('JWT', TOKEN));
    afterEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('should tick every category of the language, again when the language changes', async () => {
        CustomSearchApi.getUserCustomSearch.mockResolvedValue([]);
        renderPage();

        await waitFor(() => expect(ticked()).toEqual(['World', 'Sport', 'Science']));
        fireEvent.change(screen.getByLabelText('Display language'), {target: {value: 'fr'}});
        await waitFor(() => expect(ticked()).toEqual(['Sport', 'Politics']));
    });

    it('should start in the language of the reader, with its categories', async () => {
        CustomSearchApi.getUserCustomSearch.mockResolvedValue([]);
        ProfileApi.get.mockResolvedValueOnce({profile: {languages: ['fr']}});
        renderPage();

        await waitFor(() => expect(screen.getByLabelText('Display language')).toHaveValue('fr'));
        await waitFor(() => expect(ticked()).toEqual(['Sport', 'Politics']));
    });

    it('should keep the categories of a saved search loaded', async () => {
        CustomSearchApi.getUserCustomSearch.mockResolvedValue([FOOT]);
        renderPage();
        await waitFor(() => expect(ticked()).toHaveLength(3));

        fireEvent.click(await screen.findByRole('button', {name: 'Foot'}));
        await waitFor(() => expect(ticked()).toEqual(['Sport']));
    });

    it('should save a loaded search as a new one on demand, and list it at once', async () => {
        const copy = {...FOOT, id: 21, title: 'Foot 2'};
        CustomSearchApi.getUserCustomSearch.mockResolvedValueOnce([FOOT]).mockResolvedValueOnce([FOOT, copy]);
        CustomSearchApi.postUserCustomSearch.mockResolvedValue({id: 21, title: 'Foot 2'});
        renderPage();

        fireEvent.click(await screen.findByRole('button', {name: 'Foot'}));
        fireEvent.click(screen.getByRole('button', {name: 'Save search'}));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText(/The form comes from your saved search “Foot”/)).toBeInTheDocument();

        fireEvent.change(within(dialog).getByLabelText('Search title'), {target: {value: 'Foot 2'}});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Save as a new search'}));

        expect(await screen.findByRole('button', {name: 'Foot 2'})).toBeInTheDocument();
        expect(CustomSearchApi.postUserCustomSearch).toHaveBeenCalledWith(expect.objectContaining({id: null, title: 'Foot 2'}), TOKEN);
    });

    it('should delete a saved search only when the server did', async () => {
        CustomSearchApi.getUserCustomSearch.mockResolvedValue([FOOT]);
        CustomSearchApi.deleteUserCustomSearch.mockResolvedValueOnce({error: 'database down'}).mockResolvedValueOnce({deleted: true});
        renderPage();

        fireEvent.click(await screen.findByRole('button', {name: 'Delete Foot'}));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error deleting Foot...'));
        expect(toast.success).not.toHaveBeenCalled();
        expect(screen.getByRole('button', {name: 'Foot'})).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Delete Foot'}));
        await waitFor(() => expect(screen.queryByRole('button', {name: 'Foot'})).not.toBeInTheDocument());
        expect(toast.success).toHaveBeenCalledWith('Foot deleted successfully !');
    });

    it('should replace the loaded search when asked, under its new title', async () => {
        CustomSearchApi.getUserCustomSearch.mockResolvedValueOnce([FOOT]).mockResolvedValueOnce([{...FOOT, title: 'Referees'}]);
        CustomSearchApi.postUserCustomSearch.mockResolvedValue({id: 13, title: 'Referees'});
        renderPage();

        fireEvent.click(await screen.findByRole('button', {name: 'Foot'}));
        fireEvent.click(screen.getByRole('button', {name: 'Save search'}));
        const dialog = await screen.findByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('Search title'), {target: {value: 'Referees'}});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Replace “Foot”'}));

        expect(await screen.findByRole('button', {name: 'Referees'})).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Foot'})).not.toBeInTheDocument();
        expect(CustomSearchApi.postUserCustomSearch).toHaveBeenCalledWith(expect.objectContaining({id: 13, title: 'Referees'}), TOKEN);
    });
});
