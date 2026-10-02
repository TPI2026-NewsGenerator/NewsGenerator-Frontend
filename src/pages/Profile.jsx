//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: Profile.jsx
//  Description: The profile of the user: what they want to read in their own words, the interests
//               the AI read in it, the sources found for them and the ones they add, all read
//               for their briefing and their searches
//

import {useCallback, useEffect, useState} from "react";
import {useLocation} from "react-router-dom";
import {PageShell, Opening, Section} from "@/components/layout/Page.jsx";
import {FaRegStar, FaStar} from "react-icons/fa";
import {Button, IconButton} from "@/components/ui/button.jsx";
import {CheckboxGroup, Help, Label, Select, Textarea} from "@/components/ui/field.jsx";
import {Meta, MetaLine, Notice, Working} from "@/components/ui/text.jsx";
import {ScrollFrame} from "@/components/ui/scroll-area.jsx";
import {ProfileApi} from "@/features/briefing/api/briefingApi.js";
import {FeedApi} from "@/features/search/api/feedApi.js";
import {SearchApi} from "@/features/search/api/searchApi.js";
import {RecommendedSources} from "@/features/briefing/components/RecommendedSources.jsx";
import {UserFeeds} from "@/features/briefing/components/UserFeeds.jsx";
import {LANGUAGE_OPTIONS, MIN_PROFILE_TEXT, PLACEHOLDER, languageLabel, likelyLanguage} from "@/features/briefing/profileWords.js";
import {useAuth} from "@/features/auth/useAuth.js";
import {toast} from "@/lib/toast.js";
import {feedAddress} from "@/lib/utils.js";

