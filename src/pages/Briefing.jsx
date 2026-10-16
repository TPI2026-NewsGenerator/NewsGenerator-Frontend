//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: Briefing.jsx
//  Description: The daily briefing: the stories of the last hours chosen for the profile of the user,
//               of the last 1 to 7 days as they choose
//

import {useCallback, useEffect, useState} from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {Tabs} from "radix-ui";
import {PageShell, Opening} from "@/components/layout/Page.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Notice, Working} from "@/components/ui/text.jsx";
import {BriefingCard} from "@/features/briefing/components/BriefingCard.jsx";
import {AnalysisNote} from "@/features/briefing/components/BriefingAnalysis.jsx";
import {BriefingWindow} from "@/features/briefing/components/BriefingWindow.jsx";
import {DEFAULT_HOURS, spanOf, windowAfter} from "@/features/briefing/windows.js";
import {BriefingApi, ProfileApi} from "@/features/briefing/api/briefingApi.js";
import {BriefingSize} from "@/features/briefing/components/BriefingSize.jsx";
import {keepSize, keptSize} from "@/features/briefing/sizes.js";
import {BriefingFormat} from "@/features/briefing/components/BriefingFormat.jsx";
import {keepFormat, keptFormat} from "@/features/briefing/formats.js";
import {WatchedNews} from "@/features/briefing/components/WatchedNews.jsx";
import {MailBar} from "@/features/briefing/components/MailBar.jsx";
import {AddNews} from "@/features/briefing/components/AddNews.jsx";
import {useActiveProfile} from "@/features/profiles/activeProfile.js";
import {useAuth} from "@/features/auth/useAuth.js";
import {toast} from "@/lib/toast.js";

const POLL_MS = 3000;
// the analysis takes minutes after the cards: asked less often
const ANALYSIS_POLL_MS = 8000;

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

// a tab of the page, larger than the ones of the terms inside it (see WatchedNews)
const PAGE_TAB = '-mb-px cursor-pointer border-b-2 border-transparent pt-2 pb-3 font-display text-[1.6rem] leading-tight text-ink-mute transition-colors hover:text-ink data-[state=active]:border-ink data-[state=active]:text-ink';

