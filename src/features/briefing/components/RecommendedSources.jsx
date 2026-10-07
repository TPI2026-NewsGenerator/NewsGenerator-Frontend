//
//  Author: Fabian Rostello
//  Date: 25.09.2026
//  File: RecommendedSources.jsx
//  Description: Sources the reader could add: found for the profiles of other readers, or shared by
//               them, and publishing on the interests of this one
//

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button.jsx";
import {Meta, MetaLine, Notice, Working} from "@/components/ui/text.jsx";
import {toast} from "@/lib/toast.js";

// api: FeedApi. reloadKey: asked again when it changes (a discovery done, the interests changed).
// onAdded: told when sources were added, they join the ones added by hand
export const RecommendedSources = ({api, expired, reloadKey, onAdded}) => {
    const [sources, setSources] = useState(null);
    const [adding, setAdding] = useState(null);         // the ids being added
    const [error, setError] = useState(null);

    useEffect(() => {
        let current = true;
        api.getRecommended()
            .then(answer => {
                if (!current || expired(answer)) return;
                if (answer.error) setError(answer.error);
                else setSources(answer.sources ?? []);
            })
            .catch(err => current && setError(err.message));
        return () => {
            current = false;
        };
    }, [api, expired, reloadKey]);

    const add = async (ids) => {
        setAdding(ids);
        try {
            const answer = await api.addRecommended(ids);
            if (expired(answer)) return;
            if (answer.error) {
                toast.error(answer.error);
                return;
            }
            const done = new Set((answer.feeds ?? []).map(feed => feed.url));
            if (done.size > 0) {
                toast.success(`${done.size} source${done.size > 1 ? 's' : ''} added: they join your sources, above.`);
                onAdded?.();
            }
            for (const failed of answer.errors ?? []) {
                toast.error(`${failed.site ?? 'A source'}: ${failed.error}`);
            }
            const failedIds = new Set((answer.errors ?? []).map(failed => failed.id));
            setSources(sources.filter(source => !ids.includes(source.id) || failedIds.has(source.id)));
        } catch (err) {
            toast.error(err.message);
        } finally {
            setAdding(null);
        }
    };

    if (error) return <Notice type="error">{error}</Notice>;
    if (sources === null) return <Working>Looking for sources other readers read on your interests…</Working>;
    if (sources.length === 0) return null;

    // one of the ways to add sources, under the others (see AddSources)
    return (
        <div className="border-t border-rule pt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-[60ch]">
                    <p className="kicker !text-ink">Read by other readers on your interests</p>
                    <p className="caption mt-2">
                        Sources of your other profiles or of other readers, found or added by hand: they published on your interests this week.
                        A source another reader added by hand is never shown here unless they chose to share it.
                    </p>
                </div>
                <Button variant="primary" size="sm" loading={adding?.length > 1} disabled={adding !== null}
                        onClick={() => add(sources.map(source => source.id))}>
                    Add all {sources.length}
                </Button>
            </div>
            <ul className="mt-4 border-t border-rule">
                {sources.map(source => (
                    <li key={source.id} className="grid-12 items-baseline gap-y-2 border-b border-rule py-5">
                        <div className="col-span-12 md:col-span-3">
                            <p className="font-semibold [overflow-wrap:anywhere]">{source.site}</p>
                            <MetaLine className="mt-1">
                                <Meta>{source.category}</Meta>
                                {source.language && <Meta>{source.language}</Meta>}
                            </MetaLine>
                        </div>
                        <div className="col-span-12 md:col-span-6">
                            <Meta tone="ink">{source.relevant} of {source.news} news on your interests</Meta>
                            {/* once each: a programme publishes its episodes under one title (RTS "Mise au Point") */}
                            {[...new Set(source.samples ?? [])].map(title => (
                                <p key={title} className="caption mt-1 italic [overflow-wrap:anywhere]">“{title}”</p>
                            ))}
                        </div>
                        <div className="col-span-12 md:col-span-3 md:justify-self-end">
                            <Button size="sm" disabled={adding !== null} loading={adding?.length === 1 && adding[0] === source.id}
                                    onClick={() => add([source.id])}>
                                Add
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
