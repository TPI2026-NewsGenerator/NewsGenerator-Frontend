//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: LeanBlock.jsx
//  Description: "Which candidate does {country} lean towards?": what a reader does on a country when no candidate is chosen in the list. An
//               association has one vote, so it leans toward at most one candidate. If the news show one, the reader confirms it ("Confirm
//               {candidate} ✓", the position becomes solid, "Confirmed by a reader") or says it is another one, or none (undecided); if the news
//               show several, or none, the reader chooses. The reading of the news stays in the cards under it. The field "Add a source (link)" goes with the
//               candidate the reader chooses (not with "Confirm" nor "None")
//

import {useState} from "react";
import {Button} from "@/components/ui/button.jsx";
import {SourceField} from "@/features/fifa/components/SourceField.jsx";
import {Swatch} from "@/features/fifa/components/Swatch.jsx";
import {candidateFill} from "@/features/fifa/positions.js";
import {sourceOf} from "@/features/fifa/sourceChecks.js";
import {cn} from "@/lib/utils.js";

const CHOICE = 'inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1 text-[0.875rem] transition-colors duration-200 disabled:cursor-default disabled:opacity-50';

// lean: leanOf() of positions.js (null: no candidate is shown); reader: the name of the reader; removable: this reader has a choice, a vote or a confirmation to
// take back; onChoose(subject, extra): 'qid' | 'none' | 'withdraw' -> {ok} | {error} (extra: {source} when the reader joined a link to a candidate); onConfirm(subject): confirms the position of the candidate shown -> {ok} | {error}
export const LeanBlock = ({member, subjects, lean, reader, removable, onChoose, onConfirm}) => {
    const [state, setState] = useState({busy: false, error: null});
    const [link, setLink] = useState('');

    const run = async (action) => {
        setState({busy: true, error: null});
        const answer = await action();
        setState({busy: false, error: answer?.error ?? null});
        return answer;
    };
    // a candidate chosen, with the link when the reader typed one; the field empties once the server accepted it (a refused link stays to be corrected)
    const choose = async (qid) => {
        const extra = sourceOf(link, 'for');
        const answer = await run(() => onChoose(qid, extra));
        if (answer?.ok && extra.source) setLink('');
    };

    const several = (lean?.conflicting.length ?? 0) > 0;
    const chosen = lean?.subject_qid ? subjects.find(one => one.qid === lean.subject_qid) : null;
    const others = chosen ? subjects.filter(one => one.qid !== chosen.qid) : subjects;
    const confirmedByMe = Boolean(chosen) && reader !== '' && lean.confirmedBy.includes(reader);

    return (
        <section aria-labelledby="lean-heading" className="mb-6 rounded-2xl border border-rule p-5">
            <h3 id="lean-heading" className="section-title">Which candidate does {member.name} lean towards?</h3>

            {chosen && (
                <div className="mt-3">
                    <p className="flex items-center gap-2 text-[1.0625rem] font-semibold"><Swatch fill={candidateFill(chosen.color_index)}/>{chosen.name}</p>
                    <p className="caption mt-0.5">
                        {lean.human
                            ? `Chosen by ${lean.human.by}`
                            : lean.confirmedBy.length > 0 ? `Confirmed by ${lean.confirmedBy.join(', ')}` : 'Read from the news'}
                    </p>
                    <div className="mt-3">
                        {confirmedByMe
                            ? <Button variant="quiet" disabled>Confirmed ✓</Button>
                            : <Button variant="primary" loading={state.busy} onClick={() => run(() => onConfirm(chosen.qid))}>Confirm {chosen.name} ✓</Button>}
                    </div>
                    <p className="caption mt-4">Not this one? Choose another candidate:</p>
                </div>
            )}
            {several && <p className="mt-2 text-[0.9375rem]">The news point to several: choose one.</p>}
            {!lean && <p className="mt-2 text-[0.9375rem]">No candidate is shown yet. Which one does it lean towards?</p>}
            {lean?.none && <p className="mt-2 text-[0.9375rem]">Undecided, set by {lean.human.by}. Which candidate does it lean towards?</p>}

            <SourceField value={link} onChange={setLink} disabled={state.busy} hint="Optional: the link of a page that says it. It goes with the candidate you choose below (not with Confirm nor None); the AI reads the page in the background and it never changes a colour."/>
            <div role="group" aria-label="Candidates" className="mt-3 flex flex-wrap gap-2">
                {others.map(subject => (
                    <button key={subject.qid} type="button" disabled={state.busy} onClick={() => choose(subject.qid)}
                            className={cn(CHOICE, 'border-rule text-ink hover:border-ink-mute')}>
                        <Swatch fill={candidateFill(subject.color_index)}/>{subject.name}
                    </button>
                ))}
                <button type="button" disabled={state.busy} aria-pressed={Boolean(lean?.none)} onClick={() => run(() => onChoose('none'))}
                        className={cn(CHOICE, lean?.none ? 'border-action bg-action text-white' : 'border-rule text-ink hover:border-ink-mute')}>
                    None / undecided
                </button>
            </div>

            <button type="button" disabled={state.busy || !removable} onClick={() => run(() => onChoose('withdraw'))}
                    className="link mt-3 cursor-pointer text-[0.8125rem] disabled:cursor-default disabled:opacity-40 disabled:no-underline">
                Remove my choice
            </button>
            {state.error && <p role="alert" className="caption mt-2 !text-accent-ink">{state.error}</p>}
        </section>
    );
};