const written = (at) => new Date(at).toLocaleString('en-GB', {weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'});

export const BriefingPage = () => {
    const {user, logout, expired} = useAuth();
    const [profile, setProfile] = useState(undefined);      // undefined: not loaded yet
    const [briefing, setBriefing] = useState(undefined);
    const [error, setError] = useState(null);
    // the hours of news of the next briefing: the ones of the last until the reader chooses (the default
    // after one of a window no longer offered)
    const [chosen, setChosen] = useState(null);
    const hours = chosen ?? windowAfter(briefing?.hours ?? DEFAULT_HOURS);
    // the cards of the next briefing, the last choice of the reader
    const [size, setSize] = useState(keptSize);
    // the way the cards are read, the last choice of the reader
    const [format, setFormat] = useState(keptFormat);
    // the server can send the cards ticked by e-mail
    const [mail, setMail] = useState(false);
    const [sending, setSending] = useState(false);
    // the cards ticked for the e-mail (their storyId), of one briefing: none in the next one
    const [ticks, setTicks] = useState({briefingId: null, storyIds: []});
    // the briefing whose stories of the terms followed are shown alone, none in the next one
    const [foundView, setFoundView] = useState(null);
    // the profile read: its briefing is shown, asked again when another one is chosen
    const active = useActiveProfile();
    const location = useLocation();
    const navigate = useNavigate();

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

    // the analysis written after the cards: asked again until it is, only it taken from the answer (the
    // reader may have voted or added a news meanwhile)
    useEffect(() => {
        if (briefing?.status !== 'ready' || briefing.analysis?.status !== 'running') return undefined;
        const id = briefing.id;
        const timer = setTimeout(async () => {
            try {
                const data = await BriefingApi.getLatest();
                if (expired(data) || data.error || data.briefing?.id !== id) return;
                setBriefing(current => current?.id === id ? {...current, analysis: data.briefing.analysis} : current);
            } catch {
                // asked again with the next change of the briefing
            }
        }, ANALYSIS_POLL_MS);
        return () => clearTimeout(timer);
    }, [briefing, expired]);

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

    const chooseFormat = (value) => {
        setFormat(value);
        keepFormat(value);
    };

    const ticked = ticks.briefingId === briefing?.id ? ticks.storyIds : [];
    const tick = (storyIds) => setTicks({briefingId: briefing.id, storyIds});
    const tickOne = (storyId, checked) => tick(checked ? [...ticked, storyId] : ticked.filter(other => other !== storyId));

    // the cards ticked, in the order the reader gave them in the bar, with the pictures and titles they changed,
    // without the denials and angles they took out, their sentences in the way chosen, sent to the address
    // 'to': true when sent
    const email = async (to, storyIds, pictures, titles, removed, way, ai) => {
        setSending(true);
        try {
            await BriefingApi.email(briefing.id, storyIds, to, pictures, titles, removed, way, ai);
            // sent, they count as read: the next briefings leave them out unless something new happens
            toast.success(`${ticked.length === 1 ? 'The story' : `The ${ticked.length} stories`} sent to ${to}, read now for your next briefings.`);
            tick([]);
            return true;
        } catch (err) {
            toast.error(`Not sent: ${err.message}`);
            return false;
        } finally {
            setSending(false);
        }
    };

    // a news added by its link: at the end of the briefing, ticked for the e-mail; true when added
    const addNews = async (url) => {
        try {
            const item = await BriefingApi.addNews(briefing.id, url);
            setBriefing(current => current && current.id === briefing.id ? {...current, items: [...current.items, item]} : current);
            tick([...ticked, item.storyId]);
            toast.success('The news was added at the end of the briefing, ticked for the e-mail.');
            return true;
        } catch (err) {
            toast.error(`Not added: ${err.message}`);
            return false;
        }
    };

    const removeNews = async (storyId) => {
        try {
            await BriefingApi.removeNews(briefing.id, storyId);
            setBriefing(current => current && ({...current, items: current.items.filter(item => item.storyId !== storyId)}));
            tick(ticked.filter(other => other !== storyId));
        } catch (err) {
            toast.error(`Not taken out: ${err.message}`);
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
    // a briefing written before the shorter ways (12.10.2026) has its key passages only
    const shorter = ready && briefing.items.some(item => item.digest);

    // the news of the terms the profile follows, in a tab of their own (#terms in the address, kept when
    // the page is opened again); none followed, the page has the briefing only
    const hasTerms = ready && briefing.watched?.length > 0;
    const watchedCount = hasTerms ? briefing.watched.reduce((sum, group) => sum + group.count, 0) : 0;
    const tab = hasTerms && location.hash === '#terms' ? 'terms' : 'briefing';
    const chooseTab = (value) => navigate({pathname: location.pathname, search: location.search, hash: value === 'terms' ? '#terms' : ''}, {replace: true});
    // the stories of the briefing naming a term, shown alone in the tab of the briefing
    const showFound = () => {
        setFoundView(briefing.id);
        chooseTab('briefing');
    };

    const cards = (
        <>
            {ready && count > 0 && !onlyFound && briefing.analysis && (
                <div className="grid-12">
                    <div className="col-span-12 md:col-span-7 md:col-start-3">
                        <AnalysisNote analysis={briefing.analysis} items={briefing.items}/>
                    </div>
                </div>
            )}

            {ready && count > 0 && (
                <div className="grid-12">
                    <div className="col-span-12 md:col-span-7 md:col-start-3">
                        {shorter
                            ? <BriefingFormat format={format} onChange={chooseFormat}/>
                            : <p className="caption">Bullet points and a short summary come with your next briefing: this one has its key passages only.</p>}
                    </div>
                </div>
            )}

            {found > 0 && (
                <div className="grid-12">
                    <div className="col-span-12 flex flex-wrap items-baseline gap-x-4 gap-y-2 md:col-span-7 md:col-start-3">
                        <Button size="sm" variant={onlyFound ? 'primary' : 'quiet'} aria-pressed={onlyFound}
                                onClick={() => setFoundView(onlyFound ? null : briefing.id)}>
                            {onlyFound ? 'Show the whole briefing' : `What you follow, found · ${found} ${found === 1 ? 'story' : 'stories'}`}
                        </Button>
                        <p className="caption">
                            {onlyFound
                                ? 'Only the stories that name something you follow, marked where they are.'
                                : 'The stories that name something you follow.'}
                        </p>
                    </div>
                </div>
            )}

            {ready && count > 0 && (
                <ol className="list-none p-0">
                    {/* the stories of the terms followed keep their place in the briefing */}
                    {briefing.items.map((item, index) => (!onlyFound || item.found?.length > 0) && (
                        <li key={item.storyId} id={`card-${item.storyId}`} className="scroll-mt-6">
                            <BriefingCard item={item} number={index + 1} lede={index === 0 && !onlyFound} marked={onlyFound} format={format}
                                          analysis={briefing.analysis?.cards?.[item.storyId]} analysisModel={briefing.analysis?.model}
                                          analysisPending={briefing.analysis?.status === 'running'
                                              && (briefing.analysis.picked ?? []).some(entry => entry.storyId === item.storyId)}
                                          onVote={item.imported ? undefined : value => vote(item.storyId, value)}
                                          onRemove={item.imported && mail ? () => removeNews(item.storyId) : undefined}
                                          onSelect={mail ? checked => tickOne(item.storyId, checked) : undefined}
                                          selected={ticked.includes(item.storyId)}/>
                        </li>
                    ))}
                </ol>
            )}
        </>
    );

    const terms = hasTerms && (
        <div className="grid-12">
            <section className="col-span-12 md:col-span-7 md:col-start-3" aria-labelledby="watched-head">
                <h2 id="watched-head" className="section-head">What you follow</h2>
                <p className="caption mt-2">
                    Every news of your sources of the last {spanOf(briefing.hours ?? DEFAULT_HOURS)} that names one,
                    whatever its relevance, not chosen by the AI. <Link className="link" to="/following">Change them</Link>.
                </p>
                {found > 0 && (
                    <p className="caption mt-1">
                        <button type="button" onClick={showFound} className="cursor-pointer text-accent-ink underline underline-offset-4 hover:text-ink">
                            {found === 1 ? '1 story of your briefing names them' : `${found} stories of your briefing name them`}
                        </button>
                    </p>
                )}
                <div className="mt-6"><WatchedNews watched={briefing.watched}/></div>
            </section>
        </div>
    );

    return (
        <PageShell user={user} onSignOut={logout}>
            <Opening
                kicker="The briefing"
                title="Your briefing"
                standfirst="The stories of the last 1 to 7 days closest to your interests, chosen by the AI. A story you sent by e-mail in the last two days counts as read: it comes back only when something new happened."
                // shown while the profile is asked too: it comes after the briefing, and the column
                // appearing then pushed the cards down (the user, 16.10.2026); none without a profile
                aside={profile !== null && (
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
                        {mail && ready && <AddNews key={briefing.id} onAdd={addNews}/>}
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

                {hasTerms ? (
                    // the briefing and the news of the terms followed, one tab each, the briefing first
                    <Tabs.Root value={tab} onValueChange={chooseTab} className="space-y-8">
                        <div className="grid-12">
                            <Tabs.List aria-label="Your briefing and what you follow"
                                       className="col-span-12 flex flex-wrap gap-x-8 gap-y-1 border-b border-ink md:col-span-7 md:col-start-3">
                                <Tabs.Trigger value="briefing" className={PAGE_TAB}>Briefing</Tabs.Trigger>
                                <Tabs.Trigger value="terms" className={PAGE_TAB}>
                                    Following <span className="folio align-middle">{watchedCount}</span>
                                </Tabs.Trigger>
                            </Tabs.List>
                        </div>
                        <Tabs.Content value="briefing" className="space-y-8 outline-none">{cards}</Tabs.Content>
                        <Tabs.Content value="terms" className="outline-none">{terms}</Tabs.Content>
                    </Tabs.Root>
                ) : cards}

                {/* the cards ticked are sent from the tab of the briefing */}
                {mail && ready && ticked.length > 0 && tab === 'briefing' && (
                    <MailBar accountEmail={user?.email} sending={sending} onSend={email} onClear={() => tick([])}
                             format={shorter ? format : null}
                             onPictures={storyId => BriefingApi.pictures(briefing.id, storyId)}
                             stories={briefing.items.flatMap((item, index) => ticked.includes(item.storyId)
                                 ? [{storyId: item.storyId, title: item.titleTranslation ?? item.title, number: index + 1,
                                     thumbnail: item.thumbnail ?? null, thumbnailSource: item.thumbnailSource ?? null,
                                     contested: item.contested ?? [],
                                     ai: item.ai ?? null,
                                     own: {points: item.pointsTranslation || item.points || null, digest: item.digestTranslation || item.digest || null},
                                     analysis: briefing.analysis?.status === 'ready' ? briefing.analysis.cards?.[item.storyId] ?? null : null,
                                     angles: (item.angles ?? []).map(angle => ({title: angle.titleTranslation ?? angle.title, source: angle.source})),
                                     official: (item.official ?? []).map(post => ({party: post.party, title: post.translation ?? post.title}))}] : [])}/>
                )}
            </div>
        </PageShell>
    );
};
