//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: CandidateBar.jsx
//  Description: The chips that choose which candidate's card the sheet of an association shows: "All" and one chip for each candidate (its colour and its name). A single
//               choice, local to the sheet (it does not change the filter of the page). They are radio buttons, so the keyboard works as it does for any group of
//               them (Tab to the group, the arrows move the choice); they wrap on a phone. Not drawn when there is a single candidate
//

import {useId} from "react";
import {Swatch} from "@/features/fifa/components/Swatch.jsx";
import {candidateFill} from "@/features/fifa/positions.js";
import {cn} from "@/lib/utils.js";

const CHIP = cn(
    'inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-rule px-3.5 py-1 text-[0.875rem] text-ink transition-colors duration-200 hover:border-ink-mute',
    'has-checked:border-action has-checked:bg-action/8 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-action',
);

// subjects: the candidates, in the order of their cards; value: 'all' or the qid shown; onChange(value)
export const CandidateBar = ({subjects, value, onChange}) => {
    const name = useId();
    if (subjects.length < 2) return null;
    const options = [{value: 'all', label: 'All'}, ...subjects.map(subject => ({value: subject.qid, label: subject.name, subject}))];
    return (
        <div role="radiogroup" aria-label="Candidate shown" className="mb-4 flex flex-wrap gap-2">
            {options.map(option => (
                <label key={option.value} className={CHIP}>
                    <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="peer sr-only"/>
                    {option.subject && <Swatch fill={candidateFill(option.subject.color_index)}/>}
                    <span>{option.label}</span>
                </label>
            ))}
        </div>
    );
};
