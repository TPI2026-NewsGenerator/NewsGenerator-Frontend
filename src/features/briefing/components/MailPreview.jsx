//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: MailPreview.jsx
//  Description: The e-mail as it will be sent, drawn by the server from what the reader chose (the same page the e-mail is made of), a
//               moment after each change. Shown in a frame of its own: its links open in another tab, nothing in it runs
//

import {useEffect, useMemo, useRef, useState} from "react";
import {Notice, Working} from "@/components/ui/text.jsx";
import {cn} from "@/lib/utils.js";

// a moment after the last change, so typing is not a call for each letter
const WAIT_MS = 700;

// payload: what the e-mail is made of (see useMailDraft); onPreview(payload) answers {html}, the server drawing it (the affair of a
// story, when asked for, takes about 20 seconds the first time)
export const MailPreview = ({payload, onPreview, className}) => {
    const [state, setState] = useState({status: 'loading', html: null, message: null});
    // what is asked is the last thing the reader did: an older answer arriving late is not shown
    const latest = useRef(0);
    const ask = useRef(onPreview);
    useEffect(() => {
        ask.current = onPreview;
    });
    const key = useMemo(() => JSON.stringify(payload), [payload]);

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
                    <iframe title="The e-mail as it will be sent" srcDoc={state.html} sandbox="allow-popups allow-popups-to-escape-sandbox"
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
