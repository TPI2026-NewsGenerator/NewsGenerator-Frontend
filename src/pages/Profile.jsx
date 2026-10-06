//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: Profile.jsx
//  Description: The profile of the user: what they want to read in their own words, the interests
//               the AI read in it, and their sources: one list of the ones found for them and the
//               ones they added, all read for their briefing and their searches, then the ways to add some
//

import {useCallback, useEffect, useState} from "react";
import {useLocation} from "react-router-dom";
import {PageShell, Opening, Section} from "@/components/layout/Page.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Help, Label, Select, Textarea} from "@/components/ui/field.jsx";
import {Meta, Notice, Working} from "@/components/ui/text.jsx";
import {ProfileApi} from "@/features/briefing/api/briefingApi.js";
import {FeedApi} from "@/features/search/api/feedApi.js";
import {SearchApi} from "@/features/search/api/searchApi.js";
import {RecommendedSources} from "@/features/briefing/components/RecommendedSources.jsx";
import {AddSources} from "@/features/briefing/components/AddSources.jsx";
import {SourceList} from "@/features/briefing/components/SourceList.jsx";
import {LANGUAGE_OPTIONS, MIN_PROFILE_TEXT, PLACEHOLDER, languageLabel, likelyLanguage} from "@/features/briefing/profileWords.js";
import {useAuth} from "@/features/auth/useAuth.js";
import {toast} from "@/lib/toast.js";

const POLL_MS = 5000;
const DISCOVERY = {
    idle: {label: 'not started'},
    running: {label: 'looking for sources…'},
    done: {label: 'done'},
    failed: {label: 'failed', tone: 'accent'},
};
// the sources of Google News are added, the press is still looked for (see DiscoveryService)
const PRESS = {label: 'first sources added, looking in the press…'};

// one interest read by the AI, which the user can correct
const Interest = ({interest, number, onSave, onDelete, busy}) => {
    const [text, setText] = useState(interest.text);
    const secondary = interest.weight < 1;
    const id = `interest-${interest.id}`;

    return (
        <li className="grid-12 gap-y-3 border-b border-rule py-6">
            <div className="col-span-12 flex items-baseline gap-3 md:col-span-1 md:block">
                <p aria-hidden className="font-display text-[1.8rem] leading-none text-ink-mute">{String(number).padStart(2, '0')}</p>
                <Meta className="md:mt-2 md:block">{secondary ? 'secondary' : 'main'}</Meta>
            </div>
            <div className="col-span-12 md:col-span-7">
                <label htmlFor={id} className="sr-only">Interest {number}</label>
                <Textarea id={id} rows={2} value={text} onChange={event => setText(event.target.value)}/>
                {interest.keywords && <p className="caption mt-2">Keywords used to find its sources: {interest.keywords}</p>}
            </div>
            <div className="col-span-12 flex flex-wrap items-start gap-2 md:col-span-3 md:col-start-10 md:flex-col md:items-end">
                <Button size="sm" variant="primary" disabled={busy || text.trim() === interest.text} onClick={() => onSave({text})}>Save</Button>
                <Button size="sm" disabled={busy} onClick={() => onSave({weight: secondary ? 1 : 0.85})}
                        title="A secondary interest weighs less in the briefing">
                    {secondary ? 'Make it main' : 'Make it secondary'}
                </Button>
                <Button size="sm" variant="subtle" disabled={busy} onClick={onDelete} title="Remove this interest">
                    Remove
                </Button>
            </div>
        </li>
    );
};

