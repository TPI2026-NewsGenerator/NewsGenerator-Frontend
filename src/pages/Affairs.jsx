//
//  Author: Fabian Rostello
//  Date: 04.11.2026
//  File: Affairs.jsx
//  Description: The affairs the reader follows: the one that moved last first, how many alerts they have not read, and the
//               button that lets this device be told when one moves
//

import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {Opening, PageShell} from "@/components/layout/Page.jsx";
import {Meta, MetaLine, Notice} from "@/components/ui/text.jsx";
import {AffairApi} from "@/features/affairs/affairApi.js";
import {PushToggle} from "@/features/affairs/components/PushToggle.jsx";
import {useActiveProfile} from "@/features/profiles/activeProfile.js";
import {useAuth} from "@/features/auth/useAuth.js";

const when = (at) => new Date(at).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const AffairsPage = () => {
    const {user, logout, expired} = useAuth();
    const active = useActiveProfile();
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) {
            logout();
            return undefined;
        }
        let current = true;
        AffairApi.list()
            .then(answer => {
                if (!current || expired(answer)) return;
                if (answer.error) setError(answer.error);
                else setData(answer);
            })
            .catch(err => current && setError(err.message));
        return () => { current = false; };
    }, [user, logout, expired, active]);

    return (
        <PageShell user={user} onSignOut={logout}>
            <Opening kicker="Affairs" title="The affairs you follow"
                     standfirst="An affair is a story told over days. You are told as soon as it has a new fact, told by several media: not every article, not an opinion."/>

            <div className="page mt-10">
                <PushToggle/>
                {error && <Notice type="error" className="mt-8">{error}</Notice>}
                {data === undefined && !error && <p className="caption mt-8">Reading your affairs…</p>}

                {data?.affairs.length === 0 && (
                    <p className="mt-10 max-w-[60ch] text-[1.0625rem] leading-relaxed text-ink-mute">
                        You follow no affair yet. When a card of your <Link className="link" to="/briefing">briefing</Link> is one, its name
                        is under it, with a box to follow it.
                    </p>
                )}

                {data?.affairs.length > 0 && (
                    <ul className="mt-12 list-none divide-y divide-rule border-y border-rule p-0">
                        {data.affairs.map(affair => (
                            <li key={affair.id}>
                                <Link to={`/affairs/${affair.id}`} className="block py-6 no-underline hover:bg-paper-deep/50">
                                    <div className="flex flex-wrap items-baseline gap-x-3">
                                        <h2 className="text-[1.25rem] leading-snug font-semibold tracking-[-0.01em] text-ink">{affair.title}</h2>
                                        {affair.unread > 0 && (
                                            <span className="rounded-full bg-action px-2 py-0.5 text-[0.75rem] font-semibold text-white">
                                                {affair.unread} new
                                            </span>
                                        )}
                                    </div>
                                    <MetaLine className="mt-1.5">
                                        <Meta>{plural(affair.events, 'event')}, {affair.key} key</Meta>
                                        {affair.media > 0 && <Meta>{plural(affair.media, 'medium').replace('mediums', 'media')}</Meta>}
                                        {affair.lastEventAt && <Meta>last on {when(affair.lastEventAt)}</Meta>}
                                    </MetaLine>
                                    {affair.last && <p className="mt-2 max-w-[66ch] text-[0.9375rem] text-ink-mute">{affair.last.titleTranslation ?? affair.last.title}</p>}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </PageShell>
    );
};
