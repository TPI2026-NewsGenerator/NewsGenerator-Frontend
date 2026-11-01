//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: Masthead.jsx
//  Description: The bar on top of every page: the name, four sections, the profile read, who reads, their
//               settings and the theme. It stays on top, translucent; a hairline under it once the page scrolls
//

import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {Link, NavLink, useNavigate} from "react-router-dom";
import {cn} from "@/lib/utils.js";
import {ProfileSwitcher} from "@/features/profiles/ProfileSwitcher.jsx";
import {ThemeButton, ThemeChoice} from "@/components/ui/theme-toggle.jsx";

const SECTIONS = [
    {to: '/briefing', label: 'Briefing'},
    {to: '/profile', label: 'Profile'},
    {to: '/following', label: 'Following'},
    {to: '/search', label: 'Search'},
];

// small and quiet: the bar gets out of the way of the page
const sectionClass = ({isActive}) => cn(
    'text-[0.8125rem] no-underline transition-colors duration-200 hover:text-ink',
    isActive ? 'text-ink' : 'text-ink-mute',
);

const quietClass = 'cursor-pointer whitespace-nowrap text-[0.8125rem] text-ink-mute transition-colors duration-200 hover:text-ink';

// onSignOut: called when a signed in user leaves; without a user, the link goes to the login
export const Masthead = ({user, onSignOut}) => {
    const navigate = useNavigate();
    const [menu, setMenu] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        onScroll();
        window.addEventListener('scroll', onScroll, {passive: true});
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        if (!menu) return undefined;
        const close = (event) => event.key === 'Escape' && setMenu(false);
        document.addEventListener('keydown', close);
        return () => document.removeEventListener('keydown', close);
    }, [menu]);

    // the profile read is in the bar on a phone (see below): not again in its menu
    const account = (inMenu) => user
        ? (
            <>
                <span className={cn('whitespace-nowrap text-ink-mute', inMenu ? 'text-[0.9375rem]' : 'text-[0.8125rem]')}>
                    Read by <span className="text-ink">{user.username}</span>
                </span>
                {!inMenu && <ProfileSwitcher admin={user.admin === true}/>}
                <NavLink to="/settings" onClick={() => setMenu(false)}
                         className={inMenu ? 'text-[0.9375rem] text-ink no-underline' : sectionClass}>Settings</NavLink>
                <button type="button" onClick={() => { setMenu(false); onSignOut?.(); }}
                        className={cn(quietClass, inMenu && 'text-[0.9375rem]')}>
                    Sign out
                </button>
            </>
        )
        : (
            <button type="button" onClick={() => navigate('/login')} className={quietClass}>
                Sign in
            </button>
        );

    return (
        <header className={cn('sticky top-0 z-40 border-b bg-paper/80 backdrop-blur-xl backdrop-saturate-150 transition-colors duration-300',
            scrolled ? 'border-rule' : 'border-transparent')}>
            <div className="page flex h-14 items-center justify-between gap-6 lg:h-16">
                <Link to="/briefing" className="min-w-0 shrink-0 text-[1.0625rem] font-semibold tracking-[-0.02em] text-ink no-underline">
                    NewsGenerator
                </Link>
                <nav aria-label="Sections" className="hidden items-center gap-8 lg:flex">
                    {SECTIONS.map(section => (
                        <NavLink key={section.to} to={section.to} className={sectionClass}>{section.label}</NavLink>
                    ))}
                </nav>
                {/* the account at the right of the sections from 1 024 px: below, the four sections and a long
                    name of a reader and of a profile do not hold in one line, so they go to the menu */}
                <div className="hidden min-w-0 items-center justify-end gap-5 lg:flex">
                    {account(false)}
                    <ThemeButton className="-ml-1"/>
                </div>
                <div className="flex min-w-0 items-center justify-end gap-4 lg:hidden">
                    {user && <ProfileSwitcher admin={user.admin === true}/>}
                    <button type="button" onClick={() => setMenu(true)} aria-expanded={menu} aria-controls="index-menu"
                            className="cursor-pointer text-[0.8125rem] text-ink">
                        Menu
                    </button>
                </div>
            </div>

            {/* in the body: the blur of the bar would hold a fixed element inside its own 56 px */}
            {menu && createPortal(
                <div id="index-menu" role="dialog" aria-modal="true" aria-label="Menu"
                     className="fixed inset-0 z-50 flex flex-col bg-paper animate-in fade-in-0 slide-in-from-top-2 duration-400 lg:hidden">
                    <div className="page flex h-14 items-center justify-between">
                        <span className="text-[1.0625rem] font-semibold tracking-[-0.02em]">NewsGenerator</span>
                        <button type="button" onClick={() => setMenu(false)} className="cursor-pointer text-[0.8125rem] text-ink">Close</button>
                    </div>
                    <nav aria-label="Sections" className="page flex flex-col pt-6">
                        {SECTIONS.map(section => (
                            <NavLink key={section.to} to={section.to} onClick={() => setMenu(false)}
                                     className={({isActive}) => cn('py-2.5 text-[2rem] leading-tight font-semibold tracking-[-0.03em] no-underline',
                                         isActive ? 'text-ink' : 'text-ink-mute hover:text-ink')}>
                                {section.label}
                            </NavLink>
                        ))}
                        <div className="mt-10 flex flex-wrap items-baseline gap-x-6 gap-y-3 border-t border-rule pt-6">{account(true)}</div>
                        <ThemeChoice className="mt-6 self-start"/>
                    </nav>
                </div>,
                document.body,
            )}
        </header>
    );
};
