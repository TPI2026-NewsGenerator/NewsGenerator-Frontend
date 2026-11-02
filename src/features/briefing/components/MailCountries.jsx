//
//  Author: Fabian Rostello
//  Date: 02.11.2026
//  File: MailCountries.jsx
//  Description: The countries a story shows above its title in the e-mail. The server finds them from who the
//               story names and gets some wrong: the reader unticks one, puts back one they unticked, or adds
//               another of the world before sending (the user, 02.11.2026)
//

import {useMemo, useState} from "react";
import {Checkbox, Select} from "@/components/ui/field.jsx";
import {allCountries, countryName} from "@/features/briefing/countries.js";

// story: {storyId, title, countries: [code]} the codes the server found; chosen: the codes the e-mail shows,
// the ones found while the reader changed nothing; onChange(codes): the codes now ticked, null to go back to
// the ones found
export const MailCountries = ({story, chosen, onChange}) => {
    const found = story.countries ?? [];
    const world = useMemo(() => allCountries(), []);
    // the countries the reader added stay listed once unticked, to be put back
    const [added, setAdded] = useState([]);
    const listed = [...new Set([...found, ...chosen, ...added])];
    const changed = chosen.length !== found.length || chosen.some(code => !found.includes(code));
    // the ones ticked in the order of the list
    const keep = (codes) => listed.filter(code => codes.includes(code));
    const toggle = (code, kept) => onChange(keep(kept ? [...chosen, code] : chosen.filter(other => other !== code)));
    const add = (code) => {
        if (!code || listed.includes(code)) return;
        setAdded(current => [...current, code]);
        onChange([...chosen, code]);
    };

    return (
        <fieldset className="mt-2 min-w-0 border border-rule p-3">
            <legend className="kicker px-1">Countries in the e-mail</legend>
            <p className="caption">
                Shown above its title. Left as found, they are left out when the title names them already; changed, they are
                shown as you choose, none ticked shows none.
            </p>
            {listed.length > 0 && (
                <div className="mt-1 flex flex-col">
                    {listed.map(code => (
                        <Checkbox key={code} checked={chosen.includes(code)} onChange={event => toggle(code, event.target.checked)}>
                            <span className="text-[0.9375rem]">{countryName(code)}</span>
                            {!found.includes(code) && <span className="caption block">added by you</span>}
                        </Checkbox>
                    ))}
                </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <Select className="w-64 max-w-full" aria-label={`Add a country to “${story.title}”`} value="" placeholder="Add a country…"
                        options={world.filter(({code}) => !listed.includes(code)).map(({code, name}) => ({value: code, label: name}))}
                        onChange={event => add(event.target.value)}/>
                {changed && (
                    <button type="button" onClick={() => onChange(null)}
                            className="caption cursor-pointer underline underline-offset-4 hover:text-ink">
                        Back to the ones found
                    </button>
                )}
            </div>
        </fieldset>
    );
};
