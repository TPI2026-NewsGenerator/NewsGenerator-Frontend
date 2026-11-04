//
//  Author: Fabian Rostello
//  Date: 04.11.2026
//  File: AffairSection.jsx
//  Description: The affair of a card in its two places: in the column beside it its name and the box to follow it (AffairRail), in the
//               tab "This affair" under it everything it is: its events on a line and how widely the media told it (AffairPanel).
//               The affair is built on the first opening (about 20 seconds), then kept by the server
//

import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {InfoTip} from "@/components/ui/info-tip.jsx";
import {Notice, Working} from "@/components/ui/text.jsx";
import {BriefingApi} from "@/features/briefing/api/briefingApi.js";
import {AffairCoverage} from "@/features/affairs/components/AffairCoverage.jsx";
import {AffairTimeline} from "@/features/affairs/components/AffairTimeline.jsx";
import {FollowAffair} from "@/features/affairs/components/FollowAffair.jsx";

const NOTE = 'The AI read the news of the last 30 days, in any language, that belong to the same affair as this card, and put their facts in order. It judges from the titles: one may be a little off. The dates are those of the first news.';

// chip: {title, stories, media, followed} the name of the affair, the size of its thread and the id of the affair when the reader
// follows it already (see AffairService.chips). followed: the id of the affair the reader follows, else null (the card holds it, both
// places show it); onFollowed(id or null): it was followed or stopped
export const AffairRail = ({briefingId, storyId, chip, followed, onFollowed}) => (
    <div>
        <p className="kicker">
            This affair
            <InfoTip label="This affair">{NOTE}</InfoTip>
        </p>
        <p className="caption mt-1 max-w-[32ch] !text-ink">{chip.title}</p>
        <FollowAffair briefingId={briefingId} storyId={storyId} followed={followed} onChange={onFollowed}/>
    </div>
);

const LOADING = {status: 'loading'};

// the tab is drawn when it is open, so the affair is asked for when the reader opens it
export const AffairPanel = ({briefingId, storyId, chip, followed}) => {
    const [state, setState] = useState(LOADING);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let current = true;
        BriefingApi.affair(briefingId, storyId)
            .then(data => {
                if (!current) return;
                if (data.error) throw new Error(data.error);
                setState(data.affair ? {status: 'ready', affair: data} : {status: 'none'});
            })
            .catch(err => current && setState({status: 'error', message: err.message}));
        return () => { current = false; };
    }, [briefingId, storyId, attempt]);

    const retry = () => {
        setState(LOADING);
        setAttempt(count => count + 1);
    };

    return (
        <div>
            <p className="kicker">
                This affair
                <InfoTip label="This affair">{NOTE}</InfoTip>
            </p>
            <h3 className="panel-lead mt-2 max-w-[60ch]">{chip.title}</h3>
            <p className="caption mt-1">{chip.stories} stories told by {chip.media} media, over the last 30 days.</p>

            <div className="mt-6">
                {state.status === 'loading' && (
                    <Working>Reading a month of news and putting its facts in order… about 20 seconds the first time.</Working>
                )}
                {state.status === 'error' && (
                    <Notice type="error" title="The affair could not be built">
                        {state.message}{' '}
                        <button type="button" onClick={retry} className="cursor-pointer text-action-text hover:underline underline-offset-4">Try again</button>
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

            {/* followed: its page also tells what it gave since the reader follows it */}
            {followed && <p className="caption mt-6"><Link className="link" to={`/affairs/${followed}`}>What it gave since you follow it</Link></p>}
        </div>
    );
};
