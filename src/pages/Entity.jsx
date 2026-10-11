//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: Entity.jsx
//  Description: The page of a club, a person or an organisation: the news of the last days naming it,
//               and the ones naming what it is linked to (the players and the coach of a club, the
//               team of a player), each link opening its own page
//

import {useEffect, useState} from "react";
import {Link, useParams} from "react-router-dom";
import {Opening, PageShell} from "@/components/layout/Page.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Checkbox, Input, Label} from "@/components/ui/field.jsx";
import {Meta, MetaLine, Notice, Working} from "@/components/ui/text.jsx";
import {BriefingWindow} from "@/features/briefing/components/BriefingWindow.jsx";
import {Term} from "@/features/briefing/components/WatchedNews.jsx";
import {DEFAULT_HOURS, spanOf} from "@/features/briefing/windows.js";
import {EntityApi} from "@/features/entities/entityApi.js";
import {KIND_LABELS} from "@/features/entities/kinds.js";
import {useActiveProfile} from "@/features/profiles/activeProfile.js";
import {useAuth} from "@/features/auth/useAuth.js";
import {cn} from "@/lib/utils.js";
import {toast} from "@/lib/toast.js";

const stories = (count) => `${count} ${count === 1 ? 'story' : 'stories'}`;

// the names it is found by: the reader takes out the ones of Wikidata that find other things ("Paris")
// and adds their own ("PSG"); only for an item followed
const Names = ({entity, onChange, busy}) => {
    const [name, setName] = useState('');
    const add = () => {
        const text = name.trim();
        if (text.length < 2) return;
        onChange([...entity.addedNames, text], entity.removedNames);
        setName('');
    };
    const remove = (text) => entity.addedNames.includes(text)
        ? onChange(entity.addedNames.filter(other => other !== text), entity.removedNames)
        : onChange(entity.addedNames, [...entity.removedNames, text]);

    return (
        <div>
            <p className="kicker">The names it is found by</p>
            <ul aria-label="The names it is found by" className="mt-2 flex list-none flex-wrap gap-2 p-0">
                {entity.names.map(text => (
                    <li key={text} className="inline-flex items-center gap-1 border border-rule py-0.5 pr-1 pl-2 text-[0.9375rem]">
                        {text}
                        <button type="button" disabled={busy} onClick={() => remove(text)} aria-label={`Do not look for “${text}”`}
                                className="cursor-pointer px-1 text-ink-mute hover:text-accent-ink disabled:opacity-45">×</button>
                    </li>
                ))}
            </ul>
            {entity.removedNames.length > 0 && (
                <p className="caption mt-2">
                    Not looked for:{' '}
                    {entity.removedNames.map((text, i) => (
                        <span key={text}>{i > 0 && ', '}
                            <button type="button" disabled={busy} onClick={() => onChange(entity.addedNames, entity.removedNames.filter(other => other !== text))}
                                    className="cursor-pointer underline underline-offset-4 hover:text-ink" aria-label={`Look for “${text}” again`}>{text}</button>
                        </span>
                    ))}
                </p>
            )}
            <div className="mt-3 flex gap-2">
                <div className="min-w-0 flex-1">
                    <Label htmlFor="entity-name" className="sr-only">Another name</Label>
                    <Input id="entity-name" maxLength={60} placeholder="Another name it goes by" value={name}
                           onChange={event => setName(event.target.value)}
                           onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add(); } }}/>
                </div>
                <Button size="sm" onClick={add} disabled={busy || name.trim().length < 2}>Add</Button>
            </div>
        </div>
    );
};

