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
import {X} from "lucide-react";
import {Opening, PageShell, Toolbar} from "@/components/layout/Page.jsx";
import {SettingsPill} from "@/components/ui/settings-pill.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Input, Label} from "@/components/ui/field.jsx";
import {InBriefingCheckbox} from "@/features/entities/components/InBriefingCheckbox.jsx";
import {Meta, MetaLine, Notice, Working} from "@/components/ui/text.jsx";
import {BriefingWindow} from "@/features/briefing/components/BriefingWindow.jsx";
import {Term} from "@/features/briefing/components/WatchedNews.jsx";
import {DEFAULT_HOURS, spanOf} from "@/features/briefing/windows.js";
import {EntityApi} from "@/features/entities/entityApi.js";
import {KIND_LABELS} from "@/features/entities/kinds.js";
import {useActiveProfile} from "@/features/profiles/activeProfile.js";
import {useAuth} from "@/features/auth/useAuth.js";
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
            <ul aria-label="The names it is found by" className="mt-3 flex list-none flex-wrap gap-2 p-0">
                {entity.names.map(text => (
                    <li key={text} className="inline-flex h-8 items-center rounded-full bg-paper-deep pr-1 pl-3.5 text-[0.875rem]">
                        {text}
                        <button type="button" disabled={busy} onClick={() => remove(text)} aria-label={`Do not look for “${text}”`}
                                className="ml-1 inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-ink-mute transition-colors hover:bg-rule/60 hover:text-ink disabled:opacity-40">
                            <X aria-hidden className="size-3.5"/>
                        </button>
                    </li>
                ))}
            </ul>
            {entity.removedNames.length > 0 && (
                <p className="caption mt-2">
                    Not looked for:{' '}
                    {entity.removedNames.map((text, i) => (
                        <span key={text}>{i > 0 && ', '}
                            <button type="button" disabled={busy} onClick={() => onChange(entity.addedNames, entity.removedNames.filter(other => other !== text))}
                                    className="link cursor-pointer" aria-label={`Look for “${text}” again`}>{text}</button>
                        </span>
                    ))}
                </p>
            )}
            <div className="mt-3 flex max-w-sm gap-2">
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
            else setPage(current => ({...current, entity: {...current.entity, followed: yes, inBriefing: yes, addedNames: [], removedNames: []}}));
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

    // its news in the briefing or not
    const inBriefing = async (on) => {
        setBusy(true);
        try {
            const data = await EntityApi.setInBriefing(qid, on);
            if (expired(data)) return;
            if (data.error) toast.error(data.error);
            else setPage(current => ({...current, entity: {...current.entity, inBriefing: data.entity.inBriefing}}));
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
                standfirst={entity?.description}/>

            <div className="page mt-8">
                <p className="caption">
                    {entity && !entity.followed && 'Followed, its news are in your briefing, in a tab of their own. '}
                    <Link className="link" to="/following">All you follow</Link>
                </p>
            </div>

            {/* following it, and the days of its news: in a column on the right, they made the page two columns
                (the user, 01.11.2026) */}
            <Toolbar>
                {entity && (entity.followed
                    ? <Button size="sm" onClick={() => follow(false)} loading={busy}>Stop following</Button>
                    : <Button size="sm" variant="primary" onClick={() => follow(true)} loading={busy}>Follow</Button>)}
                {entity?.followed && (
                    <InBriefingCheckbox checked={entity.inBriefing} disabled={busy} className="text-[0.875rem]"
                                        onChange={event => inBriefing(event.target.checked)}/>
                )}
                <div className="md:ml-auto">
                    <SettingsPill label={spanOf(hours)} ariaLabel={`The news of the last ${spanOf(hours)}. Change`}>
                        <BriefingWindow hours={hours} onChange={setHours} disabled={page === null && !error}
                                        tip="The news of these last days that name it, or what it is linked to, from every source read."/>
                    </SettingsPill>
                </div>
            </Toolbar>

            {/* one column: the names it is found by, its news, then what it is linked to and the news of the one chosen */}
            <div className="page mt-10 md:mt-12">
                <div className="max-w-[52rem] space-y-16">
                    {error && <Notice type="error">{error}</Notice>}
                    {page === null && !error && (
                        <Working>Looking for the news of the last {spanOf(hours)} naming it and its links… (up to half a minute)</Working>
                    )}
                    {page && (entity.followed
                        ? <Names entity={entity} onChange={setNames} busy={busy}/>
                        : (
                            <div>
                                <p className="kicker">The names it is found by</p>
                                <p className="caption mt-2">{entity.names.join(' · ')}</p>
                                <p className="caption mt-1">Follow it to change them.</p>
                            </div>
                        ))}

                    {page && (
                        <section aria-labelledby="entity-news">
                            <h2 id="entity-news" className="section-head">{stories(page.count)} name it</h2>
                            <p className="caption mt-2">
                                Every news of your sources of the last {spanOf(page.hours)} that names it, whatever its relevance, the newest first.
                            </p>
                            <div className="mt-4"><Term group={{term: entity.label, count: page.count, news: page.news}} heading={false}/></div>
                        </section>
                    )}

                    {page?.links.length > 0 && (
                        <section aria-labelledby="entity-links">
                            <h2 id="entity-links" className="section-head">Linked to it</h2>
                            <p className="caption mt-2">By Wikidata. Choose one to read its news of the last {spanOf(page.hours)}.</p>
                            {named.length > 0 && (
                                <ul aria-label="Linked to it" className="mt-5 flex list-none flex-wrap gap-2 p-0">
                                    {named.map(other => (
                                        <li key={other.qid}>
                                            <button type="button" onClick={() => setChosen(other.qid)} aria-pressed={other.qid === chosen}
                                                    title={other.relation}
                                                    className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-full bg-paper-deep px-3.5 text-[0.875rem] text-ink transition-colors duration-200 hover:bg-rule/60 aria-pressed:bg-action/12 aria-pressed:text-action-text">
                                                {other.label}
                                                <span className="tabular-nums text-ink-mute">{other.count}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {silent.length > 0 && (
                                <details className="mt-4">
                                    <summary className="caption cursor-pointer">{silent.length} named by no news of the last {spanOf(page.hours)}</summary>
                                    <p className="caption mt-2">
                                        {silent.map((other, i) => (
                                            <span key={other.qid}>{i > 0 && ', '}<Link className="link" to={`/following/${other.qid}`}>{other.label}</Link></span>
                                        ))}
                                    </p>
                                </details>
                            )}

                            {link && (
                                <div className="mt-10">
                                    <h3 className="story-head">{link.label}</h3>
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
                    )}
                </div>
            </div>
        </PageShell>
    );
};
