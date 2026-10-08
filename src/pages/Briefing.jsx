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
import {MailBar} from "@/features/briefing/components/MailBar.jsx";
import {useActiveProfile} from "@/features/profiles/activeProfile.js";
import {useAuth} from "@/features/auth/useAuth.js";
import {toast} from "@/lib/toast.js";

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
    // the server can send the cards ticked by e-mail
    const [mail, setMail] = useState(false);
    const [sending, setSending] = useState(false);
    // the cards ticked for the e-mail (their storyId), of one briefing: none in the next one
    const [ticks, setTicks] = useState({briefingId: null, storyIds: []});
    // the briefing whose stories of the terms followed are shown alone, none in the next one
    const [foundView, setFoundView] = useState(null);
    // the profile read: its briefing is shown, asked again when another one is chosen
    const active = useActiveProfile();

    const load = useCallback(async () => {
        try {
            const data = await BriefingApi.getLatest();
            if (expired(data)) return;
            if (data.error) throw new Error(data.error);
            setBriefing(data.briefing);
            setMail(Boolean(data.mail));
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

    // the cards ticked, in the order of the briefing, sent to the address 'to': true when sent
    const email = async (to) => {
        setSending(true);
        try {
            await BriefingApi.email(briefing.id, ticked, to);
            toast.success(`${ticked.length === 1 ? 'The story' : `The ${ticked.length} stories`} sent to ${to}.`);
            tick([]);
            return true;
        } catch (err) {
            toast.error(`Not sent: ${err.message}`);
            return false;
        } finally {
            setSending(false);
        }
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
            await BriefingApi.vote(briefing.id, storyId, value);
        } catch (err) {
            setVote(before);
            setError(`The thumb was not saved: ${err.message}`);
        }
    };

    const running = briefing?.status === 'running';
    const ready = briefing?.status === 'ready';
    const count = ready ? briefing.items.length : 0;
    // the stories naming a term the profile follows (item.found), shown alone on demand, the briefing as
    // written otherwise
    const found = ready ? briefing.items.filter(item => item.found?.length > 0).length : 0;
    const onlyFound = found > 0 && foundView === briefing.id;

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
                        {mail && ready && count > 0 && (
                            <p className="caption max-w-[32ch]">
                                Tick the stories to send them by e-mail, or{' '}
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

                {found > 0 && (
                    <div className="grid-12">
                        <div className="col-span-12 flex flex-wrap items-baseline gap-x-4 gap-y-2 md:col-span-7 md:col-start-3">
                            <Button size="sm" variant={onlyFound ? 'primary' : 'quiet'} aria-pressed={onlyFound}
                                    onClick={() => setFoundView(onlyFound ? null : briefing.id)}>
                                {onlyFound ? 'Show the whole briefing' : `Names and terms found · ${found} ${found === 1 ? 'story' : 'stories'}`}
                            </Button>
                            <p className="caption">
                                {onlyFound
                                    ? 'Only the stories that name a name or a term you follow, marked where they are.'
                                    : 'The stories that name a name or a term you follow.'}
                            </p>
                        </div>
                    </div>
                )}

                {ready && count > 0 && (
                    <ol className="list-none p-0">
                        {/* the stories of the terms followed keep their place in the briefing */}
                        {briefing.items.map((item, index) => (!onlyFound || item.found?.length > 0) && (
                            <li key={item.storyId}>
                                <BriefingCard item={item} number={index + 1} lede={index === 0 && !onlyFound} marked={onlyFound}
                                              onVote={value => vote(item.storyId, value)}
                                              onSelect={mail ? checked => tickOne(item.storyId, checked) : undefined}
                                              selected={ticked.includes(item.storyId)}/>
                            </li>
                        ))}
                    </ol>
                )}

                {mail && ready && ticked.length > 0 && (
                    <MailBar count={ticked.length} accountEmail={user?.email} sending={sending}
                             onSend={email} onClear={() => tick([])}/>
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
