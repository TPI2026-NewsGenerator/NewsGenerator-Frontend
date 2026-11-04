//
//  Author: Fabian Rostello
//  Date: 04.11.2026
//  File: FollowAffair.jsx
//  Description: The box under the name of an affair: ticked, the reader is told when the affair moves, and finds it among the
//               affairs they follow
//

import {useState} from "react";
import {Checkbox} from "@/components/ui/field.jsx";
import {AffairApi} from "@/features/affairs/affairApi.js";
import {changed} from "@/features/affairs/useUnread.js";
import {toast} from "@/lib/toast.js";

// followed: the id of the affair when the reader follows it, else null; onChange(id): it was followed (its id) or stopped (null). The tab "The
// affair" says what it is and leads to its events
export const FollowAffair = ({briefingId, storyId, followed, onChange}) => {
    const [busy, setBusy] = useState(false);

    const toggle = async (checked) => {
        setBusy(true);
        try {
            const data = checked ? await AffairApi.follow(briefingId, storyId) : await AffairApi.unfollow(followed);
            if (data?.error) throw new Error(data.error);
            onChange(checked ? data.id : null);
            changed();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-2">
            <Checkbox checked={Boolean(followed)} disabled={busy} onChange={event => toggle(event.target.checked)} className="text-[0.8125rem]">
                {busy ? 'One moment…' : 'Follow this affair'}
            </Checkbox>
        </div>
    );
};
