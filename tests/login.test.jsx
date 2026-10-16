//
//  Author: Fabian Rostello
//  Date: 19.05.2026
//  File: login.text.jsx
//  Description: Frontend test class for login feature
//

import '@testing-library/jest-dom';
import { it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {WithSession} from "./session.jsx";

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    ProfileApi: {getOptions: vi.fn().mockResolvedValue({languages: ['en'], signup: false})},
}));
vi.mock('@/features/login/api/loginApi.js', () => ({LoginApi: {authUser: vi.fn()}}));
vi.mock('@/lib/toast.js', () => ({toast: {success: vi.fn(), error: vi.fn()}}));

const {ProfileApi} = await import('@/features/briefing/api/briefingApi.js');
const {LoginApi} = await import('@/features/login/api/loginApi.js');
const {toast} = await import('@/lib/toast.js');
const {LoginPage} = await import('@/pages/Login.jsx');


it('display the username input', () => {
    render(
        <MemoryRouter>
            <WithSession><LoginPage /></WithSession>
        </MemoryRouter>
    );

    const usernameInput = screen.getByRole('textbox', {name: /username/i});

    expect(usernameInput).toBeInTheDocument();
});

it('display the password input', () => {
    render(
        <MemoryRouter>
            <WithSession><LoginPage /></WithSession>
        </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });

    expect(passwordInput).toBeInTheDocument();
});

it('display the login button', () => {
    render(
        <MemoryRouter>
            <WithSession><LoginPage /></WithSession>
        </MemoryRouter>
    );

    const loginButton = screen.getByRole('button', {name: /Login/i});

    expect(loginButton).toBeInTheDocument();
});

// accounts are made only when the server lets them (SIGNUP_OPEN)
it('link to the signup only when it is open', async () => {
    const page = () => render(
        <MemoryRouter>
            <WithSession><LoginPage /></WithSession>
        </MemoryRouter>
    );

    const closed = page();
    await screen.findByRole('button', {name: /Login/i});
    await vi.waitFor(() => expect(ProfileApi.getOptions).toHaveBeenCalled());
    expect(screen.queryByRole('link', {name: 'Sign up'})).not.toBeInTheDocument();
    closed.unmount();

    ProfileApi.getOptions.mockResolvedValueOnce({languages: ['en'], signup: true});
    page();
    expect(await screen.findByRole('link', {name: 'Sign up'})).toHaveAttribute('href', '/register');
});

// the server answers the same for an unknown username and a wrong password: it never tells which exist
it('toast a wrong username or password', async () => {
    LoginApi.authUser.mockResolvedValueOnce({error: 'Invalid username or password...'});
    render(
        <MemoryRouter>
            <WithSession><LoginPage /></WithSession>
        </MemoryRouter>
    );

    fireEvent.change(screen.getByRole('textbox', {name: /username/i}), {target: {value: 'nobody'}});
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), {target: {value: 'wrong password'}});
    fireEvent.click(screen.getByRole('button', {name: /Login/i}));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Wrong username or password...'));
});
