//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: useAiSummaryRequest.js
//  Description: The request of a reader for the summary an AI writes of a sheet ("Summarise with the AI": 5 to 20 seconds, 5 an hour at most). It lives in the sheet, not in the tab:
//               the content of a tab is not in the page when another one is open, and a reader who goes to another tab while the AI writes finds the request still running, never
//               a button that asks twice
//

import {useState} from "react";
import {FifaApi} from "@/features/fifa/fifaApi.js";

const TRY_AGAIN = 'The summary could not be written. Try again in a moment.';

// what to tell a reader whose request was refused: the words of the server (it says why: nothing to summarise, switched off, too many an hour, the AI did not answer)
const refusalOf = (answer) => answer?.status === 401 ? 'Sign in to ask for a summary.' : answer?.error ?? TRY_AGAIN;

// qid: the association; onWritten(aiSummary): the sheet keeps the summary the server wrote. Answers {busy, error, write}
export const useAiSummaryRequest = (qid, onWritten) => {
    const [state, setState] = useState({busy: false, error: null});
    const write = async () => {
        setState({busy: true, error: null});
        let answer;
        try {
            answer = await FifaApi.summarise(qid);
        } catch {
            answer = {error: TRY_AGAIN};
        }
        if (answer?.ai_summary) {
            onWritten(answer.ai_summary);
            setState({busy: false, error: null});
        } else {
            setState({busy: false, error: refusalOf(answer)});
        }
    };
    return {...state, write};
};
