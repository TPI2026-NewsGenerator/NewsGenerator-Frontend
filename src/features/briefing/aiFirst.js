//
//  Author: Fabian Rostello
//  Date: 06.11.2026
//  File: aiFirst.js
//  Description: Whether the cards of the briefing and the editor of the e-mail start on the AI version of the sentences (the user,
//               06.11.2026: a reader of the briefing ticked it on nearly every story, one after the other). On at first; the reader turns
//               it off in the settings, and each card or story can still go back to the sentences of the article. Kept in the browser
//               and on the account (see features/preferences)
//

import {preference} from "@/features/preferences/preferences.js";

export const AI_FIRST_DEFAULT = true;

export const aiFirstPreference = preference({
    name: 'aiFirst',
    key: 'newsgenerator.ai-first',
    fallback: AI_FIRST_DEFAULT,
    parse: (text) => text === 'true' ? true : text === 'false' ? false : undefined,
});
