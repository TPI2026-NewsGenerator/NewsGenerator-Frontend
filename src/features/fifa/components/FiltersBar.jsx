//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: FiltersBar.jsx
//  Description: The controls of the page "The FIFA presidency" in the bar kept under the masthead: the candidate,
//               the confederation, the position level, the search, and the link that clears them
//

import {Toolbar} from "@/components/layout/Page.jsx";
import {Input, Select} from "@/components/ui/field.jsx";
import {CandidatesDialog} from "@/features/fifa/components/CandidatesDialog.jsx";
import {optionLabel} from "@/features/fifa/candidates.js";
import {CONFEDERATIONS, LEVEL_FILTERS} from "@/features/fifa/positions.js";
import {TABLE_VIEWS} from "@/features/fifa/useFifaState.js";

// onCandidates(select): the candidates changed (one added, a status changed): the page asks the map again and chooses the candidate `select`; onRemoved(qid): one was removed
export const FiltersBar = ({state, set, reset, filtered, subjects, admin, onCandidates, onRemoved}) => {
    // the tables (List, Confederations, Presidents) have their own search bar, bound to the same q: only one search box is on the screen
    const ownSearch = TABLE_VIEWS.includes(state.view);
    const candidates = [
        {value: 'all', label: 'All candidates'},
        ...subjects.map(subject => ({value: subject.qid, label: optionLabel(subject)})),
    ];
    return (
        <Toolbar>
            <Select aria-label="Candidate" className="w-full sm:w-52" value={state.candidate} options={candidates}
                    onChange={event => set({candidate: event.target.value})}/>
            <CandidatesDialog subjects={subjects} admin={admin} onChanged={onCandidates} onRemoved={onRemoved}/>
            <Select aria-label="Confederation" className="w-[calc(50%-0.5rem)] sm:w-48" value={state.confederation}
                    options={[{value: 'all', label: 'All confederations'}, ...CONFEDERATIONS.map(one => ({value: one, label: one}))]}
                    onChange={event => set({confederation: event.target.value})}/>
            <Select aria-label="Position level" className="w-[calc(50%-0.5rem)] sm:w-56" value={state.level} options={LEVEL_FILTERS}
                    onChange={event => set({level: event.target.value})}/>
            {!ownSearch && (
                <Input type="search" aria-label="Search an association, a country or a FIFA code" placeholder="Association, country, code"
                       className="w-full sm:w-64" value={state.search} onChange={event => set({search: event.target.value})}/>
            )}
            {filtered && (
                <button type="button" onClick={reset} className="link cursor-pointer text-[0.875rem]">Reset</button>
            )}
        </Toolbar>
    );
};
