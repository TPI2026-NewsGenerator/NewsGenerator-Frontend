//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: Fifa.jsx
//  Description: The FIFA presidency: a map of the 211 member associations, coloured by the position each one has shown on a candidate for the
//               presidency of FIFA, as far as the news show it. Most of the map is grey, by design: the page says what it knows and
//               never more. The same choices in six views (map, map and list, list, timeline, confederations, presidents)
//

import {useEffect} from "react";
import {Opening, PageShell} from "@/components/layout/Page.jsx";
import {useAuth} from "@/features/auth/useAuth.js";
import {FifaBoard} from "@/features/fifa/components/FifaBoard.jsx";

export const FifaPage = () => {
    const {user, logout} = useAuth();

    useEffect(() => {
        if (!user) logout();
    }, [user, logout]);

    return (
        <PageShell user={user} onSignOut={logout}>
            <Opening kicker="FIFA" title="The FIFA presidency"
                     standfirst="Every association, and the position its own words show on a candidate: as far as the news say it, and no further."/>
            {user && <FifaBoard reader={user.username} admin={user.admin === true}/>}
        </PageShell>
    );
};
