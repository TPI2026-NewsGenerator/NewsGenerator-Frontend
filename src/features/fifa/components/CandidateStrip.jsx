//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: CandidateStrip.jsx
//  Description: The first thing of the tab Positions of the sheet of an association: one card for EVERY candidate of the map, the ones the news say nothing of for this association
//               too (their status is "No known position"). A card has the colour of the candidate on its left edge, its name, the status of the candidate for this association in
//               the words of the rest of the page (a position read from the news, "Uncertain: signals, no position", "No known position", with "Set by a reader" or "Confirmed by a
//               reader" when a reader decided or validated it) and "Review →" ("Take a position →" when no position is known). A card is a real button: it selects the candidate
//               (aria-pressed), and the sheet shows the detail of that candidate under the strip, with the vote. A second click on the selected card unselects it. Two columns
//               in a narrow panel (a phone), three when the panel is wide
//

import {UserCheck} from "lucide-react";
import {candidateFill, statusOf} from "@/features/fifa/positions.js";
import {cn} from "@/lib/utils.js";

// subjects: the candidates in the order of the cards; positions: the entries of the sheet by candidate (none for a candidate the news say nothing of); selected: the qid selected or
// null; onSelect(qid | null)
export const CandidateStrip = ({subjects, positions, levels, selected, onSelect}) => {
    if (subjects.length === 0) return null;
    return (
        <div role="group" aria-label="Candidates and their status" className="@container">
            <div className="grid grid-cols-2 gap-2.5 @xl:grid-cols-3">
                {subjects.map(subject => {
                    const status = statusOf(positions?.[subject.qid], levels);
                    const pressed = selected === subject.qid;
                    return (
                        <button key={subject.qid} type="button" aria-pressed={pressed} onClick={() => onSelect(pressed ? null : subject.qid)}
                                style={{borderLeftColor: candidateFill(subject.color_index)}}
                                className={cn(
                                    'flex min-h-11 min-w-0 cursor-pointer flex-col items-start rounded-xl border border-l-[5px] border-rule bg-paper px-3 py-2.5 text-left transition-colors duration-200',
                                    'hover:bg-paper-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action',
                                    'aria-pressed:bg-paper-deep aria-pressed:ring-2 aria-pressed:ring-action/50',
                                )}>
                            {/* the spaces between the lines make the name of the button read "Mock candidate A Declared support Review →" for a screen reader, whatever the layout */}
                            <span className="block w-full text-[0.9375rem] font-medium leading-snug text-ink">{subject.name}</span>{' '}
                            <span className="mt-1 block w-full text-[0.8125rem] leading-snug text-ink-mute">{status.label}</span>{' '}
                            {(status.human || status.confirmed) && (
                                <>
                                    <span className="mt-1 inline-flex items-center gap-1 text-[0.75rem] text-ink-mute">
                                        <UserCheck aria-hidden className="size-3.5 shrink-0"/>
                                        {status.human ? 'Set by a reader' : 'Confirmed by a reader'}
                                    </span>{' '}
                                </>
                            )}
                            <span className="mt-1.5 text-[0.8125rem] text-action-text">{status.known ? 'Review →' : 'Take a position →'}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
