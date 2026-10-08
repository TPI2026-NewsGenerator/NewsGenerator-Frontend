//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: Marked.jsx
//  Description: A text with the terms the profile follows marked in it, a light tint of the accent
//

import {Fragment} from "react";
import {segmentsOf} from "@/features/briefing/marks.js";

// marks: [[start, end]] of the terms in text (see features/briefing/marks.js); none, the text as it is
export const Marked = ({text, marks}) => {
    if (!text) return null;
    if (!marks?.length) return text;
    return segmentsOf(text, marks).map((segment, i) => segment.marked
        ? <mark key={i} className="rounded-[2px] bg-accent-ink/15 text-inherit [box-decoration-break:clone]">{segment.text}</mark>
        : <Fragment key={i}>{segment.text}</Fragment>);
};
