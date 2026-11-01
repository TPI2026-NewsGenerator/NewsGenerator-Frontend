//
//  Author: Fabian Rostello
//  Date: 29.09.2026
//  File: AuthShell.jsx
//  Description: The masthead and the page of the login and of the account creation, before the reader
//               is signed in
//

import {ThemeButton} from "@/components/ui/theme-toggle.jsx";

export const AuthShell = ({children}) => (
    <div className="flex min-h-screen flex-col">
        <header>
            <div className="page flex h-14 items-center justify-between gap-6 lg:h-16">
                <span className="min-w-0 text-[1.0625rem] font-semibold tracking-[-0.02em]">NewsGenerator</span>
                <div className="flex items-center gap-4">
                    <span className="folio hidden sm:block">
                        {new Date().toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}
                    </span>
                    <ThemeButton/>
                </div>
            </div>
        </header>

        <main className="page flex-1 pt-16 pb-32 md:pt-28">
            {children}
        </main>
    </div>
);
