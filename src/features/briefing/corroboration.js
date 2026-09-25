//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: corroboration.js
//  Description: What the reader is told about who tells a story of the briefing
//

// Ten media republishing one wire are one report, not ten confirmations: the count of media is
// always given with how many of the texts read were written apart from the others.
export const corroborationLabel = ({media, read, independent, agencies = []}) => {
    const wire = agencies.length > 0 ? ` · wire: ${agencies.join(', ')}` : '';
    if (media <= 1) return {color: 'yellow', text: `Only one medium${wire}`};
    if (read < 2) return {color: 'blue', text: `Told by ${media} media, too few texts could be read to compare them${wire}`};
    if (independent <= 1) return {color: 'orange', text: `Told by ${media} media, one single text republished${wire}`};
    return {color: 'green', text: `Told by ${media} media, ${independent} texts written independently of ${read} read${wire}`};
};