export const ProfilePage = () => {
    const {user, logout, expired} = useAuth();
    const {hash} = useLocation();
    const [options, setOptions] = useState({languages: []});
    const [data, setData] = useState(null);         // {profile, interests, sources}
    const [form, setForm] = useState({text: '', language: likelyLanguage(LANGUAGE_OPTIONS.map(option => option.value))});
    const [saving, setSaving] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    // the sources added by hand, the language of the next one and its categories, and a count
    // bumped when some are added from the recommendations, to read them again
    const [own, setOwn] = useState([]);
    const [ownLanguage, setOwnLanguage] = useState(null);
    const [ownCategories, setOwnCategories] = useState([]);
    const [ownVersion, setOwnVersion] = useState(0);

    // every call answers the whole profile, shown as it is
    const apply = useCallback((answer, {fillForm = false} = {}) => {
        if (expired(answer)) return false;
        if (answer.error) {
            setError(answer.error);
            return false;
        }
        // the same answer as before keeps the page as it is: asked every 5 seconds while sources are
        // looked for, it drew the whole page again each time, a hundred sources and more
        setData(current => current !== null && JSON.stringify(current) === JSON.stringify(answer) ? current : answer);
        if (fillForm && answer.profile) {
            setForm({text: answer.profile.text, language: answer.profile.language});
        }
        return true;
    }, [expired]);

    useEffect(() => {
        if (!user) {
            logout();
            return;
        }
        ProfileApi.getOptions().then(setOptions).catch(err => setError(err.message));
        ProfileApi.get().then(answer => apply(answer, {fillForm: true})).catch(err => setError(err.message));
    }, [user, logout, apply]);

    // the categories of the shared sources, in the language of the site added or searched (by default
    // the one the reader reads in)
    const language = ownLanguage ?? data?.profile?.language ?? form.language;
    useEffect(() => {
        SearchApi.getCategories(language)
            .then(answer => setOwnCategories(answer.categories ?? []))
            .catch(err => console.error("Failed to fetch categories", err));
    }, [language]);

    // a link to a section (the search page links to the sources added), shown once the profile is there
    const loaded = data !== null;
    useEffect(() => {
        if (loaded && hash) document.getElementById(hash.slice(1))?.scrollIntoView({block: 'start'});
    }, [loaded, hash]);

    // the sources are found in background: asked again until done, one question at a time
    const discovering = data?.profile?.discovery?.status === 'running';
    useEffect(() => {
        if (!discovering) return undefined;
        let timer;
        let stopped = false;
        const poll = () => {
            timer = setTimeout(() => ProfileApi.get()
                .then(answer => !stopped && apply(answer))
                .catch(() => {})
                .finally(() => !stopped && poll()), POLL_MS);
        };
        poll();
        return () => {
            stopped = true;
            clearTimeout(timer);
        };
    }, [discovering, apply]);
    // the sources added by hand ('profile' ones come with the profile, with how many news are on it)
    useEffect(() => {
        if (!user) return;
        FeedApi.getUserFeeds()
            .then(answer => setOwn((answer.feeds ?? []).filter(feed => (feed.origin ?? 'user') === 'user')))
            .catch(err => console.error("Failed to fetch sources", err));
    }, [user, ownVersion]);

    // the changes of the sources, stable: the list is not drawn again when the profile is asked again
    const onOwnChanged = useCallback(() => ProfileApi.get().then(answer => apply(answer)).catch(() => {}), [apply]);
    const onAdded = useCallback((feeds) => {
        if (feeds.length === 0) return;
        setOwn(current => [...feeds, ...current]);
        onOwnChanged();
    }, [onOwnChanged]);
    const changeOwn = useCallback(async (feed, changes) => {
        const answer = await FeedApi.updateFeed(feed.id, changes);
        if (!answer || answer.error) {
            toast.error(answer?.error ?? "This source could not be changed.");
            return;
        }
        setOwn(current => current.map(other => other.id === feed.id ? {...other, trusted: answer.trusted, shared: answer.shared} : other));
    }, []);
    const removeOwn = useCallback(async (feed) => {
        const answer = await FeedApi.deleteUserFeed(feed.id);
        if (!answer || answer.error) {
            toast.error(answer?.error ?? "This source could not be removed.");
            return;
        }
        setOwn(current => current.filter(other => other.id !== feed.id));
        onOwnChanged();
    }, [onOwnChanged]);

    const save = async () => {
        setError(null);
        setSaving(true);
        try {
            if (apply(await ProfileApi.save(form))) {
                toast.success('Profile saved, its sources are being found.');
            }
        } finally {
            setSaving(false);
        }
    };

    // a change of an interest, then the profile as the server answers it
    const change = useCallback(async (call) => {
        setError(null);
        setBusy(true);
        try {
            apply(await call());
        } finally {
            setBusy(false);
        }
    }, [apply]);

    // a source trusted or not: its stories come first in the briefing, and it is never removed. One
    // found for the profile is answered with the profile, one added by hand on its own
    const trust = useCallback((source) => source.origin === 'user'
        ? changeOwn(source, {trusted: !source.trusted})
        : change(async () => {
            const answer = await FeedApi.updateFeed(source.id, {trusted: !source.trusted});
            return answer?.error ? answer : ProfileApi.get();
        }), [change, changeOwn]);
    const share = useCallback((source) => changeOwn(source, {shared: !source.shared}), [changeOwn]);
    // a source the thumbs left out brought back for good
    const keep = useCallback((source) => change(() => ProfileApi.keepSource(source.url)), [change]);

    const phase = data?.profile?.discovery?.phase;
    const discovery = discovering && phase === 'press' ? PRESS : DISCOVERY[data?.profile?.discovery?.status ?? 'idle'];
    const limits = data?.limits ?? {profileFeeds: 60, relevanceDays: 14};

    return (
        <PageShell user={user} onSignOut={logout}>
            <Opening
                kicker="Your profile"
                title="What you want to read"
                standfirst="In your own words: the subjects you follow, how closely, and what you don't want. The AI splits it into interests, and sources are found for each of them."
                aside={data?.profile && (
                    <div className="space-y-3">
                        <div>
                            <p className="kicker">Interests</p>
                            <p className="folio mt-1 !text-ink">{data.interests.length}</p>
                        </div>
                        <div>
                            <p className="kicker">Sources</p>
                            <p className="folio mt-1 !text-ink">{data.sources.length} found, {own.length} added</p>
                        </div>
                        <div>
                            <p className="kicker">Search for sources</p>
                            <Meta tone={discovery.tone ?? 'ink'} className="mt-1 block">{discovery.label}</Meta>
                        </div>
                    </div>
                )}
            />

            {data === null && !error && (
                <div className="page mt-10">
                    <div className="grid-12">
                        <Working className="col-span-12 md:col-span-7 md:col-start-3">Opening your profile…</Working>
                    </div>
                </div>
            )}

            {error && (
                <div className="page mt-10">
                    <div className="grid-12">
                        <Notice type="error" onClose={() => setError(null)} className="col-span-12 md:col-span-7 md:col-start-3">{error}</Notice>
                    </div>
                </div>
            )}

            <Section kicker="Your words" title="In your own words"
                     intro="The subjects you follow, how closely, and what you don't want. The more precise, the better the briefing.">
                <div className="grid-12 gap-y-8">
                    <div className="col-span-12 md:col-span-8">
                        <Label htmlFor="profile-text">What do you want to read?</Label>
                        <Textarea id="profile-text" rows={7} className="mt-3" value={form.text} placeholder={PLACEHOLDER}
                                  onChange={event => setForm({...form, text: event.target.value})}/>
                    </div>
                    <aside className="col-span-12 md:col-span-3 md:col-start-10 md:mt-8 md:border-l md:border-rule md:pl-5">
                        <p className="kicker">For example</p>
                        <p className="caption mt-2 max-w-[30ch] italic">“{PLACEHOLDER}”</p>
                    </aside>

                    <div className="col-span-12 md:col-span-5">
                        <Label htmlFor="profile-language">Your language</Label>
                        <Select id="profile-language" className="mt-2" aria-describedby="profile-language-help"
                                options={(options.languages.length > 0 ? options.languages : LANGUAGE_OPTIONS.map(option => option.value))
                                    .map(value => ({value, label: languageLabel(value)}))}
                                value={form.language} onChange={event => setForm({...form, language: event.target.value})}/>
                        <Help id="profile-language-help">
                            Your briefing and your searches read the news of every language, and translate them into this one.
                        </Help>
                    </div>

                    <div className="col-span-12 md:col-span-8">
                        <Button variant="primary" onClick={save} loading={saving}
                                disabled={form.text.trim().length < MIN_PROFILE_TEXT || !form.language}>
                            {data?.profile ? 'Save my profile' : 'Create my profile'}
                        </Button>
                        {saving && <p className="caption mt-3 italic">The AI reads your profile, this takes a few seconds…</p>}
                    </div>
                </div>
            </Section>

            {data?.interests?.length > 0 && (
                <Section kicker="As the AI read it" title="Your interests"
                         intro="Each one is matched on its own with the news: correct them if the AI misread you.">
                    <ol className="list-none border-t border-rule p-0">
                        {data.interests.map((interest, index) => (
                            <Interest key={`${interest.id}:${interest.text}:${interest.weight}`} interest={interest} number={index + 1} busy={busy}
                                      onSave={changes => change(() => ProfileApi.updateInterest(interest.id, changes))}
                                      onDelete={() => change(() => ProfileApi.deleteInterest(interest.id))}/>
                        ))}
                    </ol>
                    {/* what the reader does not want is no interest (its vector would bring those news):
                        the briefing reads it in their words and leaves it out */}
                    {data.profile?.refused?.length > 0 && (
                        <div className="mt-8">
                            <p className="kicker">Left out</p>
                            <ul className="mt-2 list-none p-0">
                                {data.profile.refused.map(refused => (
                                    <li key={refused} className="body-text">{refused}</li>
                                ))}
                            </ul>
                            <p className="caption mt-2">What you said you don't want: never an interest, your briefing leaves it out.</p>
                        </div>
                    )}
                </Section>
            )}

            {data && (
                <Section
                    id="sources"
                    kicker="Your sources"
                    title="Your sources"
                    intro={<>
                        <p>
                            Every source read for your briefing and your searches, with the shared ones, only for you.
                            The ones <em>found for you</em> publish on your interests: each search adds new ones, up
                            to {limits.profileFeeds}, and one with no news on your interests in {limits.relevanceDays} days
                            is removed. The ones <em>added by you</em> are never removed. Star the ones you trust: their
                            stories come first in your briefing when they fit your interests.
                        </p>
                        {data.googleSearches > 0 && (
                            <p className="mt-3">
                                Google News is also searched for your interests ({data.googleSearches} searches,
                                every hour): a story it alone tells needs two media, or one we already read.
                            </p>
                        )}
                    </>}
                    aside={data.profile && (
                        <Button disabled={discovering || busy} onClick={() => change(() => ProfileApi.rediscover())}>
                            Find more sources
                        </Button>
                    )}
                >
                    {data.profile && (
                        <div className="mb-6 space-y-6 empty:hidden">
                            {discovering && phase !== 'press' && (
                                <Working>
                                    Looking for sources in Google News: the first ones in a few minutes, as each medium
                                    named is read. You can leave the page or search meanwhile, they are added when found.
                                </Working>
                            )}
                            {discovering && phase === 'press' && (
                                <Working>
                                    The sources of Google News are added and read for your next briefing. Still looking
                                    in the press, which answers slowly: a few more minutes. No need to wait here.
                                </Working>
                            )}
                            {data.profile.discovery.status === 'failed' && (
                                <Notice type="error">{data.profile.discovery.error}</Notice>
                            )}
                            {!discovering && data.sources.length === 0 && data.profile.discovery.status === 'done' && (
                                <Notice>No source beyond the shared ones was found for your interests.</Notice>
                            )}
                        </div>
                    )}
                    <SourceList found={data.sources} own={own} refused={data.refusedSources} limits={limits} busy={busy}
                                onTrust={trust} onShare={share} onRemove={removeOwn} onKeep={keep}/>
                </Section>
            )}

            {data && (
                <Section id="add-sources" kicker="Add sources" title="Add sources"
                         intro="A website, a search of the directory and the web, a file of yours, or a source other readers read on your interests: the ones you add join your sources, above. Share one you added and it can be suggested to the other readers who follow its subjects.">
                    <div className="space-y-12">
                        <AddSources api={FeedApi} onAdded={onAdded}
                                    categories={ownCategories} language={language}
                                    languages={LANGUAGE_OPTIONS} onLanguage={setOwnLanguage}/>
                        {data.profile && (
                            <RecommendedSources api={FeedApi} expired={expired} onAdded={() => setOwnVersion(version => version + 1)}
                                                reloadKey={`${data.profile.discovery.status}:${data.interests.map(interest => interest.id).join(',')}`}/>
                        )}
                    </div>
                </Section>
            )}
        </PageShell>
    );
};
