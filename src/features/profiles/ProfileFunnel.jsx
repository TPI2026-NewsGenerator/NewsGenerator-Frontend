//
//  Author: Fabian Rostello
//  Date: 09.10.2026
//  File: ProfileFunnel.jsx
//  Description: A profile written with the AI: the reader writes a few words, the AI asks questions in
//               rounds, each with choices to tick and room for their own words, then writes the
//               profile. It is given to the page (onWritten), where the reader reads it and saves it
//

import {useEffect, useRef, useState} from "react";
import {ProfileApi} from "@/features/briefing/api/briefingApi.js";
import {Button} from "@/components/ui/button.jsx";
import {CheckboxGroup, Help, Input, Label} from "@/components/ui/field.jsx";
import {Notice, Working} from "@/components/ui/text.jsx";

const MIN_START = 3;            // the server refuses less, see server/services/utils/profile-funnel.js
const MAX_START = 300;
const MAX_FREE = 400;

// the questions of a round with nothing answered yet
const unanswered = (questions) => questions.map(question => ({...question, chosen: [], free: ''}));

// It may sit in the form of the signup: no form of its own, its buttons do not submit, and Enter in
// its fields does not create the account.
// language: the one the news are translated into. onWritten(text): the profile the AI wrote. onCancel: back
// to the text, left out when there is none to go back to
export const ProfileFunnel = ({language, onWritten, onCancel, cancelLabel = 'Write it myself', idPrefix = 'funnel'}) => {
    const [start, setStart] = useState('');
    const [rounds, setRounds] = useState([]);        // the rounds answered, sent back each time
    const [current, setCurrent] = useState(null);    // the questions of this round, being answered
    const [maxRounds, setMaxRounds] = useState(3);
    const [working, setWorking] = useState(null);    // what the AI does, said while it works
    const [error, setError] = useState(null);
    const roundTitle = useRef(null);

    // the reader is taken to each new round, once: not at each answer, the focus left the field typed in
    useEffect(() => {
        roundTitle.current?.focus();
    }, [rounds]);

    const call = async (what, request) => {
        setError(null);
        setWorking(what);
        try {
            const answer = await request();
            if (answer?.error) {
                setError(answer.error);
                return null;
            }
            return answer;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setWorking(null);
        }
    };

    const write = async (answered) => {
        const answer = await call('The AI writes your profile from your answers…',
            () => ProfileApi.funnelText({start: start.trim(), rounds: answered, language}));
        if (answer?.text) onWritten(answer.text);
    };

    // the next round of questions, or the profile when the AI has enough
    const ask = async (answered) => {
        const answer = await call(answered.length === 0 ? 'The AI prepares its questions…' : 'The AI reads your answers…',
            () => ProfileApi.funnelQuestions({start: start.trim(), rounds: answered, language}));
        if (!answer) return;
        setRounds(answered);
        if (answer.maxRounds) setMaxRounds(answer.maxRounds);
        if (answer.enough || !answer.questions?.length) {
            setCurrent(null);
            await write(answered);
        } else {
            setCurrent(unanswered(answer.questions));
        }
    };

    const answer = (index, changes) => setCurrent(questions => questions.map((question, i) => i === index ? {...question, ...changes} : question));
    const answeredNow = () => [...rounds, current.map(({question, options, chosen, free}) => ({question, options, chosen, free: free.trim()}))];
    const lastRound = rounds.length + 1 >= maxRounds;
    const canStart = start.trim().length >= MIN_START;
    const noSubmit = (action) => (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        action?.();
    };

    if (working) return <Working>{working}</Working>;

    return (
        <div className="space-y-8">
            {error && <Notice type="error" onClose={() => setError(null)}>{error}</Notice>}

            {current === null ? (
                <div className="space-y-5">
                    <div>
                        <Label htmlFor={`${idPrefix}-start`}>In a few words, what do you want to follow?</Label>
                        <Input id={`${idPrefix}-start`} className="mt-2" maxLength={MAX_START} value={start}
                               placeholder="Tennis, or: I work in renewable energy"
                               onChange={event => setStart(event.target.value)} aria-describedby={`${idPrefix}-start-help`}
                               onKeyDown={noSubmit(() => canStart && ask([]))}/>
                        <Help id={`${idPrefix}-start-help`}>
                            Press Enter or Continue: the AI then asks you a few questions, with choices to tick and
                            room for your own words, and writes your profile from your answers. You read it before
                            it is saved.
                        </Help>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button variant="primary" onClick={() => ask([])} disabled={!canStart}>Continue</Button>
                        {onCancel && <Button variant="subtle" onClick={onCancel}>{cancelLabel}</Button>}
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    <div>
                        <p className="kicker outline-none" tabIndex={-1} ref={roundTitle}>
                            Questions, round {rounds.length + 1} of {maxRounds}
                        </p>
                        <Help>Tick what you want. None fits? Leave the question blank: it is not asked again.</Help>
                    </div>
                    {current.map((question, index) => (
                        <div key={`${index}:${question.question}`} className="space-y-3 border-t border-rule pt-5">
                            {question.options.length > 0 ? (
                                <CheckboxGroup legend={question.question} options={question.options.map(option => ({value: option, label: option}))}
                                               value={question.chosen} onChange={chosen => answer(index, {chosen})} chips selectAll/>
                            ) : (
                                <p className="kicker text-ink">{question.question}</p>
                            )}
                            <div>
                                <label htmlFor={`${idPrefix}-free-${index}`} className="sr-only">{question.question}: in your own words</label>
                                <Input id={`${idPrefix}-free-${index}`} maxLength={MAX_FREE} value={question.free}
                                       placeholder="In your own words, if you want to say more"
                                       onChange={event => answer(index, {free: event.target.value})} onKeyDown={noSubmit()}/>
                            </div>
                        </div>
                    ))}
                    <div className="flex flex-wrap gap-3">
                        <Button variant="primary" onClick={() => lastRound ? write(answeredNow()) : ask(answeredNow())}>
                            {lastRound ? 'Write my profile' : 'Next questions'}
                        </Button>
                        {!lastRound && <Button onClick={() => write(answeredNow())}>Write my profile now</Button>}
                        {onCancel && <Button variant="subtle" onClick={onCancel}>{cancelLabel}</Button>}
                    </div>
                </div>
            )}
        </div>
    );
};
