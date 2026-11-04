//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: MailLayoutChoice.jsx
//  Description: The choice of the layout of the editor of the e-mail in the settings (the user, 05.11.2026): each of the two is a card
//               with a drawing of it, the three frames being the one at first. Kept in this browser (see mailEditorLayout.js)
//

import {useState} from "react";
import {RadioGroup} from "radix-ui";
import {keepLayout, keptLayout, LAYOUTS} from "@/features/briefing/mailEditorLayout.js";
import {cn} from "@/lib/utils.js";

// a drawing is made of grey bars and a few blue marks, on the grey of the page: it says the layout, not the words
const Bar = ({className}) => <span className={cn('block h-1.5 rounded-full bg-ink-mute/30', className)}/>;
const Box = ({on = false}) => <span className={cn('block size-2 rounded-[3px] border', on ? 'border-action bg-action' : 'border-ink-mute/50')}/>;

// the stories in a list, the e-mail in the middle, what the story chosen carries on the right
const FramesDrawing = () => (
    <div aria-hidden className="grid h-32 grid-cols-[1fr_1.6fr_1.1fr] divide-x divide-rule overflow-hidden rounded-xl bg-paper ring-1 ring-rule">
        <div className="space-y-2 p-2.5">
            <Bar className="w-3/4 bg-action/60"/><Bar className="w-5/6"/><Bar className="w-2/3"/><Bar className="w-4/5"/>
        </div>
        <div className="space-y-1.5 bg-paper-deep p-2.5">
            <Bar className="w-5/6 bg-ink-mute/50"/>
            <span className="flex gap-1"><span className="h-2 w-8 rounded-full bg-accent-ink/40"/><span className="h-2 w-8 rounded-full bg-official/40"/></span>
            <span className="block h-8 rounded-md bg-ink-mute/20"/>
            <Bar className="w-full"/><Bar className="w-4/5"/>
        </div>
        <div className="space-y-2 p-2.5">
            {[true, true, false, true, false].map((on, i) => <span key={i} className="flex items-center gap-1.5"><Box on={on}/><Bar className="w-3/5"/></span>)}
        </div>
    </div>
);

// the stories in rows, what each carries in columns
const MatrixDrawing = () => (
    <div aria-hidden className="flex h-32 flex-col overflow-hidden rounded-xl bg-paper ring-1 ring-rule">
        <div className="divide-y divide-rule">
            {[[true, true, false, true, true, false], [true, false, true, true, false, true], [false, true, true, false, true, true]].map((cells, row) => (
                <div key={row} className="grid grid-cols-[1.6fr_repeat(6,1fr)] items-center gap-1 px-2.5 py-2">
                    <Bar className="w-4/5"/>
                    {cells.map((on, i) => <span key={i} className="flex justify-center"><Box on={on}/></span>)}
                </div>
            ))}
        </div>
        <div className="mt-auto space-y-1.5 border-t border-rule bg-paper-deep p-2.5">
            <Bar className="w-1/2 bg-ink-mute/50"/><Bar className="w-5/6"/>
        </div>
    </div>
);

const DRAWINGS = {frames: FramesDrawing, matrix: MatrixDrawing};

export const MailLayoutChoice = () => {
    const [layout, setLayout] = useState(keptLayout);
    const choose = (value) => {
        setLayout(value);
        keepLayout(value);
    };

    return (
        <RadioGroup.Root value={layout} onValueChange={choose} aria-label="The editor of the e-mail" className="grid max-w-[46rem] gap-4 sm:grid-cols-2">
            {LAYOUTS.map(({value, label, means}) => {
                const Drawing = DRAWINGS[value];
                return (
                    <RadioGroup.Item key={value} value={value}
                                     className="group cursor-pointer rounded-2xl p-3 text-left ring-1 ring-rule transition-colors hover:bg-paper-deep data-[state=checked]:bg-action/10 data-[state=checked]:ring-2 data-[state=checked]:ring-action">
                        <Drawing/>
                        <span className="mt-3 flex items-center gap-2 text-[0.9375rem] font-medium">
                            {label}
                            {value === 'frames' && <span className="caption rounded-full bg-paper-deep px-2 py-0.5 group-data-[state=checked]:bg-paper">at first</span>}
                        </span>
                        <span className="caption mt-1 block">{means}</span>
                    </RadioGroup.Item>
                );
            })}
        </RadioGroup.Root>
    );
};
