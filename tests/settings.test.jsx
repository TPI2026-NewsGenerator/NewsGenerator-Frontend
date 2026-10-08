//
//  Author: Fabian Rostello
//  Date: 02.10.2026
//  File: settings.test.jsx
//  Description: The username, the email and the password changed with the current password, checked before the
//               server is asked
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {WithSession} from "./session.jsx";

vi.mock('@/features/auth/accountApi.js', () => ({AccountApi: {rename: vi.fn(), changeEmail: vi.fn(), changePassword: vi.fn()}}));

const {AccountApi} = await import('@/features/auth/accountApi.js');
const {SettingsPage} = await import('@/pages/Settings.jsx');

const user = {id: 300, username: 'lecteur', email: 'lecteur@example.org', role: 2};
const refresh = vi.fn(async () => user);
const renderPage = () => render(
    <MemoryRouter initialEntries={['/settings']}>
        <WithSession user={user} refresh={refresh}>
            <Routes>
                <Route path="/settings" element={<SettingsPage/>}/>
            </Routes>
        </WithSession>
    </MemoryRouter>
);
const type = (label, value) => fireEvent.change(screen.getByLabelText(label, {selector: 'input'}), {target: {value}});

describe('SettingsPage', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should change the username with the current password, and ask the session again', async () => {
        AccountApi.rename.mockResolvedValue({...user, username: 'lecteur.2'});
        renderPage();
        expect(screen.getByRole('button', {name: 'Change my username'})).toBeDisabled();

        type('Username', 'lecteur.2');
        fireEvent.click(screen.getByRole('button', {name: 'Change my username'}));
        expect(await screen.findByText('Your current password')).toBeInTheDocument();
        expect(AccountApi.rename).not.toHaveBeenCalled();

        fireEvent.change(document.getElementById('rename-password'), {target: {value: 'the current one'}});
        fireEvent.click(screen.getByRole('button', {name: 'Change my username'}));
        await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
        expect(AccountApi.rename).toHaveBeenCalledWith({username: 'lecteur.2', password: 'the current one'});
    });

    it('should change the email with the current password, checked to be one address first', async () => {
        AccountApi.changeEmail.mockResolvedValue({...user, email: 'nouveau@example.org'});
        renderPage();
        expect(screen.getByRole('button', {name: 'Change my email'})).toBeDisabled();

        fireEvent.change(document.getElementById('email-password'), {target: {value: 'the current one'}});
        type('Email', 'a@example.org, b@example.org');
        fireEvent.click(screen.getByRole('button', {name: 'Change my email'}));
        expect(await screen.findByText('An email, like name@example.org')).toBeInTheDocument();
        expect(AccountApi.changeEmail).not.toHaveBeenCalled();

        type('Email', ' nouveau@example.org ');
        fireEvent.click(screen.getByRole('button', {name: 'Change my email'}));
        await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
        expect(AccountApi.changeEmail).toHaveBeenCalledWith({email: 'nouveau@example.org', password: 'the current one'});
    });

    it('should check the new password twice before asking, and say what the server refused', async () => {
        AccountApi.changePassword.mockResolvedValue({error: 'Your current password is not this one.'});
        renderPage();

        fireEvent.change(document.getElementById('current-password'), {target: {value: 'a guess'}});
        type('New password', 'a new long password');
        type('New password again', 'another one');
        fireEvent.click(screen.getByRole('button', {name: 'Change my password'}));
        expect(await screen.findByText('Not the same as the new password')).toBeInTheDocument();
        expect(AccountApi.changePassword).not.toHaveBeenCalled();

        type('New password again', 'a new long password');
        fireEvent.click(screen.getByRole('button', {name: 'Change my password'}));
        expect(await screen.findByText('Your current password is not this one.')).toBeInTheDocument();
        expect(AccountApi.changePassword).toHaveBeenCalledWith({password: 'a guess', newPassword: 'a new long password'});
        expect(refresh).not.toHaveBeenCalled();
    });
});
