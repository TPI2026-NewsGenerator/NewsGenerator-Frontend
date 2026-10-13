//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: Following.jsx
//  Description: What the profile follows, in one list (13.10.2026): the clubs, people and organisations
//               found in Wikidata, each opening the page of its news and of what it is linked to, and
//               the names or words followed as written. Their news are in the briefing, in a tab of
//               their own; the names met on several cards are suggested
//

import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {Opening, PageShell, Section} from "@/components/layout/Page.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Checkbox, Input, Label} from "@/components/ui/field.jsx";
import {Meta, MetaLine, Notice, Working} from "@/components/ui/text.jsx";
import {EntityApi, pageOf} from "@/features/entities/entityApi.js";
import {KIND_LABELS} from "@/features/entities/kinds.js";
import {useActiveProfile} from "@/features/profiles/activeProfile.js";
import {useAuth} from "@/features/auth/useAuth.js";
import {toast} from "@/lib/toast.js";

const SEARCH_AFTER_MS = 400;        // the reader stops typing, Wikidata is asked
const sameWord = (a, b) => a.toLowerCase() === b.toLowerCase();
const cleanWord = (text) => text.replace(/["“”,\s]+/g, ' ').trim();

export const FollowingPage = () => {
    const {user, logout, expired} = useAuth();
    const active = useActiveProfile();
    const [followed, setFollowed] = useState(null);     // {entities, words, limits}
    const [suggested, setSuggested] = useState([]);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState('');
    const [found, setFound] = useState(null);           // null: nothing asked yet
    const [searching, setSearching] = useState(false);
    const [busy, setBusy] = useState(null);             // the qid or the word being changed

    useEffect(() => {
        if (!user) {
            logout();
            return;
        }
        let current = true;
        // another profile chosen: none of the last one's shown while its own come
        setFollowed(null);
        setSuggested([]);
        EntityApi.list()
            .then(data => {
                if (!current || expired(data)) return;
                if (data.error) setError(data.error);
                else setFollowed({entities: data.entities ?? [], words: data.words ?? [], limits: data.limits ?? {entities: 30, words: 20}});
            })
            .catch(err => current && setError(err.message));
        // the suggestions never stop the page
        EntityApi.suggestions()
            .then(data => current && !data.error && setSuggested(data.names ?? []))
            .catch(() => {});
        return () => {
            current = false;
        };
    }, [user, logout, expired, active]);

    // asked once the reader stops typing; an answer to an older text is dropped
    useEffect(() => {
        const text = query.trim();
        if (text.length < 2) return undefined;
        let current = true;
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const data = await EntityApi.search(text);
                if (!current || expired(data)) return;
                if (data.error) toast.error(data.error);
                else setFound(data.items ?? []);
            } catch (err) {
                if (current) toast.error(err.message);
            } finally {
                if (current) setSearching(false);
            }
        }, SEARCH_AFTER_MS);
        return () => {
            current = false;
            clearTimeout(timer);
        };
    }, [query, expired]);

    // one change of the list: the call, then what the server answers put in place
    const run = async (key, call, apply) => {
        setBusy(key);
        try {
            const data = await call();
            if (expired(data)) return false;
            if (data.error) {
                toast.error(data.error);
                return false;
            }
            setFollowed(current => ({...current, ...apply(data, current)}));
            return true;
        } catch (err) {
            toast.error(err.message);
            return false;
        } finally {
            setBusy(null);
        }
    };
    const followItem = (qid) => run(qid, () => EntityApi.follow(qid), data => ({entities: data.entities ?? []}));
    const unfollowItem = (qid) => run(qid, () => EntityApi.unfollow(qid), data => ({entities: data.entities ?? []}));
    const followWord = (word) => run(word, () => EntityApi.addWord(word), data => ({words: data.words ?? []}));
    const unfollowWord = (word) => run(word, () => EntityApi.removeWord(word), data => ({words: data.words ?? []}));
    const inBriefing = (qid, on) => run(qid, () => EntityApi.setInBriefing(qid, on), (data, current) => ({
        entities: current.entities.map(entity => entity.qid === qid ? {...entity, inBriefing: data.entity.inBriefing} : entity),
    }));
    // a name of the cards followed: its item when the tagger linked it to one, else as written
    const followSuggested = async (name) => {
        const done = name.qid ? await followItem(name.qid) : await followWord(name.name);
        if (done) setSuggested(current => current.filter(other => other !== name));
    };

    const entities = followed?.entities ?? [];
    const words = followed?.words ?? [];
    const limits = followed?.limits ?? {entities: 30, words: 20};
    const qids = new Set(entities.map(entity => entity.qid));
    const text = cleanWord(query);
    const shown = text.length >= 2 ? found : null;
    const wordFollowed = words.some(word => sameWord(word, text));

    return (
        <PageShell user={user} onSignOut={logout}>
            <Opening kicker="Following" title="What you follow"
                     standfirst="A club, a person, an organisation as Wikidata knows them, or a name or a word as written: every news of your sources that names one is listed in your briefing, in a tab of its own. No relevance, no AI: all of them."/>

            <Section kicker="Find" title="What do you want to follow?">
                <div className="grid-12">
                    <div className="col-span-12 md:col-span-7 md:col-start-3">
                        <Label htmlFor="entity-search">A club, a person, an organisation, a word</Label>
                        <Input id="entity-search" type="search" autoComplete="off" placeholder="Roger Federer, Tesla, the World Health Organization, VAR…"
                               value={query} onChange={event => setQuery(event.target.value)}/>
                        {text.length >= 2 && (
                            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule pb-3">
                                <span className="min-w-0">
                                    <span className="font-semibold">“{text}”, as written</span>
                                    <span className="caption block">
                                        Every news writing it, as a whole word, in the title or the description: for a word, or a name Wikidata does not know.
                                    </span>
                                </span>
                                {wordFollowed
                                    ? <span className="folio">Followed</span>
                                    : <Button size="sm" loading={busy === text} disabled={busy !== null || words.length >= limits.words}
                                              onClick={() => followWord(text)} aria-label={`Follow “${text}” as written`}>Follow</Button>}
                            </div>
                        )}
                        {searching && <Working className="mt-3">Asking Wikidata…</Working>}
                        {shown && !searching && shown.length === 0 && <p className="caption mt-3">Wikidata knows nothing of that name.</p>}
                        {shown?.length > 0 && (
                            <ul aria-label="Found in Wikidata" className="mt-1 list-none p-0">
                                {shown.map(item => (
                                    <li key={item.qid} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule py-3">
                                        <span className="min-w-0">
                                            <Link to={`/following/${item.qid}`} className="link font-semibold">{item.label}</Link>
                                            {item.description && <span className="caption block">{item.description}</span>}
                                        </span>
                                        {qids.has(item.qid)
                                            ? <span className="folio">Followed</span>
                                            : <Button size="sm" loading={busy === item.qid} disabled={busy !== null} onClick={() => followItem(item.qid)}
                                                      aria-label={`Follow ${item.label}`}>Follow</Button>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </Section>

            {suggested.length > 0 && (
                <Section kicker="Often on your cards" title="Follow them?">
                    <div className="grid-12">
                        <div className="col-span-12 md:col-span-7 md:col-start-3">
                            <p className="caption">The people and organisations several cards of your briefings of the last two weeks were about.</p>
                            <ul aria-label="Suggested" className="mt-3 list-none border-t border-rule p-0">
                                {suggested.map(name => (
                                    <li key={`${name.qid ?? ''} ${name.name}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule py-3">
                                        <span className="min-w-0">
                                            <Link to={pageOf(name)} className="link font-semibold">{name.name}</Link>
                                            <span className="caption block">on {name.cards} cards</span>
                                        </span>
                                        <Button size="sm" loading={busy === (name.qid ?? name.name)} disabled={busy !== null}
                                                onClick={() => followSuggested(name)} aria-label={`Follow ${name.name}`}>Follow</Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Section>
            )}

            <Section kicker="Followed" title="What you follow">
                <div className="grid-12">
                    <div className="col-span-12 md:col-span-7 md:col-start-3">
                        {error && <Notice type="error" onClose={() => setError(null)}>{error}</Notice>}
                        {followed === null && !error && <Working>Loading what you follow…</Working>}
                        {followed && entities.length + words.length === 0 && <p className="caption">Nothing yet: look one up above.</p>}
                        {entities.length > 0 && (
                            <ul aria-label="Followed" className="list-none border-t border-rule p-0">
                                {entities.map(entity => (
                                    <li key={entity.qid} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-rule py-4">
                                        <span className="min-w-0">
                                            <Link to={`/following/${entity.qid}`} className="font-display text-[1.35rem] leading-tight text-ink no-underline hover:text-accent-ink">
                                                {entity.short ?? entity.label}
                                            </Link>
                                            <MetaLine className="mt-1">
                                                <Meta>{KIND_LABELS[entity.kind] ?? entity.kind}</Meta>
                                                {entity.links > 0 && <Meta>{entity.links} links</Meta>}
                                            </MetaLine>
                                            {/* the label of Wikidata, when it is shown by its acronym */}
                                            {entity.short && entity.short !== entity.label && <span className="caption block">{entity.label}</span>}
                                            {entity.description && <span className="caption block">{entity.description}</span>}
                                            <Checkbox checked={entity.inBriefing} disabled={busy !== null} className="mt-2 text-[0.9375rem]"
                                                      onChange={event => inBriefing(entity.qid, event.target.checked)}>
                                                Its news in my briefing
                                            </Checkbox>
                                        </span>
                                        <Button size="sm" variant="subtle" loading={busy === entity.qid} disabled={busy !== null}
                                                onClick={() => unfollowItem(entity.qid)} aria-label={`Stop following ${entity.short ?? entity.label}`}>
                                            Stop following
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {words.length > 0 && (
                            <ul aria-label="Followed as written" className={`list-none border-t border-rule p-0 ${entities.length > 0 ? 'mt-8' : ''}`}>
                                {words.map(word => (
                                    <li key={word} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule py-4">
                                        <span className="min-w-0">
                                            <Link to={pageOf({name: word})} className="font-display text-[1.35rem] leading-tight text-ink no-underline hover:text-accent-ink">
                                                “{word}”
                                            </Link>
                                            <MetaLine className="mt-1"><Meta>as written</Meta><Meta>in your briefing</Meta></MetaLine>
                                        </span>
                                        <Button size="sm" variant="subtle" loading={busy === word} disabled={busy !== null}
                                                onClick={() => unfollowWord(word)} aria-label={`Stop following ${word}`}>
                                            Stop following
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {followed && (
                            <p className="caption mt-4">
                                {entities.length} of {limits.entities} clubs, people and organisations · {words.length} of {limits.words} names or words as written.
                            </p>
                        )}
                    </div>
                </div>
            </Section>
        </PageShell>
    );
};
