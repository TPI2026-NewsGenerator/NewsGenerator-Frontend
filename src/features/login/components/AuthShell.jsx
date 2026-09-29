//
//  Author: Fabian Rostello
//  Date: 29.09.2026
//  File: AuthShell.jsx
//  Description: The masthead and the page of the login and of the account creation, before the reader
//               is signed in
//

export const AuthShell = ({children}) => (
    <div className="flex min-h-screen flex-col">
        <header className="border-b-[3px] border-double border-ink">
            <div className="page flex items-end justify-between gap-6 pt-6 pb-4">
                <span className="min-w-0 font-display text-[clamp(1.4rem,7.5vw,2rem)] leading-none font-medium tracking-[-0.015em] md:text-[2.6rem]">NewsGenerator</span>
                <span className="folio hidden sm:block">
                    {new Date().toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}
                </span>
            </div>
        </header>

        <main className="page flex-1 pt-14 pb-24 md:pt-24">
            {children}
        </main>
    </div>
);
