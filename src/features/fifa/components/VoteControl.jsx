//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: VoteControl.jsx
//  Description: "Your vote" on the position of an association on a candidate: For, Against, No position, or take the vote back. The last
//               vote of any reader decides for everyone, so the control says what the reader's own last vote is and says nothing
//               else for them; a refusal (signed out, too many votes, a source the server refuses) is said under it. It is kept under "Or change the
//               position": the main action of a card is to confirm the position shown. The field "Add a source (link)" goes with For or Against
//

import {useState} from "react";
import {SourceField} from "@/features/fifa/components/SourceField.jsx";
import {VOTE_VALUES} from "@/features/fifa/positions.js";
import {sourceOf} from "@/features/fifa/sourceChecks.js";
import {cn} from "@/lib/utils.js";

const CHOICE = 'inline-flex h-8 cursor-pointer items-center rounded-full border px-3.5 text-[0.8125rem] transition-colors duration-200 disabled:cursor-default disabled:opacity-50';

// mine: the last DECISION of this reader on this candidate ('for' | 'against' | 'unknown'), null when they have none or took it back (a confirmation
// is no decision); removable: this reader has a decision or a confirmation to take back; onVote(value, extra): resolves {ok} or {error}; extra: {source} when
// the reader joined a link to a For or Against
export const VoteControl = ({subject, member, mine, removable, onVote}) => {
    const [state, setState] = useState({busy: false, error: null});
    const [link, setLink] = useState('');

    const send = async (value) => {
        setState({busy: true, error: null});
        const extra = sourceOf(link, value);
        const answer = await onVote(value, extra);
        setState({busy: false, error: answer?.error ?? null});
        // the link stays in the field when the server refused it, so the reader corrects it
        if (answer?.ok && extra.source) setLink('');
    };

    return (
        <div role="group" aria-label={`Your vote: the position of ${member.name} on ${subject.name}`} className="mt-4">
            <p className="kicker">Your vote</p>
            <SourceField value={link} onChange={setLink} disabled={state.busy} hint="Optional: the link of a page that says it. It goes with For or Against; the AI reads the page in the background and it never changes a colour."/>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                {VOTE_VALUES.map(choice => (
                    <button key={choice.value} type="button" disabled={state.busy} aria-pressed={mine === choice.value} onClick={() => send(choice.value)}
                            className={cn(CHOICE, mine === choice.value ? 'border-action bg-action text-white' : 'border-rule text-ink hover:border-ink-mute')}>
                        {choice.label}
                    </button>
                ))}
                <button type="button" disabled={state.busy || !removable} onClick={() => send('withdraw')}
                        className="link ml-1 cursor-pointer text-[0.8125rem] disabled:cursor-default disabled:opacity-40 disabled:no-underline">
                    Remove my vote
                </button>
            </div>
            {state.error && <p role="alert" className="caption mt-2 !text-accent-ink">{state.error}</p>}
        </div>
    );
};
