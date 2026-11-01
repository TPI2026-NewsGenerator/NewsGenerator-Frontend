//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: Page.jsx
//  Description: The frame of a page: the navigation bar, the opening of the page, the heads of its
//               sections, and the footer at the bottom
//

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

// the opening of a page: eyebrow, headline and lead on the left, a quiet column on the right
export const Opening = ({kicker, title, standfirst, aside}) => (
    <section className="page pt-16 md:pt-28">
        <div className="grid-12">
            <p className="kicker kicker-rule col-span-12 mb-4">{kicker}</p>
            <div className="col-span-12 md:col-span-9">
                <h1 className="display text-balance">{title}</h1>
                {standfirst && <p className="standfirst mt-6">{standfirst}</p>}
            </div>
            {aside && (
                <aside className="col-span-12 mt-12 md:col-span-3 md:col-start-10 md:mt-3">
                    {aside}
                </aside>
            )}
        </div>
    </section>
);

// a section: space above it, a small label and its head; aside goes in the outer column
export const Section = ({kicker, title, intro, aside, className, children, id}) => (
    <section id={id} className={cn('page mt-28 md:mt-40', className)}>
        <div className="grid-12">
            <div className="col-span-12 md:col-span-8">
                <p className="kicker mb-3">{kicker}</p>
                <h2 className="section-head text-balance">{title}</h2>
                {intro && <div className="mt-4 max-w-[60ch] text-[1.0625rem] leading-relaxed text-ink-mute">{intro}</div>}
            </div>
            {aside && <div className="col-span-12 mt-6 md:col-span-4 md:mt-0 md:self-end md:justify-self-end">{aside}</div>}
        </div>
        <div className="mt-10 md:mt-12">{children}</div>
    </section>
);

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
            <div className="col-span-12 md:col-span-3 md:col-start-10">
                <p className="font-semibold text-ink">How to read the counts</p>
                <p className="mt-2 max-w-[34ch]">
                    The number of media telling a story, and how many wrote it themselves, say who tells it:
                    never whether it is true.
                </p>
            </div>
        </div>
    </footer>
);