// Its names as terms of the profile, the ones the reader ticks: every news naming one is then in the
// briefing, in the section of the terms (the user, 12.10.2026). Ticked at first: the names that found
// news in the window, the most found first, as many as the terms left. The UEFA has 18 names in
// Wikidata, its own in a dozen languages, and a profile 20 terms. The page stays its own, with its links
const InBriefing = ({entity, hours, onAdd, busy}) => {
    const inTerms = entity.inTerms ?? [];
    const counts = entity.nameCounts ?? {};
    const left = entity.termsLeft ?? 0;
    const missing = entity.names.filter(name => !inTerms.includes(name)).sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
    const heard = missing.filter(name => counts[name] > 0);
    const quiet = missing.filter(name => !(counts[name] > 0));
    const [chosen, setChosen] = useState(() => heard.slice(0, left));
    const toggle = (name, on) => setChosen(current => on ? [...current, name] : current.filter(other => other !== name));
    const box = (name) => (
        <li key={name}>
            <Checkbox checked={chosen.includes(name)} disabled={busy} onChange={event => toggle(name, event.target.checked)}>
                {name} <span className="folio tabular">{stories(counts[name] ?? 0)}</span>
            </Checkbox>
        </li>
    );
    const already = inTerms.length > 0 && (
        <p className="caption mt-2">Terms already: {inTerms.join(', ')}. <Link className="link" to="/profile#terms">Your terms</Link></p>
    );

    return (
        <div>
            <p className="kicker">In your briefing</p>
            {missing.length === 0 ? (
                <p className="caption mt-2">
                    Its names are terms of your profile: every news naming one is listed in your briefing.{' '}
                    <Link className="link" to="/profile#terms">Your terms</Link>
                </p>
            ) : left === 0 ? (<>
                <p className="caption mt-2">
                    Your profile follows 20 terms, the most: remove some to add its names.{' '}
                    <Link className="link" to="/profile#terms">Your terms</Link>
                </p>
                {already}
            </>) : (<>
                <p className="caption mt-2">
                    Tick the names to add to the terms of your profile: every news naming one is then listed in your
                    briefing, in the section of the terms. What it is linked to is not added. Next to each name, its
                    stories of the last {spanOf(hours)}; {left} {left === 1 ? 'term' : 'terms'} left.
                </p>
                {already}
                {heard.length > 0 && <ul aria-label="Its names that name news" className="mt-3 list-none p-0">{heard.map(box)}</ul>}
                {quiet.length > 0 && (
                    <details className="mt-2" open={heard.length === 0}>
                        <summary className="caption cursor-pointer">{quiet.length} {quiet.length === 1 ? 'name' : 'names'} with no news of the last {spanOf(hours)}</summary>
                        <ul aria-label="Its names with no news" className="mt-2 list-none p-0">{quiet.map(box)}</ul>
                    </details>
                )}
                {chosen.length > left && <p className="caption mt-2">Only the first {left} ticked fit.</p>}
                <Button size="sm" className="mt-3" onClick={() => onAdd(chosen)} loading={busy} disabled={busy || chosen.length === 0}>
                    {chosen.length === 0 ? 'Tick a name to add it' : chosen.length === 1 ? 'Add this name to my briefing' : `Add these ${chosen.length} names to my briefing`}
                </Button>
            </>)}
        </div>
    );
};

