//
//  Author: Fabian Rostello
//  Date: 04.11.2026
//  File: PushToggle.jsx
//  Description: Lets this device be told when an affair followed moves: a button that asks the browser's leave, and what to do
//               when it cannot (an iPhone must open the site from its home screen)
//

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button.jsx";
import {disablePush, enablePush, isIphone, isStandalone, pushState} from "@/features/affairs/push.js";
import {toast} from "@/lib/toast.js";

export const PushToggle = () => {
    // undefined: not known yet
    const [state, setState] = useState(undefined);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let current = true;
        pushState().then(value => { if (current) setState(value); });
        return () => { current = false; };
    }, []);

    const turn = async (on) => {
        setBusy(true);
        try {
            if (on) setState(await enablePush());
            else {
                await disablePush();
                setState(await pushState());
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    if (state === undefined) return null;

    return (
        <div className="max-w-[60ch]">
            <p className="kicker">Notifications</p>
            {state === 'on' && (
                <>
                    <p className="mt-2 text-[0.9375rem]">This device is told as soon as an affair you follow moves.</p>
                    <Button className="mt-3" size="sm" variant="quiet" loading={busy} onClick={() => turn(false)}>Turn off on this device</Button>
                </>
            )}
            {state === 'ready' && (
                <>
                    <p className="mt-2 text-[0.9375rem]">Be told on this device as soon as an affair you follow has a new fact that several media tell.</p>
                    <Button className="mt-3" size="sm" variant="primary" loading={busy} onClick={() => turn(true)}>Notify me on this device</Button>
                </>
            )}
            {state === 'denied' && (
                <p className="mt-2 text-[0.9375rem]">Notifications are blocked for this site in the settings of your browser. Allow them there, then come back.</p>
            )}
            {state === 'unsupported' && (
                <p className="mt-2 text-[0.9375rem]">
                    {isIphone() && !isStandalone()
                        ? 'On an iPhone, add this site to your home screen first (Share, then Add to Home Screen) and open it from there: only then can it be told. The alerts are in this page meanwhile.'
                        : 'This browser cannot receive notifications. The alerts are in this page.'}
                </p>
            )}
        </div>
    );
};
