//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: MailBar.jsx
//  Description: The bar of the cards ticked in the briefing: how many, then the address they are sent
//               to, the one of the account written in already
//

import {useState} from "react";
import {Button} from "@/components/ui/button.jsx";
import {FieldError, Input, Label} from "@/components/ui/field.jsx";

// one address, as the server checks it (server/services/utils/account-rules.js)
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

// count: the cards ticked; accountEmail: the address of the account; onSend(to): sends them, true when
// sent; onClear: unticks them all
export const MailBar = ({count, accountEmail, sending, onSend, onClear}) => {
    const [to, setTo] = useState(null);         // null: the address is not asked yet
    const [error, setError] = useState(null);

    const send = async (event) => {
        event.preventDefault();
        const address = to.trim();
        if (!EMAIL.test(address)) {
            setError('An email, like name@example.org');
            return;
        }
        setError(null);
        if (await onSend(address)) setTo(null);
    };

    return (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink bg-paper">
            {to === null ? (
                <div className="page flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                    <p className="folio !text-ink">{count} {count === 1 ? 'story' : 'stories'} ticked</p>
                    <div className="flex gap-2">
                        <Button variant="subtle" size="sm" onClick={onClear}>Untick all</Button>
                        <Button variant="primary" size="sm" onClick={() => setTo(accountEmail ?? '')}>Send email</Button>
                    </div>
                </div>
            ) : (
                <form className="page flex flex-wrap items-end justify-between gap-x-4 gap-y-2 py-3" onSubmit={send} noValidate>
                    <div className="min-w-0 flex-1 basis-64">
                        <Label htmlFor="mail-to">Send the {count === 1 ? 'story' : `${count} stories`} to</Label>
                        <Input id="mail-to" type="email" autoComplete="email" autoFocus value={to}
                               onChange={event => setTo(event.target.value)} invalid={Boolean(error)}
                               aria-describedby={error ? 'mail-to-error' : 'mail-to-help'}/>
                        {error
                            ? <FieldError id="mail-to-error">{error}</FieldError>
                            : <p id="mail-to-help" className="caption mt-1">One address. Sent to another than yours, the e-mail says it comes from you, and the answers come to you.</p>}
                    </div>
                    <div className="flex gap-2 pb-6">
                        <Button variant="subtle" size="sm" onClick={() => setTo(null)} disabled={sending}>Cancel</Button>
                        <Button type="submit" variant="primary" size="sm" loading={sending}>Send</Button>
                    </div>
                </form>
            )}
        </div>
    );
};
