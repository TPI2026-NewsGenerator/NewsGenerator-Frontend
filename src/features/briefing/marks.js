//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: marks.js
//  Description: The places of the terms the profile follows in a text, as the server finds them
//               (server/services/utils/filter.js, highlights): [[start, end]] in the text as written
//

// the text in pieces, the ones of a term marked: [{text, marked}]
export const segmentsOf = (text, marks = []) => {
    const segments = [];
    let at = 0;
    for (const [start, end] of marks) {
        if (start < at || end > text.length || end <= start) continue;
        if (start > at) segments.push({text: text.slice(at, start), marked: false});
        segments.push({text: text.slice(start, end), marked: true});
        at = end;
    }
    if (at < text.length) segments.push({text: text.slice(at), marked: false});
    return segments;
};

// the paragraphs of a text (a blank line between two), each with the places of the terms in it
export const paragraphsWithMarks = (text, marks = []) => {
    if (!text) return [];
    const paragraphs = [];
    const add = (start, end) => paragraphs.push({
        text: text.slice(start, end),
        marks: marks.filter(([from, to]) => from < end && to > start)
            .map(([from, to]) => [Math.max(from, start) - start, Math.min(to, end) - start]),
    });
    const gap = /\n\s*\n/g;
    let start = 0;
    for (let found = gap.exec(text); found; found = gap.exec(text)) {
        add(start, found.index);
        start = found.index + found[0].length;
    }
    add(start, text.length);
    return paragraphs;
};
