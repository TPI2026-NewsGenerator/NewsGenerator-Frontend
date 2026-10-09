//
//  Author: Fabian Rostello
//  Date: 29.09.2026
//  File: signup.test.jsx
//  Description: An account is created with its profile, checked before the server is asked
//

import '@testing-library/jest-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {WithSession} from "./session.jsx";

vi.mock('@/features/login/api/loginApi.js', () => ({LoginApi: {register: vi.fn()}}));
vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    ProfileApi: {
        getOptions: vi.fn().mockResolvedValue({languages: ['en', 'fr']}),
        funnelQuestions: vi.fn(),
        funnelText: vi.fn(),
    },
}));

const {LoginApi} = await import('@/features/login/api/loginApi.js');
const {ProfileApi} = await import('@/features/briefing/api/briefingApi.js');
const {SignupPage} = await import('@/pages/Signup.jsx');

const WRITTEN = 'The Premier League and its coaches';

// refresh: asks the session the answer of the signup set in its cookie
const refresh = vi.fn(async () => ({id: 300, username: 'lecteur'}));
const renderPage = () => render(
    <MemoryRouter initialEntries={['/register']}>
        <WithSession refresh={refresh}>
            <Routes>
                <Route path="/register" element={<SignupPage/>}/>
                <Route path="/profile" element={<p>profile page</p>}/>
            </Routes>
        </WithSession>
    </MemoryRouter>
);

const fillAccount = ({username = 'lecteur', email = 'lecteur@example.org', password = 'a long password'} = {}) => {
    fireEvent.change(screen.getByLabelText('Username'), {target: {value: username}});
    fireEvent.change(screen.getByLabelText('Email'), {target: {value: email}});
    fireEvent.change(screen.getByLabelText('Password', {selector: 'input'}), {target: {value: password}});
};

// the profile written by the AI from the answers, then changed by the reader when text is given
const fill = async ({text, ...account} = {}) => {
    fillAccount(account);
    fireEvent.change(screen.getByLabelText('In a few words, what do you want to follow?'), {target: {value: 'football'}});
    fireEvent.click(screen.getByRole('button', {name: 'Continue'}));
    fireEvent.click(await screen.findByRole('button', {name: 'Write my profile'}));
    const profile = await screen.findByLabelText('Your profile');
    if (text !== undefined) fireEvent.change(profile, {target: {value: text}});
};

describe('SignupPage', () => {
    beforeEach(() => {
        ProfileApi.funnelQuestions.mockResolvedValue({enough: false, questions: [{question: 'Which league?', options: ['Premier League']}], maxRounds: 1});
        ProfileApi.funnelText.mockResolvedValue({text: WRITTEN});
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should ask the questions first, and only create the account once the AI wrote the profile', async () => {
        renderPage();
        await screen.findByRole('option', {name: 'French'});
        expect(screen.queryByLabelText('Your profile')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Write it myself'})).not.toBeInTheDocument();

        fillAccount();
        fireEvent.click(screen.getByRole('button', {name: 'Create my account'}));
        expect(await screen.findByText(/Answer the questions first/)).toBeInTheDocument();
        expect(LoginApi.register).not.toHaveBeenCalled();
    });

    it('should create the account with the profile, sign in and open the profile', async () => {
        LoginApi.register.mockResolvedValue({id_user: 300});
        renderPage();
        expect(await screen.findByRole('option', {name: 'French'})).toBeInTheDocument();

        await fill();
        expect(ProfileApi.funnelQuestions).toHaveBeenCalledWith({start: 'football', rounds: [], language: 'en'});
        fireEvent.click(screen.getByRole('button', {name: 'Create my account'}));

        expect(await screen.findByText('profile page')).toBeInTheDocument();
        expect(refresh).toHaveBeenCalled();
        expect(LoginApi.register).toHaveBeenCalledWith(expect.objectContaining({
            username: 'lecteur', email: 'lecteur@example.org', text: WRITTEN,
        }));
        expect(LoginApi.register.mock.calls[0][0].language).toBe('en');      // the browser's
    });

    it('should not ask the server while a field is wrong or the profile too short', async () => {
        renderPage();
        await screen.findByRole('option', {name: 'French'});

        await fill({username: 'a b', email: 'lecteur@', password: 'short', text: 'rugby'});
        fireEvent.click(screen.getByRole('button', {name: 'Create my account'}));

        expect(await screen.findByText(/letters, digits/)).toBeInTheDocument();
        expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
        expect(screen.getByText('At least 10 characters')).toBeInTheDocument();
        expect(screen.getByText(/Say a little more/)).toBeInTheDocument();
        expect(LoginApi.register).not.toHaveBeenCalled();
    });

    it('should show why the server refused the account', async () => {
        LoginApi.register.mockResolvedValue({error: 'This username or this email is already used.'});
        renderPage();
        await screen.findByRole('option', {name: 'French'});

        await fill();
        fireEvent.click(screen.getByRole('button', {name: 'Create my account'}));

        expect(await screen.findByText('This username or this email is already used.')).toBeInTheDocument();
        expect(refresh).not.toHaveBeenCalled();
    });

    it('should say account creation is closed when the server says so, with no form', async () => {
        ProfileApi.getOptions.mockResolvedValueOnce({languages: ['en', 'fr'], signup: false});
        renderPage();

        expect(await screen.findByRole('heading', {name: 'Account creation is closed.'})).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Create my account'})).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Log in'})).toHaveAttribute('href', '/login');
    });
});
