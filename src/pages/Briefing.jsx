//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: Briefing.jsx
//  Description: The daily briefing: the stories of the last hours chosen for the profile of the user
//

import {useCallback, useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {PageShell, Opening} from "@/components/layout/Page.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Notice, Working} from "@/components/ui/text.jsx";
import {BriefingCard} from "@/features/briefing/components/BriefingCard.jsx";
import {BriefingApi, ProfileApi} from "@/features/briefing/api/briefingApi.js";
import {useSeenCards} from "@/features/briefing/useSeenCards.js";
import {useAuth} from "@/features/auth/useAuth.js";

const POLL_MS = 3000;

// what the server is doing while it writes the briefing
const STEPS = {
    starting: 'Starting…',
    ranking: 'Looking for the stories of the last 48 hours closest to your interests…',
    choosing: 'The AI chooses the stories that fit your profile…',
    checking: 'The AI checks which articles tell the same news…',
    reading: 'Reading the articles of each story…',
    summarizing: 'Choosing the key passages of each story…',
};

const written = (at) => new Date(at).toLocaleString('en-GB', {weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'});

export const BriefingPage = () => {
    const {token, user, logout, expired} = useAuth();
    const [profile, setProfile] = useState(undefined);      // undefined: not loaded yet
    const [briefing, setBriefing] = useState(undefined);
    const [error, setError] = useState(null);
    const observe = useSeenCards(briefing, token);

    const load = useCallback(async () => {
        try {
            const data = await BriefingApi.getLatest(token);
            if (expired(data)) return;
            if (data.error) throw new Error(data.error);
            setBriefing(data.briefing);
        } catch (err) {
            setError(err.message);
        }
    }, [token, expired]);

    // the profile says whether a briefing can be written at all
    useEffect(() => {
        if (!user) {
            logout();
            return;
        }
        ProfileApi.get(token)
            .then(data => {
                if (expired(data)) return;
                setProfile(data.profile ?? null);
            })
            .catch(err => setError(err.message));
        load();
    }, [user, token, logout, expired, load]);

    // asked again while it is written
    useEffect(() => {
        if (briefing?.status !== 'running') return undefined;
        const timer = setTimeout(load, POLL_MS);
        return () => clearTimeout(timer);
    }, [briefing, load]);

    const start = async () => {
        setError(null);
        const data = await BriefingApi.start(token);
        if (expired(data)) return;
        if (data.error) setError(data.error);
        else setBriefing(data.briefing);
    };

    // shown at once, taken back if the server refuses it
    const vote = async (storyId, value) => {
        const setVote = (to) => setBriefing(current => current && ({
            ...current,
            items: current.items.map(item => item.storyId === storyId ? {...item, vote: to} : item),
        }));
        const before = briefing.items.find(item => item.storyId === storyId)?.vote ?? null;
        setVote(value);
        try {
            await BriefingApi.vote(briefing.id, storyId, value, token);
        } catch (err) {
            setVote(before);
            setError(`The thumb was not saved: ${err.message}`);
        }
    };

    const running = briefing?.status === 'running';
    const ready = briefing?.status === 'ready';
    const count = ready ? briefing.items.length : 0;

    return (
        <PageShell user={user} onSignOut={logout}>
            <Opening
                kicker="The briefing"
                title="Your briefing"
                standfirst="The stories of the last 48 hours closest to your interests, chosen by the AI. A story you saw in the last 3 days is not shown again; the ones you did not reach can come back."
                aside={profile && (
                    <div className="space-y-4">
                        {ready && (
                            <div>
                                <p className="kicker">This edition</p>
                                <p className="folio mt-1 !text-ink">Written {written(briefing.finishedAt ?? briefing.createdAt)}</p>
                                {count > 0 && <p className="folio mt-0.5">{count} {count === 1 ? 'story' : 'stories'}</p>}
                            </div>
                        )}
                        <Button variant="primary" onClick={start} loading={running} disabled={running}>
                            New briefing
                        </Button>
                    </div>
                )}
            />

            <div className="page mt-12 space-y-8 md:mt-16">
                <div className="grid-12">
                    <div className="col-span-12 space-y-8 md:col-span-7 md:col-start-3">
                        {error && <Notice type="error" onClose={() => setError(null)}>{error}</Notice>}

                        {profile === null && (
                            <Notice title="First, your profile">
                                Tell us what you want to read first: <Link className="link" to="/profile">write your profile</Link>.
                                The briefing is chosen from it, and the sources are found for it.
                            </Notice>
                        )}

                        {briefing === undefined && !error && <Working>Opening your briefing…</Working>}

                        {running && <Working>{STEPS[briefing.step] ?? 'Working…'}</Working>}

                        {briefing?.status === 'failed' && (
                            <Notice type="error">The last briefing could not be written: {briefing.error}</Notice>
                        )}

                        {ready && count === 0 && (
                            <Notice title="Nothing today">
                                No story of the last hours really fits your profile. A short briefing is better than an off-topic one:
                                try again later, or <Link className="link" to="/profile">widen your profile</Link>.
                            </Notice>
                        )}
                    </div>
                </div>

                {ready && count > 0 && (
                    <ol className="list-none p-0">
                        {briefing.items.map((item, index) => (
                            <li key={item.storyId} ref={observe(item.storyId)}>
                                <BriefingCard item={item} number={index + 1} lede={index === 0}
                                              onVote={value => vote(item.storyId, value)}/>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </PageShell>
    );
};
