//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: closed-pages.test.jsx
//  Description: The pages Search and FIFA are closed (the user, 13.11.2026): their old addresses lead to the briefing, and no link of the site (the footer too) points to them
//

import '@testing-library/jest-dom';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter, useLocation} from "react-router-dom";

// the pages are not the subject: the one the old addresses lead to says where it is
vi.mock('@/pages/Briefing.jsx', () => ({BriefingPage: () => <p>the briefing page</p>}));

const {default: App} = await import('@/App.jsx');
const {Colophon} = await import('@/components/layout/Page.jsx');

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;
const open = (path) => render(<MemoryRouter initialEntries={[path]}><App/><Where/></MemoryRouter>);

describe('the closed pages', () => {
    it.each(['/search', '/fifa'])('should lead %s to the briefing', (path) => {
        open(path);
        expect(screen.getByText('the briefing page')).toBeInTheDocument();
        expect(screen.getByTestId('where')).toHaveTextContent('/briefing');
    });

    it('should leave no link to them in the footer', () => {
        render(<MemoryRouter><Colophon/></MemoryRouter>);
        const hrefs = screen.getAllByRole('link').map(link => link.getAttribute('href'));
        expect(hrefs).toEqual(['/briefing', '/profile']);
    });
});