export const EntityPage = () => {
    const {qid} = useParams();
    const {user, logout, expired} = useAuth();
    const active = useActiveProfile();
    const [hours, setHours] = useState(DEFAULT_HOURS);
    const [page, setPage] = useState(null);
    const [error, setError] = useState(null);
    const [chosen, setChosen] = useState(null);     // the link whose news are shown
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!user) {
            logout();
            return undefined;
        }
        let current = true;
        setPage(null);
        setError(null);
        EntityApi.page(qid, hours)
            .then(data => {
                if (!current || expired(data)) return;
                if (data.error) setError(data.error);
                else {
                    setPage(data);
                    setChosen(data.links?.find(link => link.count > 0)?.qid ?? null);
                }
            })
            .catch(err => current && setError(err.message));
        return () => {
            current = false;
        };
    }, [qid, hours, user, logout, expired, active]);

    const follow = async (yes) => {
        setBusy(true);
        try {
            const data = yes ? await EntityApi.follow(qid) : await EntityApi.unfollow(qid);
            if (expired(data)) return;
            if (data.error) toast.error(data.error);
            else setPage(current => ({...current, entity: {...current.entity, followed: yes, addedNames: [], removedNames: []}}));
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    // the names changed: the news are asked again with them
    const setNames = async (added, removed) => {
        setBusy(true);
        try {
            const data = await EntityApi.setNames(qid, added, removed);
            if (expired(data)) return;
            if (data.error) {
                toast.error(data.error);
                return;
            }
            const again = await EntityApi.page(qid, hours);
            if (!again.error) setPage(again);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    // its names added to the terms: the page says which are terms now
    const toTerms = async (names) => {
        setBusy(true);
        try {
            const data = await EntityApi.toTerms(qid, names);
            if (expired(data)) return;
            if (data.error) {
                toast.error(data.error);
                return;
            }
            setPage(current => ({...current, entity: {...current.entity,
                inTerms: [...new Set([...(current.entity.inTerms ?? []), ...data.already, ...data.added])],
                termsLeft: Math.max(0, (current.entity.termsLeft ?? 0) - data.added.length)}}));
            if (data.added.length > 0) toast.success(`In your briefing from the next one: ${data.added.join(', ')}.`);
            if (data.left.length > 0) toast.error(`Not added, ${data.terms.length} terms at most: ${data.left.join(', ')}. Remove some on your profile.`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    const entity = page?.entity;
    const link = page?.links?.find(other => other.qid === chosen) ?? null;
    const named = page?.links?.filter(other => other.count > 0) ?? [];
    const silent = page?.links?.filter(other => other.count === 0) ?? [];

    return (
        <PageShell user={user} onSignOut={logout}>
            <Opening
                kicker={entity ? KIND_LABELS[entity.kind] ?? entity.kind : 'Following'}
                title={entity?.label ?? (error ? 'Not found' : '…')}
                standfirst={entity?.description}
                aside={(
                    <div className="space-y-4">
                        <BriefingWindow hours={hours} onChange={setHours} disabled={page === null && !error}
                                        tip="The news of these last days that name it, or what it is linked to, from every source read."/>
                        {entity && (entity.followed
                            ? <Button variant="subtle" onClick={() => follow(false)} loading={busy}>Stop following</Button>
                            : <Button variant="primary" onClick={() => follow(true)} loading={busy}>Follow</Button>)}
                        <p className="caption"><Link className="link" to="/following">All the ones you follow</Link></p>
                    </div>
                )}/>

            <div className="page mt-12">
                {error && <Notice type="error">{error}</Notice>}
                {page === null && !error && (
                    <Working>Looking for the news of the last {spanOf(hours)} naming it and its links… (up to half a minute)</Working>
                )}
                {page && (
                    <div className="grid-12 gap-y-12">
                        <section className="col-span-12 md:col-span-7" aria-labelledby="entity-news">
                            <h2 id="entity-news" className="section-head">{stories(page.count)} name it</h2>
                            <p className="caption mt-2">
                                Every news of your sources of the last {spanOf(page.hours)} that names it, whatever its relevance, the newest first.
                            </p>
                            <div className="mt-4"><Term group={{term: entity.label, count: page.count, news: page.news}} heading={false}/></div>

                            {named.length > 0 && link && (
                                <div className="mt-14">
                                    <h2 className="section-head">{link.label}</h2>
                                    <MetaLine className="mt-1">
                                        <Meta>{link.relation}</Meta>
                                        <Meta>{stories(link.count)}</Meta>
                                    </MetaLine>
                                    <p className="caption mt-2">
                                        <Link className="link" to={`/following/${link.qid}`}>Its own page</Link>
                                        {link.description && ` · ${link.description}`}
                                    </p>
                                    <div className="mt-4"><Term group={{term: link.label, count: link.count, news: link.news}} heading={false}/></div>
                                </div>
                            )}
                        </section>

                        <aside className="col-span-12 space-y-8 md:col-span-4 md:col-start-9">
                            {entity.followed
                                ? <Names entity={entity} onChange={setNames} busy={busy}/>
                                : (
                                    <div>
                                        <p className="kicker">The names it is found by</p>
                                        <p className="caption mt-2">{entity.names.join(' · ')}</p>
                                        <p className="caption mt-1">Follow it to change them.</p>
                                    </div>
                                )}
                            {entity.names.length > 0 && (
                                <InBriefing key={`${page.hours} ${entity.names.join('|')} ${(entity.inTerms ?? []).join('|')}`}
                                            entity={entity} hours={page.hours} onAdd={toTerms} busy={busy}/>
                            )}
                            {page.links.length > 0 && (
                                <div>
                                    <p className="kicker">Linked to it, by Wikidata</p>
                                    <ul aria-label="Linked to it" className="mt-2 list-none border-t border-rule p-0">
                                        {named.map(other => (
                                            <li key={other.qid} className="border-b border-rule">
                                                <button type="button" onClick={() => setChosen(other.qid)} aria-pressed={other.qid === chosen}
                                                        className={cn('flex w-full cursor-pointer items-baseline justify-between gap-3 py-2 text-left hover:text-accent-ink',
                                                            other.qid === chosen ? 'text-ink' : 'text-ink-mute')}>
                                                    <span className="min-w-0">
                                                        <span className={cn('block', other.qid === chosen && 'font-semibold')}>{other.label}</span>
                                                        <span className="caption block">{other.relation}</span>
                                                    </span>
                                                    <span className="folio tabular shrink-0">{other.count}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                    {silent.length > 0 && (
                                        <details className="mt-3">
                                            <summary className="caption cursor-pointer">{silent.length} named by no news of the last {spanOf(page.hours)}</summary>
                                            <p className="caption mt-2">
                                                {silent.map((other, i) => (
                                                    <span key={other.qid}>{i > 0 && ', '}<Link className="link" to={`/following/${other.qid}`}>{other.label}</Link></span>
                                                ))}
                                            </p>
                                        </details>
                                    )}
                                </div>
                            )}
                        </aside>
                    </div>
                )}
            </div>
        </PageShell>
    );
};
