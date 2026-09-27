//
//  Author: Fabian Rostello
//  Date: 25.09.2026
//  File: RecommendedSources.jsx
//  Description: Sources the reader could add: found for the profiles of other readers, or shared by
//               them, and publishing on the interests of this one
//

import {useEffect, useState} from "react";
import {Section} from "@/components/layout/Page.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Meta, MetaLine, Notice, Working} from "@/components/ui/text.jsx";
import {toast} from "@/lib/toast.js";

// api: FeedApi. reloadKey: asked again when it changes (a discovery done, the interests changed)
export const RecommendedSources = ({token, api, expired, reloadKey}) => {
    const [sources, setSources] = useState(null);
    const [adding, setAdding] = useState(null);         // the ids being added
    const [error, setError] = useState(null);

    useEffect(() => {
        let current = true;
        api.getRecommended(token)
            .then(answer => {
                if (!current || expired(answer)) return;
                if (answer.error) setError(answer.error);
                else setSources(answer.sources ?? []);
            })
            .catch(err => current && setError(err.message));
        return () => {
            current = false;
        };
    }, [token, api, expired, reloadKey]);

    const add = async (ids) => {
        setAdding(ids);
        try {
            const answer = await api.addRecommended(ids, token);
            if (expired(answer)) return;
            if (answer.error) {
                toast.error(answer.error);
                return;
            }
            const done = new Set((answer.feeds ?? []).map(feed => feed.url));
            if (done.size > 0) {
                toast.success(`${done.size} source${done.size > 1 ? 's' : ''} added: you find them with the ones you added by hand, on the search page.`);
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

    if (error) return <div className="page mt-20"><Notice type="error">{error}</Notice></div>;
    if (sources === null) return <div className="page mt-20"><Working>Looking for sources you could add…</Working></div>;
    if (sources.length === 0) return null;

    return (
        <Section
            kicker="From other readers"
            title="Sources you could add"
            intro={<>
                Found for the profiles of other readers, or shared by them, they published on your interests this week.
                A source another reader added by hand is never shown here unless they chose to share it.
            </>}
            aside={
                <Button variant="primary" size="sm" loading={adding?.length > 1} disabled={adding !== null}
                        onClick={() => add(sources.map(source => source.id))}>
                    Add all {sources.length}
                </Button>
            }
        >
            <ul className="border-t border-rule">
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
                            {source.samples?.map(title => (
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
        </Section>
    );
};
