//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: AffairDialog.jsx
//  Description: The affair of a card in a pop-up, for an affair the reader does not follow: its events on a line and how widely
//               the media told it. It is built on the first opening (about 20 seconds), then kept by the server
//

import {useEffect, useRef, useState} from "react";
import {Dialog} from "@/components/ui/overlay.jsx";
import {Notice, Working} from "@/components/ui/text.jsx";
import {BriefingApi} from "@/features/briefing/api/briefingApi.js";
import {AffairTimeline} from "@/features/affairs/components/AffairTimeline.jsx";
import {AffairCoverage} from "@/features/affairs/components/AffairCoverage.jsx";

export const AffairDialog = ({open, onOpenChange, briefingId, storyId, title}) => {
    const [state, setState] = useState({status: 'idle'});
    // the answer for this card only
    const asked = useRef(null);

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

    // built when it is opened the first time, asked again only after a failure
    useEffect(() => {
        if (open && (state.status === 'idle')) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange} wide kicker="The affair" title={title}
                description="The events of the last 30 days, in any language, and how widely the media told them.">
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
        </Dialog>
    );
};
