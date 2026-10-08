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
import {Input, Label} from "@/components/ui/field.jsx";
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
