//
//  Author: Fabian Rostello
//  Date: 11.11.2026
//  File: AiVersionWriter.jsx
//  Description: The button of a card that has no AI version: the AI writes it now, from the article read again. Three briefings of the morning of
//               11.11.2026 had none for any card, the AI having failed while they were written, and nothing asked again. Says why when none comes
//

import {useState} from "react";
import {Button} from "@/components/ui/button.jsx";

// why the server wrote none (see BriefingService.writeAiVersion)
const WHY_NONE = {
    'no-answer': 'The AI did not answer: try again in a few minutes.',
    unbacked: 'The AI wrote a version the article does not back (a figure it does not give), so none is kept.',
    unreadable: 'The article could not be read again, so there is nothing to write from.',
};

// onWrite(): the answer of the server, {ai} when one was written (the page then has it in the card) or {ai: null, reason}; lead: what is said
// before the button ("No AI version for this card.")
export const AiVersionWriter = ({onWrite, lead, disabled = false, className}) => {
    const [state, setState] = useState({busy: false, message: null});
    const write = async () => {
        setState({busy: true, message: null});
        try {
            const answer = await onWrite();
            setState({busy: false, message: answer?.ai ? null : WHY_NONE[answer?.reason] ?? WHY_NONE['no-answer']});
        } catch (err) {
            setState({busy: false, message: `The AI version was not written: ${err.message}`});
        }
    };
    return (
        <div className={className ?? 'flex flex-wrap items-center justify-end gap-x-3 gap-y-1'}>
            {lead && <span className="caption">{lead}</span>}
            <Button size="sm" variant="link" onClick={write} loading={state.busy} disabled={disabled || state.busy}
                    title="The AI writes the points and the summary from the article, read again: it can take about ten seconds">
                Write it now
            </Button>
            {state.message && <p role="status" className="caption basis-full">{state.message}</p>}
        </div>
    );
};
