//
//  Author: Fabian Rostello
//  Date: 03.11.2026
//  File: MailNeutralTitle.jsx
//  Description: A neutral title the AI proposes for a story, in the editor of the e-mail. The reader sees it against the
//               title of the card, word by word, and uses it or not: a rewrite can change the meaning, so nothing is
//               put in the e-mail without being read (the user, 03.11.2026: "l'IA propose, le lecteur valide")
//

import {useState} from "react";
import {Button} from "@/components/ui/button.jsx";
import {wordDiff} from "@/features/briefing/wordDiff.js";

const NONE = {
    same: 'This title is neutral already: nothing to change.',
    unsafe: 'The AI’s proposal changed what the title says, so it is not shown. Change the title by hand if you want it neutral.',
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

// story: {storyId, title} the title of the card; onAsk(): the neutral title the server proposes, {title} or {title: null,
// reason}; onUse(title): the proposal the reader uses
export const MailNeutralTitle = ({story, onAsk, onUse, disabled = false}) => {
    const [answer, setAnswer] = useState(null);

    const ask = async () => {
        setAnswer({status: 'loading'});
        try {
            const proposal = await onAsk(story.storyId);
            setAnswer(proposal?.title ? {status: 'ready', title: proposal.title} : {status: 'none', reason: proposal?.reason ?? 'unsafe'});
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
                    <p className="kicker mt-3">Neutral title proposed</p>
                    <p className="mt-0.5 text-[0.9375rem] font-medium"><Words words={diff.after} tone="in"/></p>
                    <p className="caption mt-2">
                        Written by the AI from the title and the sentences of the card. Read it against the title: a rewrite can change what it says.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <Button size="sm" variant="primary" onClick={() => { onUse(answer.title); setAnswer(null); }}>Use this title</Button>
                        <Button size="sm" variant="subtle" onClick={() => setAnswer(null)}>Keep the title</Button>
                    </div>
                </div>
            )}
            {answer?.status === 'none' && <p role="status" className="caption mt-1">{NONE[answer.reason] ?? NONE.unsafe}</p>}
            {answer?.status === 'error' && <p role="alert" className="caption mt-1 !text-accent-ink">No neutral title: {answer.message}</p>}
        </div>
    );
};
