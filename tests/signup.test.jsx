//
//  Author: Fabian Rostello
//  Date: 29.09.2026
//  File: signup.test.jsx
//  Description: An account is created with its profile, checked before the server is asked
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {WithSession} from "./session.jsx";

vi.mock('@/features/login/api/loginApi.js', () => ({LoginApi: {register: vi.fn()}}));
vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    ProfileApi: {getOptions: vi.fn().mockResolvedValue({languages: ['en', 'fr']})},
}));

const {LoginApi} = await import('@/features/login/api/loginApi.js');
const {SignupPage} = await import('@/pages/Signup.jsx');

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

const fill = ({username = 'lecteur', email = 'lecteur@example.org', password = 'a long password', text = 'The Premier League and its coaches'} = {}) => {
    fireEvent.change(screen.getByLabelText('Username'), {target: {value: username}});
    fireEvent.change(screen.getByLabelText('Email'), {target: {value: email}});
    fireEvent.change(screen.getByLabelText('Password', {selector: 'input'}), {target: {value: password}});
    fireEvent.change(screen.getByLabelText('In your own words'), {target: {value: text}});
};

describe('SignupPage', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should create the account with the profile, sign in and open the profile', async () => {
        LoginApi.register.mockResolvedValue({id_user: 300});
        renderPage();
        expect(await screen.findByRole('option', {name: 'French'})).toBeInTheDocument();

        fill();
        fireEvent.click(screen.getByRole('button', {name: 'Create my account'}));

        expect(await screen.findByText('profile page')).toBeInTheDocument();
        expect(refresh).toHaveBeenCalled();
        expect(LoginApi.register).toHaveBeenCalledWith(expect.objectContaining({
            username: 'lecteur', email: 'lecteur@example.org', text: 'The Premier League and its coaches',
        }));
        expect(LoginApi.register.mock.calls[0][0].language).toBe('en');      // the browser's
    });

    it('should not ask the server while a field is wrong or the profile too short', async () => {
        renderPage();
        await screen.findByRole('option', {name: 'French'});

        fill({username: 'a b', email: 'lecteur@', password: 'short', text: 'rugby'});
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

        fill();
        fireEvent.click(screen.getByRole('button', {name: 'Create my account'}));

        expect(await screen.findByText('This username or this email is already used.')).toBeInTheDocument();
        expect(refresh).not.toHaveBeenCalled();
    });
});
