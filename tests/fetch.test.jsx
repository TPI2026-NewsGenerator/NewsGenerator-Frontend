import '@testing-library/jest-dom';
import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {FetchPage} from "@/pages/Fetch.jsx";


it('display the fetch button', () => {
    render(
        <MemoryRouter>
            <FetchPage />
        </MemoryRouter>
    );

    const button = screen.getByRole('button', {name: /Fetch News/i });

    expect(button).toBeInTheDocument();
});