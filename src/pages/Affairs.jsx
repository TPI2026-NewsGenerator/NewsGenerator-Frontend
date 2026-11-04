//
//  Author: Fabian Rostello
//  Date: 04.11.2026
//  File: Affairs.jsx
//  Description: The affairs the reader follows: the one that moved last first, how many alerts they have not read, and the
//               button that lets this device be told when one moves
//

import {useEffect} from "react";
import {Opening, PageShell} from "@/components/layout/Page.jsx";
import {AffairList} from "@/features/affairs/components/AffairList.jsx";
import {useAuth} from "@/features/auth/useAuth.js";

export const AffairsPage = () => {
    const {user, logout} = useAuth();

    useEffect(() => {
        if (!user) logout();
    }, [user, logout]);

    return (
        <PageShell user={user} onSignOut={logout}>
            <Opening kicker="Affairs" title="The affairs you follow"
                     standfirst="An affair is a story told over days. You are told as soon as it has a new fact, told by several media: not every article, not an opinion."/>
            <div className="page mt-10">
                {user && <AffairList/>}
            </div>
        </PageShell>
    );
};
