//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: PositionCell.jsx
//  Description: The position of an association in a cell of a table: the mark of its colour, the words, and the badges that say who made it what it
//               is (a reader set it, a reader confirmed it) and that there are Uncertain signals besides
//

import {Badge} from "@/components/ui/badge.jsx";
import {Swatch} from "@/features/fifa/components/Swatch.jsx";

const SMALL = '!px-2 !py-0.5 !text-[0.75rem]';

// described: describe() of positions.js
export const PositionCell = ({described}) => (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <Swatch fill={described.fill} ring={described.ring}/>
        <span className="min-w-0">{described.label}</span>
        {described.byReader && <Badge tone="quiet" className={SMALL}>Set by a reader</Badge>}
        {described.promoted && <Badge tone="quiet" className={SMALL}>Confirmed by a reader</Badge>}
        {described.uncertain > 0 && described.category !== 'uncertain' && <Badge tone="uncertain" className={SMALL}>{described.uncertain} uncertain</Badge>}
    </span>
);
