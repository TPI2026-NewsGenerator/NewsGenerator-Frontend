//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: Swatch.jsx
//  Description: The small mark of a position next to its words: a dot of its colour, the hatch of conflicting indications, or the dotted
//               ring on grey of Uncertain. Colour is never the only sign: the words always stand beside it
//

import {DotPattern, HatchPattern} from "@/features/fifa/components/Patterns.jsx";
import {DOT_COLOURS, HATCH} from "@/features/fifa/positions.js";
import {cn} from "@/lib/utils.js";

const DOTS = /^url\(#fifa-dots-(.+)\)$/;

// fill: a colour of the theme or a pattern (see positions.js): solid for a declared position, dots for a probable one, the hatch of conflicting
// indications; ring: the dotted ring of Uncertain on the grey. A swatch draws its own pattern, a tile of 4 px so that the dots show in 12 px
export const Swatch = ({fill, ring = false, className}) => {
    const dots = DOTS.exec(fill ?? '')?.[1];
    if (fill === HATCH || dots) {
        const id = fill === HATCH ? 'fifa-hatch-key' : `fifa-dots-key-${dots}`;
        return (
            <svg aria-hidden viewBox="0 0 12 12" className={cn('size-3 shrink-0 rounded-full border border-ink-mute/40', className)}>
                <defs>
                    {fill === HATCH ? <HatchPattern id={id} size={4}/> : <DotPattern id={id} colour={DOT_COLOURS[dots] ?? DOT_COLOURS.neutral} size={4}/>}
                </defs>
                <rect width="12" height="12" fill={`url(#${id})`}/>
            </svg>
        );
    }
    return (
        <span aria-hidden className={cn('inline-block size-3 shrink-0 rounded-full border', ring ? 'border-dashed border-ink-mute' : 'border-ink-mute/40', className)} style={{background: fill}}/>
    );
};
