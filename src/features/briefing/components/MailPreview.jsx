//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: MailPreview.jsx
//  Description: The e-mail as it will be sent, drawn by the server from what the reader chose (the same page the e-mail is made of), a
//               moment after each change. Shown in a frame of its own: its links open in another tab, nothing in it runs. The story the
//               reader is changing is shown in it: the e-mail scrolls to it and a line is drawn around it (the user, 05.11.2026)
//

import {useEffect, useMemo, useRef, useState} from "react";
import {Notice, Working} from "@/components/ui/text.jsx";
import {cn} from "@/lib/utils.js";

// a moment after the last change, so typing is not a call for each letter
const WAIT_MS = 700;

// the line around the story chosen, the blue of the links of the page
const MARK = '2px solid #2997FF';

// payload: what the e-mail is made of (see useMailDraft); onPreview(payload) answers {html}, the server drawing it (the affair of a
// story, when asked for, takes about 20 seconds the first time); focus: the storyId of the story the reader is changing, 'all' or none
// for the e-mail as a whole. The frame is of the page's own origin and nothing in it runs (no allow-scripts), so the page can scroll it
export const MailPreview = ({payload, onPreview, focus = null, className}) => {
    const [state, setState] = useState({status: 'loading', html: null, message: null});
    // what is asked is the last thing the reader did: an older answer arriving late is not shown
    const latest = useRef(0);
    const ask = useRef(onPreview);
    useEffect(() => {
        ask.current = onPreview;
    });
    const key = useMemo(() => JSON.stringify(payload), [payload]);
    const frame = useRef(null);

    // the story chosen at the top of the frame with a line around it, the e-mail from its top when none is
    const asked = useRef(focus);
    useEffect(() => {
        asked.current = focus;
    });
    const show = () => {
        const doc = frame.current?.contentDocument;
        const view = doc?.defaultView;
        if (!doc || !view) return;
        doc.querySelectorAll('[id^="story-"] > td').forEach(cell => { cell.style.outline = ''; });
        const card = focus === null || focus === 'all' ? null : doc.getElementById(`story-${focus}`);
        if (card?.firstElementChild) card.firstElementChild.style.outline = MARK;
        const place = (behavior) => view.scrollTo({top: card ? Math.max(0, card.getBoundingClientRect().top + (view.scrollY ?? 0) - 12) : 0, behavior});
        place('smooth');
        // the pictures still coming push the cards down: the story is put back at the top as each arrives, while it is still the one chosen
        [...(doc.images ?? [])].filter(image => !image.complete).forEach(image => image.addEventListener('load', () => {
            if (asked.current === focus) place('auto');
        }, {once: true}));
    };
    useEffect(show, [focus]);

    useEffect(() => {
        const mine = ++latest.current;
        const timer = setTimeout(async () => {
            setState(current => ({...current, status: 'loading'}));
            try {
                const answer = await ask.current(JSON.parse(key));
                if (mine === latest.current) setState({status: 'ready', html: answer.html, message: null});
            } catch (err) {
                if (mine === latest.current) setState(current => ({...current, status: 'error', message: err.message}));
            }
        }, WAIT_MS);
        return () => clearTimeout(timer);
    }, [key]);

    return (
        <div className={cn('relative flex min-h-0 flex-1 flex-col', className)}>
            {state.html
                ? (
                    <iframe ref={frame} title="The e-mail as it will be sent" srcDoc={state.html} onLoad={show}
                            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                            className="min-h-0 w-full flex-1 rounded-xl border border-rule bg-white"/>
                )
                : state.status !== 'error' && <Working>Drawing the e-mail… the affair of a story takes about 20 seconds the first time.</Working>}
            {state.html && state.status === 'loading' && (
                <span role="status" className="caption absolute top-2 right-3 rounded-full bg-paper px-2.5 py-0.5 shadow-sm ring-1 ring-rule">Updating…</span>
            )}
            {state.status === 'error' && (
                <Notice type="error" title="The preview could not be drawn" className="mt-3">{state.message}</Notice>
            )}
        </div>
    );
};
