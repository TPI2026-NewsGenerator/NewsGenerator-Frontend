//
//  Author: Fabian Rostello
//  Date: 04.11.2026
//  File: FollowAffair.jsx
//  Description: The box under the name of an affair: ticked, the reader is told when the affair moves, and finds it on the
//               page of the affairs they follow
//

import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {Checkbox} from "@/components/ui/field.jsx";
import {AffairApi} from "@/features/affairs/affairApi.js";
import {changed} from "@/features/affairs/useUnread.js";
import {toast} from "@/lib/toast.js";

// followed: the id of the affair when the reader follows it already, else null
export const FollowAffair = ({briefingId, storyId, followed}) => {
    const [id, setId] = useState(followed ?? null);
    const [busy, setBusy] = useState(false);

    useEffect(() => setId(followed ?? null), [followed, briefingId, storyId]);

    const toggle = async (checked) => {
        setBusy(true);
        try {
            const data = checked ? await AffairApi.follow(briefingId, storyId) : await AffairApi.unfollow(id);
            if (data?.error) throw new Error(data.error);
            setId(checked ? data.id : null);
            changed();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-3">
            <Checkbox checked={Boolean(id)} disabled={busy} onChange={event => toggle(event.target.checked)} className="text-[0.9375rem]">
                {busy ? 'One moment…' : 'Follow this affair'}
            </Checkbox>
            <p className="caption ml-[1.7rem]">
                {id
                    ? <>You are told when it moves. <Link className="link" to={`/affairs/${id}`}>Open it</Link> · <Link className="link" to="/affairs">all your affairs</Link></>
                    : 'You are told as soon as a new fact is told by several media.'}
            </p>
        </div>
    );
};
