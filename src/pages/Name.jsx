//
//  Author: Fabian Rostello
//  Date: 13.10.2026
//  File: Name.jsx
//  Description: The page of a name as written ("LFF", "Vadims Ļašenko"), one Wikidata does not have as
//               one item: the news of the last days naming it, and following it as written. A name the
//               tagger linked to an item opens the page of that item instead
//

import {useEffect, useState} from "react";
import {Link, Navigate, useParams} from "react-router-dom";
import {Opening, PageShell, Toolbar} from "@/components/layout/Page.jsx";
import {SettingsPill} from "@/components/ui/settings-pill.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Notice, Working} from "@/components/ui/text.jsx";
import {BriefingWindow} from "@/features/briefing/components/BriefingWindow.jsx";
import {Term} from "@/features/briefing/components/WatchedNews.jsx";
import {DEFAULT_HOURS, spanOf} from "@/features/briefing/windows.js";
import {EntityApi} from "@/features/entities/entityApi.js";
import {useActiveProfile} from "@/features/profiles/activeProfile.js";
import {useAuth} from "@/features/auth/useAuth.js";
import {toast} from "@/lib/toast.js";

const stories = (count) => `${count} ${count === 1 ? 'story' : 'stories'}`;

export const NamePage = () => {
    const {name} = useParams();
    const {user, logout, expired} = useAuth();
    const active = useActiveProfile();
    const [hours, setHours] = useState(DEFAULT_HOURS);
    const [page, setPage] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!user) {
            logout();
            return undefined;
        }
        let current = true;
        setPage(null);
        setError(null);
        EntityApi.namePage(name, hours)
            .then(data => {
                if (!current || expired(data)) return;
                if (data.error) setError(data.error);
                else setPage(data);
            })
            .catch(err => current && setError(err.message));
        return () => {
            current = false;
        };
    }, [name, hours, user, logout, expired, active]);

    const follow = async (yes) => {
        setBusy(true);
        try {
            const data = yes ? await EntityApi.addWord(page.name) : await EntityApi.removeWord(page.name);
            if (expired(data)) return;
            if (data.error) toast.error(data.error);
            else setPage(current => ({...current, followed: yes, wordsLeft: current.wordsLeft + (yes ? -1 : 1)}));
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    // the tagger linked it to an item of Wikidata: its page says more, with its links
    if (page?.qid) return <Navigate to={`/following/${page.qid}`} replace/>;

    return (
        <PageShell user={user} onSignOut={logout}>
            <Opening
                kicker="A name"
                title={page?.name ?? name}
                standfirst="As written in the news: Wikidata does not have it as one item, or not yet."/>

            <div className="page mt-8">
                <p className="caption">
                    {page?.followed ? 'Its news are in your briefing. ' : 'Followed, its news are in your briefing. '}
                    <Link className="link" to="/following">All you follow</Link>
                </p>
            </div>

            {/* following it, and the days of its news, in one bar as on the page of an item */}
            <Toolbar>
                {page && (page.followed
                    ? <Button size="sm" onClick={() => follow(false)} loading={busy}>Stop following</Button>
                    : <Button size="sm" variant="primary" onClick={() => follow(true)} loading={busy} disabled={page.wordsLeft === 0}>Follow</Button>)}
                {page && !page.followed && page.wordsLeft === 0 && (
                    <p className="caption">You follow as many names or words as written as you can: stop following one first.</p>
                )}
                <div className="md:ml-auto">
                    <SettingsPill label={spanOf(hours)} ariaLabel={`The news of the last ${spanOf(hours)}. Change`}>
                        <BriefingWindow hours={hours} onChange={setHours} disabled={page === null && !error}
                                        tip="The news of these last days that name it, from every source read."/>
                    </SettingsPill>
                </div>
            </Toolbar>

            <div className="page mt-10 md:mt-12">
                <div className="max-w-[52rem]">
                    {error && <Notice type="error">{error}</Notice>}
                    {page === null && !error && <Working>Looking for the news of the last {spanOf(hours)} naming it…</Working>}
                    {page && (
                        <section aria-labelledby="name-news">
                            <h2 id="name-news" className="section-head">{stories(page.count)} name it</h2>
                            <p className="caption mt-2">
                                Every news of your sources of the last {spanOf(page.hours)} that names it, whatever its relevance, the newest first.
                            </p>
                            <div className="mt-4"><Term group={{term: page.name, count: page.count, news: page.news}} heading={false}/></div>
                        </section>
                    )}
                </div>
            </div>
        </PageShell>
    );
};
