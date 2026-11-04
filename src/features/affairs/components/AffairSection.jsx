//
//  Author: Fabian Rostello
//  Date: 04.11.2026
//  File: AffairSection.jsx
//  Description: In the column beside a card that is one affair: its name, the box to follow it, and the button to see its events
//               and coverage: in a pop-up while the reader does not follow it, on its page among the affairs once they do
//

import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {Button} from "@/components/ui/button.jsx";
import {InfoTip} from "@/components/ui/info-tip.jsx";
import {AffairDialog} from "@/features/affairs/components/AffairDialog.jsx";
import {FollowAffair} from "@/features/affairs/components/FollowAffair.jsx";

const NOTE = 'The AI read the news of the last 30 days, in any language, that belong to the same affair as this card, and put their facts in order. It judges from the titles: one may be a little off. The dates are those of the first news.';

// chip: {title, stories, media, followed} the name of the affair, the size of its thread and the id of the affair when the reader
// follows it already (see AffairService.chips)
export const AffairSection = ({briefingId, storyId, chip}) => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    // the card is mounted for one briefing and one story (the page keys it by them): what the server said at first is where it starts
    const [followed, setFollowed] = useState(chip.followed ?? null);

    return (
        <div>
            <p className="kicker">
                The affair
                <InfoTip label="The affair">{NOTE}</InfoTip>
            </p>
            <p className="mt-1 max-w-[32ch] text-[0.9375rem] leading-snug font-semibold">{chip.title}</p>
            <p className="caption mt-1 max-w-[32ch]">Followed over {chip.stories} stories told by {chip.media} media.</p>
            <FollowAffair briefingId={briefingId} storyId={storyId} followed={followed} onChange={setFollowed}/>
            <Button size="sm" variant="quiet" className="mt-3"
                    onClick={() => followed ? navigate(`/affairs/${followed}`) : setOpen(true)}>
                Show events and coverage
            </Button>
            {/* not followed: the affair is read in a pop-up; followed, its page has the same line and what it gave since */}
            {!followed && <AffairDialog open={open} onOpenChange={setOpen} briefingId={briefingId} storyId={storyId} title={chip.title}/>}
        </div>
    );
};