const POLL_MS = 5000;
const DISCOVERY = {
    idle: {label: 'not started'},
    running: {label: 'looking for sources…'},
    done: {label: 'done'},
    failed: {label: 'failed', tone: 'accent'},
};

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
    const [options, setOptions] = useState({topics: [], languages: []});
    const [data, setData] = useState(null);         // {profile, interests, sources}
    const [form, setForm] = useState({text: '', topics: [], language: likelyLanguage(LANGUAGE_OPTIONS.map(option => option.value))});
    const [saving, setSaving] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    // the sources added by hand: the language of the next one and its categories, and a count
    // bumped when one is added from the recommendations, to list it
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
        setData(answer);
        if (fillForm && answer.profile) {
            setForm({text: answer.profile.text, topics: answer.profile.topics, language: answer.profile.language});
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

    // the sources are found in background: asked again until done
    const discovering = data?.profile?.discovery?.status === 'running';
    useEffect(() => {
        if (!discovering) return undefined;
        const timer = setTimeout(() => ProfileApi.get().then(answer => apply(answer)), POLL_MS);
        return () => clearTimeout(timer);
    }, [data, discovering, apply]);

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
    const change = async (call) => {
        setError(null);
        setBusy(true);
        try {
            apply(await call());
        } finally {
            setBusy(false);
        }
    };

    // a source found for the profile trusted or not: its stories come first in the briefing, and it
    // is never removed
    const trust = (source) => change(async () => {
        const answer = await FeedApi.updateFeed(source.id, {trusted: !source.trusted});
        return answer?.error ? answer : ProfileApi.get();
    });

    const discovery = DISCOVERY[data?.profile?.discovery?.status ?? 'idle'];
    const limits = data?.limits ?? {profileFeeds: 60, relevanceDays: 14};
    // the sources the thumbs left out: still listed with the others, marked
    const refused = new Set((data?.refusedSources ?? []).map(source => source.url));

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
                            <p className="kicker">Sources found</p>
                            <p className="folio mt-1 !text-ink">{data.sources.length} of {limits.profileFeeds} at most</p>
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

                    {options.topics.length > 0 && (
                        <CheckboxGroup className="col-span-12 md:col-span-8" legend="Topics (optional)"
                                       options={options.topics.map(topic => ({value: topic, label: topic}))}
                                       value={form.topics} onChange={topics => setForm({...form, topics})}/>
                    )}

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
                </Section>
            )}

            {data?.profile && (
                <Section
                    kicker="Your sources"
                    title="Sources found for you"
                    intro={<>
                        <p>
                            The media that publish on your interests, and in each of them the section about them,
                            read with the shared sources, only for you. Each search adds new ones to these, up
                            to {limits.profileFeeds}; a source with no news on your interests
                            in {limits.relevanceDays} days is removed.
                        </p>
                        {data.googleSearches > 0 && (
                            <p className="mt-3">
                                Google News is also searched for your interests ({data.googleSearches} searches,
                                every hour): a story it alone tells needs two media, or one we already read.
                            </p>
                        )}
                    </>}
                    aside={
                        <Button disabled={discovering || busy} onClick={() => change(() => ProfileApi.rediscover())}>
                            Find more sources
                        </Button>
                    }
                >
                    <div className="space-y-6">
                        {discovering && <Working>Looking for sources: this takes a few minutes…</Working>}
                        {data.profile.discovery.status === 'failed' && (
                            <Notice type="error">{data.profile.discovery.error}</Notice>
                        )}
                        {!discovering && data.sources.length === 0 && data.profile.discovery.status === 'done' && (
                            <Notice>No source beyond the shared ones was found for your interests.</Notice>
                        )}
                    </div>
                    {data.sources.length > 0 && (
                        <div className="mt-6">
                            <ScrollFrame label={`The ${data.sources.length} sources found for you`}>
                                <ul className="[&>li:last-child]:border-b-0">
                                    {data.sources.map(source => (
                                        <li key={source.id} className="grid-12 items-baseline gap-y-1 border-b border-rule py-4">
                                            <p className="col-span-12 flex items-center gap-2 font-semibold [overflow-wrap:anywhere] md:col-span-3">
                                                <IconButton label={source.trusted ? `Stop trusting ${source.site}` : `Trust ${source.site}`}
                                                            pressed={Boolean(source.trusted)} disabled={busy}
                                                            title={source.trusted
                                                                ? 'Trusted: its stories come first in your briefing when they fit your interests, and it is never removed'
                                                                : 'Trust this source: its stories will come first in your briefing when they fit your interests'}
                                                            onClick={() => trust(source)}>
                                                    {source.trusted ? <FaStar/> : <FaRegStar/>}
                                                </IconButton>
                                                {source.site}
                                            </p>
                                            <div className="col-span-12 md:col-span-6">
                                                <MetaLine>
                                                    <Meta>{source.category}</Meta>
                                                    {source.language && <Meta>{source.language}</Meta>}
                                                    <Meta tone={source.relevant > 0 ? 'ink' : undefined}
                                                          title={`Its news of the last ${limits.relevanceDays} days on your interests`}>
                                                        {source.relevant > 0 ? `${source.relevant} news on your interests` : 'nothing on your interests lately'}
                                                    </Meta>
                                                    {refused.has(source.url) && (
                                                        <Meta tone="accent" title="Left out after your thumbs: no longer read for your briefing, see below">left out</Meta>
                                                    )}
                                                </MetaLine>
                                                {source.error && <p className="caption mt-1 !text-accent-ink">{source.error}</p>}
                                            </div>
                                            <p className="caption col-span-12 truncate md:col-span-3 md:text-right" title={feedAddress(source.url)}>{feedAddress(source.url)}</p>
                                        </li>
                                    ))}
                                </ul>
                            </ScrollFrame>
                        </div>
                    )}
                </Section>
            )}

            {data && (
                <Section id="own-sources" kicker="Added by you" title="Sources you added"
                         intro="Websites you add yourself are read with the others for your briefing and your searches, only for you, and never removed. Star the ones you trust: their stories come first in your briefing when they fit your interests. Share one and it can be suggested to the other readers who follow its subjects.">
                    <UserFeeds api={FeedApi} origin="user" reloadKey={ownVersion}
                               onChanged={() => ProfileApi.get().then(answer => apply(answer)).catch(() => {})}
                               categories={ownCategories} language={language}
                               languages={LANGUAGE_OPTIONS} onLanguage={setOwnLanguage}/>
                </Section>
            )}

            {data?.profile && (
                <RecommendedSources api={FeedApi} expired={expired} onAdded={() => setOwnVersion(version => version + 1)}
                                    reloadKey={`${data.profile.discovery.status}:${data.interests.map(interest => interest.id).join(',')}`}/>
            )}

            {data?.refusedSources?.length > 0 && (
                <Section kicker="Left out" title="Sources left out after your thumbs"
                         intro="These sources found for you brought stories you said were not for you, again and again: they are no longer read for your briefing, and not found again. Keep one to bring it back for good.">
                    <ul className="border-t border-rule">
                        {data.refusedSources.map(source => (
                            <li key={source.url} className="grid-12 items-baseline gap-y-2 border-b border-rule py-4">
                                <div className="col-span-12 md:col-span-3">
                                    <p className="font-semibold">{source.site}</p>
                                    <p className="caption truncate" title={feedAddress(source.url)}>{feedAddress(source.url)}</p>
                                </div>
                                <MetaLine className="col-span-12 md:col-span-6">
                                    <Meta tone="accent">{source.refused} not for me</Meta>
                                    {source.liked > 0 && <Meta tone="ink">{source.liked} good for me</Meta>}
                                </MetaLine>
                                <div className="col-span-12 md:col-span-3 md:justify-self-end">
                                    <Button size="sm" disabled={busy} onClick={() => change(() => ProfileApi.keepSource(source.url))}>
                                        Keep it
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}
        </PageShell>
    );
};
