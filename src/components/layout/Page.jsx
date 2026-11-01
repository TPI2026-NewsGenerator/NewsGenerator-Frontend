//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: Page.jsx
//  Description: The frame of a page: the navigation bar, the opening of the page, the heads of its
//               sections, the bars of its controls and of the sections of a long page, and the footer
//

import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {Masthead} from "@/features/navbar/components/Masthead.jsx";
import {cn} from "@/lib/utils.js";

export const PageShell = ({user, onSignOut, children}) => (
    <div className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[70] focus:rounded-full focus:bg-paper focus:px-4 focus:py-2">
            Skip to the content
        </a>
        <Masthead user={user} onSignOut={onSignOut}/>
        <main id="main" className="flex-1 pb-32 md:pb-40">{children}</main>
        <Colophon/>
    </div>
);

// the opening of a page: eyebrow, headline and lead, the whole width (what a page controls goes in its
// Toolbar under it, never in a column beside)
export const Opening = ({kicker, title, standfirst}) => (
    <section className="page pt-16 md:pt-28">
        <p className="kicker kicker-rule mb-4">{kicker}</p>
        <div className="max-w-[60rem]">
            <h1 className="display text-balance">{title}</h1>
            {standfirst && <p className="standfirst mt-6">{standfirst}</p>}
        </div>
    </section>
);

// a section: space above it, a small label and its head; aside (its actions) under the intro, on the one
// left edge of the page: in a column on the right, it made the page two columns (the user, 01.11.2026).
// Reached from a LocalNav, it stops under the bars kept on top
export const Section = ({kicker, title, intro, aside, className, children, id}) => (
    <section id={id} className={cn('page mt-28 scroll-mt-32 md:mt-40 lg:scroll-mt-36', className)}>
        <div className="max-w-[60rem]">
            <p className="kicker mb-3">{kicker}</p>
            <h2 className="section-head text-balance">{title}</h2>
            {intro && <div className="mt-4 max-w-[60ch] text-[1.0625rem] leading-relaxed text-ink-mute">{intro}</div>}
            {aside && <div className="mt-6">{aside}</div>}
        </div>
        <div className="mt-10 md:mt-12">{children}</div>
    </section>
);

// the controls of a page in one bar under its opening, kept under the masthead while the page is read
// (on a phone it wraps: it stays in the flow there)
export const Toolbar = ({children}) => (
    <div className="z-30 mt-4 border-y border-rule bg-paper/85 backdrop-blur-xl backdrop-saturate-150 md:sticky md:top-14 lg:top-16">
        <div className="page flex min-h-14 flex-wrap items-center gap-x-5 gap-y-3 py-2.5">{children}</div>
    </div>
);

// the sections of a long page, a link each, in a bar kept under the masthead; the one read is raised.
// sections: [{id, label}], the ones on the page
export const LocalNav = ({label, sections}) => {
    const [current, setCurrent] = useState(null);
    const ids = sections.map(section => section.id).join(' ');

    // the section read: the last one whose head passed under the bars
    useEffect(() => {
        const elements = ids.split(' ').map(id => document.getElementById(id)).filter(Boolean);
        // without the observer (an old browser, the tests), the bar still leads to the sections
        if (elements.length === 0 || typeof IntersectionObserver === 'undefined') return undefined;
        const seen = new Map();
        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) seen.set(entry.target.id, entry.isIntersecting);
            const visible = elements.find(element => seen.get(element.id));
            if (visible) setCurrent(visible.id);
        }, {rootMargin: '-140px 0px -55% 0px'});
        elements.forEach(element => observer.observe(element));
        return () => observer.disconnect();
    }, [ids]);

    return (
        <nav aria-label={label} className="z-30 mt-12 border-y border-rule bg-paper/85 backdrop-blur-xl backdrop-saturate-150 md:sticky md:top-14 md:mt-16 lg:top-16">
            <div className="page flex min-h-14 items-center overflow-x-auto py-2.5">
                <ul className="inline-flex shrink-0 gap-0.5 rounded-full bg-paper-deep p-1">
                    {sections.map(section => (
                        <li key={section.id}>
                            <a href={`#${section.id}`} aria-current={current === section.id ? 'location' : undefined}
                               className="inline-flex h-7 items-center rounded-full px-3.5 text-[0.8125rem] whitespace-nowrap text-ink-mute no-underline transition-[color,background-color,box-shadow] duration-200 hover:text-ink aria-[current]:bg-paper aria-[current]:text-ink aria-[current]:shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:aria-[current]:bg-rule">
                                {section.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
};

export const Colophon = () => (
    <footer className="border-t border-rule bg-paper-deep">
        <div className="page grid-12 gap-y-8 py-12 text-[0.75rem] leading-relaxed text-ink-mute">
            <div className="col-span-12 md:col-span-4">
                <p className="text-[0.875rem] font-semibold tracking-[-0.01em] text-ink">NewsGenerator</p>
                <p className="mt-2 max-w-[34ch]">
                    A daily briefing written by an AI from the sources you read, for the subjects you follow.
                </p>
            </div>
            <nav aria-label="Sections" className="col-span-6 md:col-span-2 md:col-start-6">
                <p className="font-semibold text-ink">Sections</p>
                <ul className="mt-2 space-y-1.5">
                    <li><Link className="hover:text-ink hover:underline" to="/briefing">Briefing</Link></li>
                    <li><Link className="hover:text-ink hover:underline" to="/profile">Profile</Link></li>
                    <li><Link className="hover:text-ink hover:underline" to="/search">Search</Link></li>
                </ul>
            </nav>
        </div>
    </footer>
);
