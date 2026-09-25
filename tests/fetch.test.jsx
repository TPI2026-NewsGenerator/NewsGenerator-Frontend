//
//  Author: Fabian Rostello
//  Date: 19.05.2026
//  File: fetch.text.jsx
//  Description: Frontend test class for fetch feature
//

import '@testing-library/jest-dom';
import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";
import {SearchPage} from "@/pages/Search.jsx";


it('display the fetch button', () => {
    render(
        <MemoryRouter>
            <SearchPage />
        </MemoryRouter>
    );

    // the button that fetches the news, next to "Save search" which also mentions search
    const button = screen.getByRole('button', {name: 'Search'});

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('name', 'fetchNews');
    expect(button).toBeEnabled();
});
