//
//  Author: Fabian Rostello
//  Date: 04.11.2026
//  File: AffairSection.jsx
//  Description: Under a card that is one affair: its name, then on demand its events on a line and how widely the
//               media talked of it
//

import {useEffect, useRef, useState} from "react";
import {Button} from "@/components/ui/button.jsx";
import {InfoTip} from "@/components/ui/info-tip.jsx";
import {Notice, Working} from "@/components/ui/text.jsx";
import {BriefingApi} from "@/features/briefing/api/briefingApi.js";
import {AffairTimeline} from "@/features/affairs/components/AffairTimeline.jsx";
import {AffairCoverage} from "@/features/affairs/components/AffairCoverage.jsx";
import {FollowAffair} from "@/features/affairs/components/FollowAffair.jsx";

const NOTE = 'The AI read the news of the last 30 days, in any language, that belong to the same affair as this card, and put their facts in order. It judges from the titles: one may be a little off. The dates are those of the first news.';

// chip: {title, stories, media, followed} the name of the affair, the size of its thread and the id of the affair when the reader
// follows it already (see AffairService.chips)
export const AffairSection = ({briefingId, storyId, chip}) => {
    const [open, setOpen] = useState(false);
    const [state, setState] = useState({status: 'idle'});
    // the answer for this card only: a briefing opened again may reuse the component for another one
    const asked = useRef(null);

    useEffect(() => {
        asked.current = null;
        setOpen(false);
        setState({status: 'idle'});
    }, [briefingId, storyId]);

    const load = async () => {
        const key = `${briefingId}:${storyId}`;
        asked.current = key;
        setState({status: 'loading'});
        try {
            const data = await BriefingApi.affair(briefingId, storyId);
            if (asked.current !== key) return;
            if (data.error) throw new Error(data.error);
            setState(data.affair ? {status: 'ready', affair: data} : {status: 'none'});
        } catch (err) {
            if (asked.current === key) setState({status: 'error', message: err.message});
        }
    };

    const toggle = () => {
        const next = !open;
        setOpen(next);
        if (next && state.status === 'idle') load();
    };

    return (
        <section className="mt-10" aria-label="The affair">
            <p className="kicker">
                The affair
                <InfoTip label="The affair">{NOTE}</InfoTip>
            </p>
            <h3 className="mt-2 max-w-[60ch] text-[1.0625rem] leading-snug font-semibold">{chip.title}</h3>
            <p className="caption mt-1">Followed over {chip.stories} stories told by {chip.media} media.</p>
            <FollowAffair briefingId={briefingId} storyId={storyId} followed={chip.followed}/>
            <Button size="sm" variant="quiet" className="mt-3" aria-expanded={open} onClick={toggle}>
                {open ? 'Hide the affair' : 'Show events and coverage'}
            </Button>

            {open && (
                <div className="mt-4">
                    {state.status === 'loading' && (
                        <Working>Reading a month of news and putting its facts in order… about 20 seconds the first time.</Working>
                    )}
                    {state.status === 'error' && (
                        <Notice type="error" title="The affair could not be built">
                            {state.message}{' '}
                            <button type="button" onClick={load} className="cursor-pointer text-action-text hover:underline underline-offset-4">Try again</button>
                        </Notice>
                    )}
                    {state.status === 'none' && <Notice>The AI found no single affair behind this card after reading the month’s news.</Notice>}
                    {state.status === 'ready' && (
                        <>
                            <AffairTimeline events={state.affair.events} coverage={state.affair.coverage}/>
                            <AffairCoverage coverage={state.affair.coverage}/>
                        </>
                    )}
                </div>
            )}
        </section>
    );
};
