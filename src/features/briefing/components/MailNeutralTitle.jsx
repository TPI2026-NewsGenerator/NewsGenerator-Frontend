//
//  Author: Fabian Rostello
//  Date: 03.11.2026
//  File: MailNeutralTitle.jsx
//  Description: A neutral title the AI proposes for a story, in the editor of the e-mail. The reader sees it against the
//               title of the card, word by word, and uses it or not: a rewrite can change the meaning, so nothing is
//               put in the e-mail without being read (the user, 03.11.2026: "l'IA propose, le lecteur valide"). The proposal of
//               the briefing is there when the editor opens, a button asks for another; a proposal the checks found something
//               against is shown too, with what they found, for the reader to decide (the user, 06.11.2026). It says it was REFUSED by
//               the checks, and the e-mail keeps the title of the card unless the reader uses it anyway (the user, 12.11.2026: the e-mail
//               opening with the refused title was tried and taken back)
//

import {useState} from "react";
import {Button} from "@/components/ui/button.jsx";
import {wordDiff} from "@/features/briefing/wordDiff.js";

const NONE = {
    same: 'This title is neutral already: nothing to change.',
    unsafe: 'The AI wrote no neutral title for this one. Change the title by hand if you want it neutral.',
};

// what the checks of the server found against a proposal (see bestRewrite on the server): the reader reads the words against the title
const WARNINGS = {
    'name lost': 'it leaves out a name of the title',
    'name added': 'it puts in a name the title does not have',
    'figure lost': 'it leaves out a figure of the title',
    'figure added': 'it puts in a figure the title does not have',
    negation: 'it adds or takes out a negation',
    question: 'it turns a question into a statement, or the opposite',
    'quotation changed': 'it changes what someone is quoted as saying',
    exclamation: 'it keeps an exclamation mark',
    length: 'it is much shorter or longer than the title',
    'second opinion': 'a second reading by the AI says it may not tell exactly the same fact',
};

// the words of a text, the ones the other text does not have marked: struck through when taken out, underlined when put in
const Words = ({words, tone}) => (
    <>
        {words.map(({text, changed}, i) => (
            <span key={i}>
                {i > 0 && ' '}
                {changed ? <span className={tone === 'out' ? 'text-ink-mute line-through' : 'underline decoration-action-text underline-offset-4'}>{text}</span> : text}
            </span>
        ))}
    </>
);

// story: {storyId, title, titleProposal} the title of the card, and the proposal the briefing was written with, {title, problem}, if it had
// one; onAsk(): the neutral title the server proposes, {title, problem?} or {title: null, reason}; onUse(title): the proposal the reader uses
export const MailNeutralTitle = ({story, onAsk, onUse, disabled = false}) => {
    const [answer, setAnswer] = useState(() => story.titleProposal?.title && story.titleProposal.title !== story.title
        ? {status: 'ready', title: story.titleProposal.title, problem: story.titleProposal.problem ?? null} : null);

    const ask = async () => {
        setAnswer({status: 'loading'});
        try {
            const proposal = await onAsk(story.storyId);
            setAnswer(proposal?.title ? {status: 'ready', title: proposal.title, problem: proposal.problem ?? null} : {status: 'none', reason: proposal?.reason ?? 'unsafe'});
        } catch (err) {
            setAnswer({status: 'error', message: err.message});
        }
    };

    const diff = answer?.status === 'ready' ? wordDiff(story.title, answer.title) : null;
    return (
        <div className="mt-1">
            <Button size="sm" variant="link" onClick={ask} loading={answer?.status === 'loading'} disabled={disabled}
                    aria-label={`Suggest a neutral title for “${story.title}”`}>
                {answer?.status === 'loading' ? 'Writing a neutral title…' : 'Suggest a neutral title'}
            </Button>
            {diff && (
                <div className="mt-2 border border-rule p-3" role="group" aria-label="Neutral title proposed by the AI">
                    <p className="kicker">The title of the card</p>
                    <p className="mt-0.5 text-[0.9375rem]"><Words words={diff.before} tone="out"/></p>
                    <p className="kicker mt-3">{answer.problem ? 'Neutral title proposed, refused by the checks' : 'Neutral title proposed'}</p>
                    <p className="mt-0.5 text-[0.9375rem] font-medium"><Words words={diff.after} tone="in"/></p>
                    <p className="caption mt-2">
                        Written by the AI from the title and the sentences of the card. Read it against the title: a rewrite can change what it says.
                    </p>
                    {answer.problem && (
                        <p role="note" className="caption mt-2 !text-accent-ink">
                            Refused by the checks: {WARNINGS[answer.problem] ?? 'they found something against it'}. The e-mail keeps the title of the card unless you use this one anyway.
                        </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                        <Button size="sm" variant={answer.problem ? 'subtle' : 'primary'} onClick={() => { onUse(answer.title); setAnswer(null); }}>
                            {answer.problem ? 'Use it anyway' : 'Use this title'}
                        </Button>
                        <Button size="sm" variant="subtle" onClick={() => setAnswer(null)}>Keep the title</Button>
                    </div>
                </div>
            )}
            {answer?.status === 'none' && <p role="status" className="caption mt-1">{NONE[answer.reason] ?? NONE.unsafe}</p>}
            {answer?.status === 'error' && <p role="alert" className="caption mt-1 !text-accent-ink">No neutral title: {answer.message}</p>}
        </div>
    );
};
