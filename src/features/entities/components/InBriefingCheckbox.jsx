//
//  Author: Fabian Rostello
//  Date: 01.11.2026
//  File: InBriefingCheckbox.jsx
//  Description: The box of an item followed (a club, a person, an organisation): whether its news are in
//               the tab of what the profile follows, with a small "i" saying what it does
//

import {Checkbox} from "@/components/ui/field.jsx";
import {InfoTip} from "@/components/ui/info-tip.jsx";

// checked, disabled, onChange: those of the checkbox; className: of its label. The "i" is beside the label,
// not in it: the box keeps its name for the screen readers, and a tap on the "i" does not tick it
export const InBriefingCheckbox = ({checked, disabled, onChange, className}) => (
    <span className="flex items-center">
        <Checkbox checked={checked} disabled={disabled} onChange={onChange} className={className}>
            Its news in my briefing
        </Checkbox>
        <InfoTip label="Its news in my briefing">
            Ticked, its news are in the tab “Following” of your briefing, and its names are marked in the cards.
            Unticked, you still follow it and keep its page, but it is left out of the tab and the cards.
        </InfoTip>
    </span>
);
