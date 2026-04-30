import '@testing-library/jest-dom';
import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {FetchPage} from "@/pages/Fetch.jsx";
import {LoginPage} from "@/pages/Login.jsx";

// login page
it('display the username input', () => {
    render(
        <MemoryRouter>
            <LoginPage />
        </MemoryRouter>
    );

    const usernameInput = screen.getByRole('textbox', {name: /username/i});

    expect(usernameInput).toBeInTheDocument();
});

it('display the password input', () => {
    render(
        <MemoryRouter>
            <LoginPage />
        </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/password/i);

    expect(passwordInput).toBeInTheDocument();
});

it('display the login button', () => {
    render(
        <MemoryRouter>
            <LoginPage />
        </MemoryRouter>
    );

    const loginButton = screen.getByRole('button', {name: /Login/i});

    expect(loginButton).toBeInTheDocument();
});

// fetch page
it('display the fetch button', () => {
    render(
        <MemoryRouter>
            <FetchPage />
        </MemoryRouter>
    );

    const button = screen.getByRole('button', {name: /Fetch News/i });

    expect(button).toBeInTheDocument();
});