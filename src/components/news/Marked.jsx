//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: Marked.jsx
//  Description: A text with the terms the profile follows marked in it, a light tint of the accent, and the
//               sentences the translation left in their language in italics
//

import {Fragment} from "react";
import {ORIGINAL_END, ORIGINAL_START, segmentsOf} from "@/features/briefing/marks.js";

// marks: [[start, end]] of the terms in text (see features/briefing/marks.js); none, the text as it is.
// A sentence between the marks ORIGINAL_START and ORIGINAL_END is in italics (the places of the terms
// count them: the marks were found in the text as written)
export const Marked = ({text, marks}) => {
    if (!text) return null;
    const left = text.includes(ORIGINAL_START);
    if (!marks?.length && !left) return text;
    let italic = false;
    return segmentsOf(text, marks).map((segment, i) => segment.text.split(new RegExp(`([${ORIGINAL_START}${ORIGINAL_END}])`)).map((part, j) => {
        if (part === ORIGINAL_START || part === ORIGINAL_END) {
            italic = part === ORIGINAL_START;
            return null;
        }
        if (!part) return null;
        const inItalic = italic ? <i>{part}</i> : part;
        return segment.marked
            ? <mark key={`${i}-${j}`} className="rounded-[3px] bg-[#FFE066]/45 dark:bg-[#FFD60A]/25 text-inherit [box-decoration-break:clone]">{inItalic}</mark>
            : <Fragment key={`${i}-${j}`}>{inItalic}</Fragment>;
    }));
};
