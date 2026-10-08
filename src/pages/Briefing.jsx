//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: Briefing.jsx
//  Description: The daily briefing: the stories of the last hours chosen for the profile of the user,
//               of the last 24 hours, 2 days or 7 days as they choose
//

import {useCallback, useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {PageShell, Opening} from "@/components/layout/Page.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Notice, Working} from "@/components/ui/text.jsx";
import {BriefingCard} from "@/features/briefing/components/BriefingCard.jsx";
import {BriefingWindow} from "@/features/briefing/components/BriefingWindow.jsx";
import {DEFAULT_HOURS, spanOf} from "@/features/briefing/windows.js";
import {BriefingApi, ProfileApi} from "@/features/briefing/api/briefingApi.js";
import {BriefingSize, keepSize, keptSize} from "@/features/briefing/components/BriefingSize.jsx";
import {WatchedNews} from "@/features/briefing/components/WatchedNews.jsx";
import {useActiveProfile} from "@/features/profiles/activeProfile.js";
import {useAuth} from "@/features/auth/useAuth.js";
import {buttonClass} from "@/components/ui/button-class.js";
import {mailtoOf} from "@/features/briefing/mailto.js";

const POLL_MS = 3000;

// what the server is doing while it writes the briefing of the last 'span'
const steps = (span) => ({
    starting: 'Starting…',
    ranking: `Looking for the stories of the last ${span} closest to your interests…`,
    choosing: 'The AI chooses the stories that fit your profile…',
    checking: 'The AI checks which articles tell the same news…',
    reading: 'Reading the articles of each story…',
    summarizing: 'Choosing the key passages of each story…',
    angles: 'Looking for other angles on each story…',
});

const written = (at) => new Date(at).toLocaleString('en-GB', {weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'});

export const BriefingPage = () => {
    const {user, logout, expired} = useAuth();
    const [profile, setProfile] = useState(undefined);      // undefined: not loaded yet
    const [briefing, setBriefing] = useState(undefined);
    const [error, setError] = useState(null);
    // the hours of news of the next briefing: the ones of the last until the reader chooses
    const [chosen, setChosen] = useState(null);
    const hours = chosen ?? briefing?.hours ?? DEFAULT_HOURS;
    // the cards of the next briefing, the last choice of the reader
    const [size, setSize] = useState(keptSize);
    // the cards ticked for the e-mail (their storyId), of one briefing: none in the next one
    const [ticks, setTicks] = useState({briefingId: null, storyIds: []});
    // the profile read: its briefing is shown, asked again when another one is chosen
    const active = useActiveProfile();

    const load = useCallback(async () => {
        try {
            const data = await BriefingApi.getLatest();
            if (expired(data)) return;
            if (data.error) throw new Error(data.error);
            setBriefing(data.briefing);
        } catch (err) {
            setError(err.message);
        }
    }, [expired]);

    // the profile says whether a briefing can be written at all
    useEffect(() => {
        if (!user) {
            logout();
            return;
        }
        setBriefing(undefined);
        setProfile(undefined);
        setChosen(null);
        ProfileApi.get()
            .then(data => {
                if (expired(data)) return;
                setProfile(data.profile ?? null);
            })
            .catch(err => setError(err.message));
        load();
    }, [user, logout, expired, load, active]);

    // asked again while it is written
    useEffect(() => {
        if (briefing?.status !== 'running') return undefined;
        const timer = setTimeout(load, POLL_MS);
        return () => clearTimeout(timer);
    }, [briefing, load]);

    const start = async () => {
        setError(null);
        const data = await BriefingApi.start(hours, size);
        if (expired(data)) return;
        if (data.error) setError(data.error);
        else setBriefing(data.briefing);
    };

    const chooseSize = (value) => {
        setSize(value);
        keepSize(value);
    };

    const ticked = ticks.briefingId === briefing?.id ? ticks.storyIds : [];
    const tick = (storyIds) => setTicks({briefingId: briefing.id, storyIds});
    const tickOne = (storyId, checked) => tick(checked ? [...ticked, storyId] : ticked.filter(other => other !== storyId));

    // shown at once, taken back if the server refuses it
    const vote = async (storyId, value) => {
        const setVote = (to) => setBriefing(current => current && ({
            ...current,
            items: current.items.map(item => item.storyId === storyId ? {...item, vote: to} : item),
        }));
        const before = briefing.items.find(item => item.storyId === storyId)?.vote ?? null;
        setVote(value);
        try {
            await BriefingApi.vote(briefing.id, storyId, value);
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
                standfirst="The stories of the last 24 hours, 2 days or 7 days closest to your interests, chosen by the AI. A story already shown can come back in the next edition: pass it."
                aside={profile && (
                    <div className="space-y-4">
                        {ready && (
                            <div>
                                <p className="kicker">This edition</p>
                                <p className="folio mt-1 !text-ink">Written {written(briefing.finishedAt ?? briefing.createdAt)}</p>
                                <p className="folio mt-0.5">
                                    The news of the last {spanOf(briefing.hours ?? DEFAULT_HOURS)}{count > 0 && `, ${count} ${count === 1 ? 'story' : 'stories'}`}
                                </p>
                            </div>
                        )}
                        <BriefingWindow hours={hours} onChange={setChosen} disabled={running}/>
                        <BriefingSize size={size} onChange={chooseSize} disabled={running}/>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="primary" onClick={start} loading={running} disabled={running}>
                                New briefing
                            </Button>
                        </div>
                        {ready && count > 0 && (
                            <p className="caption max-w-[32ch]">
                                Tick the stories to send them by e-mail from your mail app, or{' '}
                                <button type="button" onClick={() => tick(briefing.items.map(item => item.storyId))}
                                        className="cursor-pointer underline underline-offset-4 hover:text-ink">tick them all</button>.
                            </p>
                        )}
                    </div>
                )}
            />

            {/* room under the last card for the bar of the e-mail */}
            <div className={`page mt-12 space-y-8 md:mt-16${ticked.length > 0 ? ' pb-20' : ''}`}>
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

                        {running && <Working>{steps(spanOf(briefing.hours ?? DEFAULT_HOURS))[briefing.step] ?? 'Working…'}</Working>}

                        {briefing?.status === 'failed' && (
                            <Notice type="error">The last briefing could not be written: {briefing.error}</Notice>
                        )}

                        {ready && count === 0 && (
                            <Notice title="Nothing today">
                                No story of the last {spanOf(briefing.hours ?? DEFAULT_HOURS)} really fits your profile. A short briefing is better than an off-topic one:
                                try again later, or <Link className="link" to="/profile">widen your profile</Link>.
                            </Notice>
                        )}
                    </div>
                </div>

                {ready && count > 0 && (
                    <ol className="list-none p-0">
                        {briefing.items.map((item, index) => (
                            <li key={item.storyId}>
                                <BriefingCard item={item} number={index + 1} lede={index === 0}
                                              onVote={value => vote(item.storyId, value)}
                                              onSelect={checked => tickOne(item.storyId, checked)}
                                              selected={ticked.includes(item.storyId)}/>
                            </li>
                        ))}
                    </ol>
                )}

                {ready && ticked.length > 0 && (
                    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink bg-paper">
                        <div className="page flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                            <p className="folio !text-ink">
                                {ticked.length} {ticked.length === 1 ? 'story' : 'stories'} ticked
                                <span className="text-ink-mute"> · written in your mail app, to the address you choose</span>
                            </p>
                            <div className="flex gap-2">
                                <Button variant="subtle" size="sm" onClick={() => tick([])}>Untick all</Button>
                                {/* the mail app opens with the e-mail written: the reader adds the address and sends it */}
                                <a href={mailtoOf(briefing.items.filter(item => ticked.includes(item.storyId)))}
                                   className={buttonClass({variant: "primary", size: "sm"})}>Send email</a>
                            </div>
                        </div>
                    </div>
                )}

                {ready && briefing.watched?.length > 0 && (
                    <div className="grid-12">
                        <section className="col-span-12 md:col-span-7 md:col-start-3" aria-labelledby="watched-head">
                            <p className="kicker">Always shown</p>
                            <h2 id="watched-head" className="section-head mt-2">The names and terms you follow</h2>
                            <p className="caption mt-2 mb-6">
                                Every news of your sources of the last {spanOf(briefing.hours ?? DEFAULT_HOURS)} that names one,
                                not chosen by the AI. <Link className="link" to="/profile#terms">Change them</Link>.
                            </p>
                            <WatchedNews watched={briefing.watched}/>
                        </section>
                    </div>
                )}
            </div>
        </PageShell>
    );
};
