//
//  Author: Fabian Rostello
//  Date: 04.11.2026
//  File: AffairDetail.jsx
//  Description: One affair followed: what it gave since the reader last looked, its events on a line, how widely the media
//               told it, and the button that stops following it
//

import {useEffect, useState} from "react";
import {Link, useNavigate, useParams} from "react-router-dom";
import {Opening, PageShell, Toolbar} from "@/components/layout/Page.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Meta, MetaLine, Notice} from "@/components/ui/text.jsx";
import {AffairApi} from "@/features/affairs/affairApi.js";
import {AffairTimeline} from "@/features/affairs/components/AffairTimeline.jsx";
import {AffairCoverage} from "@/features/affairs/components/AffairCoverage.jsx";
import {changed} from "@/features/affairs/useUnread.js";
import {useAuth} from "@/features/auth/useAuth.js";
import {toast} from "@/lib/toast.js";

const when = (at) => new Date(at).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});

// what the affair gave since: each alert is a key event the AI read twice, the new ones first and marked
const Alerts = ({alerts}) => (
    <section className="page mt-16" aria-labelledby="alerts-head">
        <p className="kicker mb-3">What it gave</p>
        <h2 id="alerts-head" className="section-head">Since you follow it</h2>
        {alerts.length === 0 ? (
            <p className="mt-4 max-w-[60ch] text-[1.0625rem] text-ink-mute">Nothing yet. You are told as soon as it has a new fact told by several media.</p>
        ) : (
            <ol className="mt-6 max-w-[70ch] list-none divide-y divide-rule border-y border-rule p-0">
                {alerts.map(alert => (
                    <li key={alert.id} className="py-4">
                        <MetaLine>
                            <Meta tone="ink"><time dateTime={alert.at}>{when(alert.at)}</time></Meta>
                            {!alert.read && <Meta tone="accent">new</Meta>}
                            <Meta>told by {alert.event.media.length} {alert.event.media.length === 1 ? 'medium' : 'media'}</Meta>
                        </MetaLine>
                        <a href={alert.event.url} target="_blank" rel="noreferrer" className="body-text mt-1 block font-semibold underline-offset-2 hover:underline">
                            {alert.event.titleTranslation ?? alert.event.title}
                        </a>
                        <p className="caption mt-1">{alert.event.medium}</p>
                    </li>
                ))}
            </ol>
        )}
    </section>
);

export const AffairDetailPage = () => {
    const {id} = useParams();
    const {user, logout, expired} = useAuth();
    const navigate = useNavigate();
    const [affair, setAffair] = useState(undefined);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!user) {
            logout();
            return undefined;
        }
        let current = true;
        setAffair(undefined);
        setError(null);
        AffairApi.detail(id)
            .then(async answer => {
                if (!current || expired(answer)) return;
                if (answer.error) {
                    setError(answer.error);
                    return;
                }
                setAffair(answer);
                // read: the alerts shown here are the ones it was opened for (they stay marked "new" on this page until it is left)
                await AffairApi.seen(id);
                changed();
            })
            .catch(err => current && setError(err.message));
        return () => { current = false; };
    }, [id, user, logout, expired]);

    const stop = async () => {
        setBusy(true);
        try {
            const answer = await AffairApi.unfollow(id);
            if (answer?.error) throw new Error(answer.error);
            changed();
            toast.success('You no longer follow this affair.');
            navigate('/affairs');
        } catch (err) {
            toast.error(err.message);
            setBusy(false);
        }
    };

    return (
        <PageShell user={user} onSignOut={logout}>
            <Opening kicker="Affair" title={affair?.title ?? (error ? 'Not found' : '…')}
                     standfirst={affair?.lastEventAt ? `Last event on ${when(affair.lastEventAt)}.` : undefined}/>
            <div className="page mt-8">
                <p className="caption"><Link className="link" to="/affairs">All the affairs you follow</Link></p>
                {error && <Notice type="error" className="mt-6">{error}</Notice>}
            </div>
            {affair && (
                <>
                    <Toolbar>
                        <Button size="sm" onClick={stop} loading={busy}>Stop following</Button>
                    </Toolbar>
                    <Alerts alerts={affair.alerts}/>
                    <section className="page mt-20" aria-label="Its events">
                        <p className="kicker mb-3">Its events</p>
                        <div className="max-w-[60rem]">
                            <AffairTimeline events={affair.events} coverage={affair.coverage}/>
                            <AffairCoverage coverage={affair.coverage}/>
                        </div>
                    </section>
                </>
            )}
        </PageShell>
    );
};
