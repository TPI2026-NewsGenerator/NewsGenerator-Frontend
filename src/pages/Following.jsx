//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: Following.jsx
//  Description: The clubs, people and organisations the profile follows, found by their name in
//               Wikidata: each opens the page of its news and of the news of what it is linked to
//

import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {Opening, PageShell, Section} from "@/components/layout/Page.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Input, Label} from "@/components/ui/field.jsx";
import {Meta, MetaLine, Notice, Working} from "@/components/ui/text.jsx";
import {EntityApi} from "@/features/entities/entityApi.js";
import {KIND_LABELS} from "@/features/entities/kinds.js";
import {useActiveProfile} from "@/features/profiles/activeProfile.js";
import {useAuth} from "@/features/auth/useAuth.js";
import {toast} from "@/lib/toast.js";

const SEARCH_AFTER_MS = 400;        // the reader stops typing, Wikidata is asked

export const FollowingPage = () => {
    const {user, logout, expired} = useAuth();
    const active = useActiveProfile();
    const [entities, setEntities] = useState(null);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState('');
    const [found, setFound] = useState(null);       // null: nothing asked yet
    const [searching, setSearching] = useState(false);
    const [busy, setBusy] = useState(null);         // the qid being followed or left

    useEffect(() => {
        if (!user) {
            logout();
            return;
        }
        let current = true;
        EntityApi.list()
            .then(data => {
                if (!current || expired(data)) return;
                if (data.error) setError(data.error);
                else setEntities(data.entities ?? []);
            })
            .catch(err => current && setError(err.message));
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

    const change = async (qid, follow) => {
        setBusy(qid);
        try {
            const data = follow ? await EntityApi.follow(qid) : await EntityApi.unfollow(qid);
            if (expired(data)) return;
            if (data.error) toast.error(data.error);
            else setEntities(data.entities ?? []);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(null);
        }
    };

    const followed = new Set((entities ?? []).map(entity => entity.qid));
    const shown = query.trim().length >= 2 ? found : null;

    return (
        <PageShell user={user} onSignOut={logout}>
            <Opening kicker="Following" title="Clubs, people and organisations"
                     standfirst="Follow a club, a person or an organisation as Wikidata knows them: its page gathers every news of your sources that names it, and the news of what it is linked to, its players, its coach, its league. No relevance, no AI: all of them."/>

            <Section kicker="Find" title="Who do you want to follow?">
                <div className="grid-12">
                    <div className="col-span-12 md:col-span-7 md:col-start-3">
                        <Label htmlFor="entity-search">A club, a person, an organisation</Label>
                        <Input id="entity-search" type="search" autoComplete="off" placeholder="Paris Saint-Germain, Aleksander Čeferin, UEFA…"
                               value={query} onChange={event => setQuery(event.target.value)}/>
                        {searching && <Working className="mt-3">Asking Wikidata…</Working>}
                        {shown && !searching && shown.length === 0 && <p className="caption mt-3">Wikidata knows nothing of that name.</p>}
                        {shown?.length > 0 && (
                            <ul aria-label="Found in Wikidata" className="mt-3 list-none border-t border-rule p-0">
                                {shown.map(item => (
                                    <li key={item.qid} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule py-3">
                                        <span className="min-w-0">
                                            <Link to={`/following/${item.qid}`} className="link font-semibold">{item.label}</Link>
                                            {item.description && <span className="caption block">{item.description}</span>}
                                        </span>
                                        {followed.has(item.qid)
                                            ? <span className="folio">Followed</span>
                                            : <Button size="sm" loading={busy === item.qid} disabled={busy !== null} onClick={() => change(item.qid, true)}
                                                      aria-label={`Follow ${item.label}`}>Follow</Button>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </Section>

            <Section kicker="Followed" title="The ones you follow">
                <div className="grid-12">
                    <div className="col-span-12 md:col-span-7 md:col-start-3">
                        {error && <Notice type="error" onClose={() => setError(null)}>{error}</Notice>}
                        {entities === null && !error && <Working>Loading the ones you follow…</Working>}
                        {entities?.length === 0 && <p className="caption">None yet: look one up above.</p>}
                        {entities?.length > 0 && (
                            <ul aria-label="Followed" className="list-none border-t border-rule p-0">
                                {entities.map(entity => (
                                    <li key={entity.qid} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule py-4">
                                        <span className="min-w-0">
                                            <Link to={`/following/${entity.qid}`} className="font-display text-[1.35rem] leading-tight text-ink no-underline hover:text-accent-ink">
                                                {entity.label}
                                            </Link>
                                            <MetaLine className="mt-1">
                                                <Meta>{KIND_LABELS[entity.kind] ?? entity.kind}</Meta>
                                                {entity.links > 0 && <Meta>{entity.links} links</Meta>}
                                            </MetaLine>
                                            {entity.description && <span className="caption block">{entity.description}</span>}
                                        </span>
                                        <Button size="sm" variant="subtle" loading={busy === entity.qid} disabled={busy !== null}
                                                onClick={() => change(entity.qid, false)} aria-label={`Stop following ${entity.label}`}>
                                            Stop following
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </Section>
        </PageShell>
    );
};
