//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: Page.jsx
//  Description: The frame of a page: masthead, the opening spread of the page, the heads of its
//               sections, and the colophon at the bottom
//

import {Link} from "react-router-dom";
import {Masthead} from "@/features/navbar/components/Masthead.jsx";
import {cn} from "@/lib/utils.js";

export const PageShell = ({user, onSignOut, children}) => (
    <div className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[70] focus:bg-paper focus:px-3 focus:py-2">
            Skip to the content
        </a>
        <Masthead user={user} onSignOut={onSignOut}/>
        <main id="main" className="flex-1 pb-28">{children}</main>
        <Colophon/>
    </div>
);

// the opening spread: kicker, headline and standfirst on the left, a meta column on the right
export const Opening = ({kicker, title, standfirst, aside}) => (
    <section className="page pt-12 md:pt-20">
        <div className="grid-12">
            <p className="kicker kicker-rule col-span-12 mb-6">{kicker}</p>
            <div className="col-span-12 md:col-span-9">
                <h1 className="display text-balance">{title}</h1>
                {standfirst && <p className="standfirst mt-6">{standfirst}</p>}
            </div>
            {aside && (
                <aside className="col-span-12 mt-10 border-t border-rule pt-5 md:col-span-3 md:col-start-10 md:mt-3 md:border-t-0 md:border-l md:pt-0 md:pl-5">
                    {aside}
                </aside>
            )}
        </div>
    </section>
);

// a section opens with a rule, a kicker and its head; aside goes in the outer column
export const Section = ({kicker, title, intro, aside, className, children, id}) => (
    <section id={id} className={cn('page mt-20 md:mt-28', className)}>
        <div className="grid-12 border-t border-ink pt-5">
            <p className="kicker col-span-12 md:col-span-2 md:pt-2">{kicker}</p>
            <div className="col-span-12 mt-2 md:col-span-7 md:mt-0">
                <h2 className="section-head">{title}</h2>
                {intro && <div className="mt-4 max-w-[60ch] text-[1.0625rem] leading-relaxed text-ink-mute">{intro}</div>}
            </div>
            {aside && <div className="col-span-12 mt-6 md:col-span-3 md:col-start-10 md:mt-2 md:justify-self-end">{aside}</div>}
        </div>
        <div className="mt-10">{children}</div>
    </section>
);

export const Colophon = () => (
    <footer className="border-t border-ink">
        <div className="page grid-12 gap-y-8 py-12">
            <div className="col-span-12 md:col-span-4">
                <p className="font-display text-[1.5rem] leading-none">NewsGenerator</p>
                <p className="caption mt-3 max-w-[32ch]">
                    A daily briefing written by an AI from the sources you read, for the subjects you follow.
                </p>
            </div>
            <nav aria-label="Sections" className="col-span-6 md:col-span-2 md:col-start-6">
                <p className="kicker">Sections</p>
                <ul className="mt-3 space-y-1.5 text-[0.9375rem]">
                    <li><Link className="hover:text-accent-ink" to="/briefing">Briefing</Link></li>
                    <li><Link className="hover:text-accent-ink" to="/profile">Profile</Link></li>
                    <li><Link className="hover:text-accent-ink" to="/search">Search</Link></li>
                </ul>
            </nav>
            <div className="col-span-12 md:col-span-3 md:col-start-10">
                <p className="kicker">How to read the counts</p>
                <p className="caption mt-3 max-w-[32ch]">
                    The number of media telling a story, and how many wrote it themselves, say who tells it:
                    never whether it is true.
                </p>
            </div>
        </div>
    </footer>
);
