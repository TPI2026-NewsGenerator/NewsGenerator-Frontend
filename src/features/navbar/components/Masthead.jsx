//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: Masthead.jsx
//  Description: The head of every page, like the masthead of a paper: the title, the date, three
//               sections and who reads
//

import {useEffect, useState} from "react";
import {Link, NavLink, useNavigate} from "react-router-dom";
import {cn} from "@/lib/utils.js";

const SECTIONS = [
    {to: '/briefing', label: 'Briefing'},
    {to: '/profile', label: 'Profile'},
    {to: '/search', label: 'Search'},
];

const today = () => new Date().toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});

const sectionClass = ({isActive}) => cn(
    'text-[0.9375rem] font-semibold tracking-[0.08em] no-underline [font-variant-caps:all-small-caps] transition-colors hover:text-accent-ink',
    isActive ? 'text-ink underline decoration-accent-ink decoration-1 underline-offset-[6px]' : 'text-ink-mute',
);

// onSignOut: called when a signed in user leaves; without a user, the link goes to the login
export const Masthead = ({user, onSignOut}) => {
    const navigate = useNavigate();
    const [menu, setMenu] = useState(false);

    useEffect(() => {
        if (!menu) return undefined;
        const close = (event) => event.key === 'Escape' && setMenu(false);
        document.addEventListener('keydown', close);
        return () => document.removeEventListener('keydown', close);
    }, [menu]);

    const account = user
        ? (
            <>
                <span className="folio">Read by <span className="text-ink">{user.username}</span></span>
                <button type="button" onClick={() => { setMenu(false); onSignOut?.(); }}
                        className="cursor-pointer text-[0.9375rem] font-semibold tracking-[0.08em] text-ink-mute [font-variant-caps:all-small-caps] hover:text-accent-ink">
                    Sign out
                </button>
            </>
        )
        : (
            <button type="button" onClick={() => navigate('/login')}
                    className="cursor-pointer text-[0.9375rem] font-semibold tracking-[0.08em] text-ink-mute [font-variant-caps:all-small-caps] hover:text-accent-ink">
                Sign in
            </button>
        );

    return (
        <header className="border-b-[3px] border-double border-ink">
            <div className="page">
                <div className="flex items-center justify-between gap-6 border-b border-rule py-2">
                    <p className="folio">{today()}</p>
                    <p className="folio hidden sm:block">The news of the last 48 hours, chosen for one reader</p>
                </div>
                <div className="flex items-end justify-between gap-6 pt-5 pb-4">
                    <Link to="/briefing" className="min-w-0 font-display text-[clamp(1.4rem,7.5vw,2rem)] leading-none font-medium tracking-[-0.015em] text-ink no-underline md:text-[2.6rem]">
                        NewsGenerator
                    </Link>
                    <nav aria-label="Sections" className="hidden items-baseline gap-7 md:flex">
                        {SECTIONS.map(section => (
                            <NavLink key={section.to} to={section.to} className={sectionClass}>{section.label}</NavLink>
                        ))}
                        <span aria-hidden className="h-4 w-px self-center bg-rule"/>
                        {account}
                    </nav>
                    <button type="button" onClick={() => setMenu(true)} aria-expanded={menu} aria-controls="index-menu"
                            className="kicker cursor-pointer text-ink md:hidden">
                        Index
                    </button>
                </div>
            </div>

            {menu && (
                <div id="index-menu" role="dialog" aria-modal="true" aria-label="Index"
                     className="fixed inset-0 z-50 flex flex-col bg-paper animate-in fade-in-0 md:hidden">
                    <div className="page flex items-center justify-between border-b border-ink py-5">
                        <span className="font-display text-[1.6rem] leading-none">NewsGenerator</span>
                        <button type="button" onClick={() => setMenu(false)} className="kicker cursor-pointer text-ink">Close</button>
                    </div>
                    <nav aria-label="Sections" className="page flex flex-col">
                        {SECTIONS.map((section, index) => (
                            <NavLink key={section.to} to={section.to} onClick={() => setMenu(false)}
                                     className="flex items-baseline gap-5 border-b border-rule py-5 font-display text-[2.2rem] leading-none text-ink no-underline">
                                <span className="folio tabular">{String(index + 1).padStart(2, '0')}</span>
                                {section.label}
                            </NavLink>
                        ))}
                        <div className="flex items-baseline justify-between gap-4 py-6">{account}</div>
                    </nav>
                </div>
            )}
        </header>
    );
};
