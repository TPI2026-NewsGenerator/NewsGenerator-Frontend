//
//  Author: Fabian Rostello
//  Date: 06.11.2026
//  File: masthead.test.jsx
//  Description: The sections of the bar on top of every page, in the order the user chose (06.11.2026): Briefing, Affairs, Following,
//               the profile last, in the bar and in the menu of a phone. Search and FIFA were closed on 13.11.2026 (see closed-pages.test.jsx)
//

import '@testing-library/jest-dom';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {MemoryRouter} from "react-router-dom";

vi.mock('@/features/affairs/useUnread.js', () => ({useUnread: () => 0}));
vi.mock('@/features/profiles/ProfileSwitcher.jsx', () => ({ProfileSwitcher: () => null}));

const {Masthead} = await import('@/features/navbar/components/Masthead.jsx');

const ORDER = ['Briefing', 'Affairs', 'Following', 'Profile'];
const user = {id: 1, username: 'reader', admin: false};
const show = () => render(<MemoryRouter initialEntries={['/briefing']}><Masthead user={user} onSignOut={vi.fn()}/></MemoryRouter>);

describe('Masthead, its sections', () => {
    it('should list them in the bar as Briefing, Affairs, Following, Profile', () => {
        show();
        const bar = screen.getByRole('navigation', {name: 'Sections'});
        expect(within(bar).getAllByRole('link').map(link => link.textContent)).toEqual(ORDER);
        expect(within(bar).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(['/briefing', '/affairs', '/following', '/profile']);
    });

    it('should offer neither Search nor FIFA, in the bar or in the menu of a phone', () => {
        show();
        expect(screen.queryByRole('link', {name: 'Search'})).toBeNull();
        expect(screen.queryByRole('link', {name: 'FIFA'})).toBeNull();
        fireEvent.click(screen.getByRole('button', {name: 'Menu'}));
        const menu = screen.getByRole('dialog', {name: 'Menu'});
        expect(within(menu).queryByRole('link', {name: 'Search'})).toBeNull();
        expect(within(menu).queryByRole('link', {name: 'FIFA'})).toBeNull();
    });

    it('should list them in the same order in the menu of a phone', () => {
        show();
        fireEvent.click(screen.getByRole('button', {name: 'Menu'}));
        const menu = screen.getByRole('dialog', {name: 'Menu'});
        // the settings of the reader follow the sections in the same list
        const links = within(within(menu).getByRole('navigation', {name: 'Sections'})).getAllByRole('link').map(link => link.textContent);
        expect(links.slice(0, ORDER.length)).toEqual(ORDER);
        expect(links[ORDER.length]).toBe('Settings');
    });

    it('should lead the name of the site to the briefing, the first section', () => {
        show();
        expect(screen.getByRole('link', {name: 'NewsGenerator'})).toHaveAttribute('href', '/briefing');
    });
});
