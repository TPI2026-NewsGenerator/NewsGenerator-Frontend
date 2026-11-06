//
//  Author: Fabian Rostello
//  Date: 06.11.2026
//  File: AiFirstChoice.jsx
//  Description: The switch of the settings that starts every card of the briefing and every story of the e-mail on the AI version of
//               the sentences, or on the article's own (the user, 06.11.2026). On at first; kept on the account (see aiFirst.js)
//

import {Switch} from "@/components/ui/switch.jsx";
import {aiFirstPreference} from "@/features/briefing/aiFirst.js";
import {usePreference} from "@/features/preferences/usePreference.js";

export const AiFirstChoice = () => {
    const [aiFirst, choose] = usePreference(aiFirstPreference);

    return (
        <div className="max-w-[40rem] space-y-2">
            <Switch checked={aiFirst} onCheckedChange={choose}>Start on the AI version</Switch>
            <p className="caption">
                {aiFirst
                    ? 'A card shows its AI version under the article’s sentences, and the editor of the e-mail sends it, until you choose the other.'
                    : 'A card shows the article’s own sentences, and the editor of the e-mail sends them, until you choose the AI version.'}
                {' '}A card with no AI version, or the key passages, show the article’s sentences.
            </p>
        </div>
    );
};
