//
//  Author: Fabian Rostello
//  Date: 02.11.2026
//  File: ImportNames.jsx
//  Description: A list of names to follow from the first column of an Excel file: the names read, looked
//               for in Wikidata, the reader picking among the ones it could not tell, then all followed
//               at once, the items of Wikidata linked and the other names as written
//

import {useEffect, useMemo, useRef, useState} from "react";
import {Progress, RadioGroup} from "radix-ui";
import {readSheet} from "read-excel-file/browser";
import {Button} from "@/components/ui/button.jsx";
import {Checkbox} from "@/components/ui/field.jsx";
import {Dialog} from "@/components/ui/overlay.jsx";
import {Notice, Working} from "@/components/ui/text.jsx";
import {EntityApi} from "@/features/entities/entityApi.js";
import {checkNames, namesOfSheet, planOf, withRetry} from "@/features/entities/importNames.js";

const PREVIEW = 5;

// a choice among the items of a name: the radio of Radix (the RadioGroup of shadcn), its text a label
const Choice = ({value, children}) => (
    <label className="flex cursor-pointer items-start gap-2.5 py-1 text-[0.9375rem] leading-snug">
        <RadioGroup.Item value={value}
                         className="mt-[0.2em] inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-ink/50 bg-transparent outline-none hover:border-ink data-[state=checked]:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink">
            <RadioGroup.Indicator className="block size-2 rounded-full bg-ink"/>
        </RadioGroup.Item>
        <span>{children}</span>
    </label>
);

// the seconds left to wait, counted down
const Countdown = ({until}) => {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);
    return <>{Math.max(0, Math.ceil((until - now) / 1000))}</>;
};

// room: how many more names the profile can follow; onImported(data): what the server answers once they are
// followed ({entities, words, limits, added, left}); disabled: something else is changing the list. A call that
// fails for a reason that passes (Wikidata asked to wait, a restart, a timeout of the tunnel) is asked again by
// itself after a wait that grows, said on the page, nothing lost: sleep and patienceMs are those of withRetry,
// given for the tests
export const ImportNames = ({room, onImported, disabled = false, sleep, patienceMs}) => {
    const input = useRef(null);
    // null: closed; reading, ready (names found), checking, review, importing, done
    const [phase, setPhase] = useState(null);
    const [rows, setRows] = useState([]);
    const [skipFirst, setSkipFirst] = useState(false);
    const [results, setResults] = useState(() => new Map());
    const [done, setDone] = useState(0);
    const [error, setError] = useState(null);
    const [choices, setChoices] = useState(() => new Map());
    const [outcome, setOutcome] = useState(null);
    // the wait before a call is asked again: {until, error}
    const [wait, setWait] = useState(null);
    // the lots in flight when the dialog closes are left off, their answers dropped
    const run = useRef(0);
    const found = useRef(new Map());

    const names = useMemo(() => namesOfSheet(rows, {skipFirst}), [rows, skipFirst]);
    const plan = useMemo(() => planOf(names, results, choices), [names, results, choices]);
    const wanted = plan.qids.length + plan.words.length;

    const close = () => {
        run.current++;
        setWait(null);
        setPhase(null);
    };

    const pick = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        run.current++;
        found.current = new Map();
        setResults(new Map());
        setChoices(new Map());
        setSkipFirst(false);
        setError(null);
        setPhase('reading');
        try {
            setRows(await readSheet(file));
        } catch {
            setRows([]);
            setError('This file could not be read: it must be an Excel file (.xlsx).');
        }
        setPhase('ready');
    };

    const look = async () => {
        const turn = ++run.current;
        setError(null);
        setWait(null);
        setPhase('checking');
        setDone(found.current.size);
        try {
            await checkNames(names, EntityApi.importCheck, {
                results: found.current, stop: () => turn !== run.current, sleep, patienceMs,
                onResult: count => {
                    if (turn !== run.current) return;
                    setWait(null);
                    setDone(count);
                },
                onWait: ({ms, error: why}) => turn === run.current && setWait({until: Date.now() + ms, error: why}),
            });
            if (turn !== run.current) return;
            setWait(null);
            setResults(new Map(found.current));
            setPhase('review');
        } catch (err) {
            if (turn !== run.current) return;
            setWait(null);
            setError(err.message);
        }
    };

    const follow = async () => {
        const turn = ++run.current;
        setError(null);
        setWait(null);
        setPhase('importing');
        try {
            // followed again without harm: what is followed already is left as it is
            const data = await withRetry(() => EntityApi.importNames({qids: plan.qids, words: plan.words}), {
                stop: () => turn !== run.current, sleep, patienceMs,
                onWait: ({ms, error: why}) => turn === run.current && setWait({until: Date.now() + ms, error: why}),
            });
            if (turn !== run.current || data === null) return;
            setWait(null);
            setOutcome(data);
            onImported?.(data);
            setPhase('done');
        } catch (err) {
            if (turn !== run.current) return;
            setWait(null);
            setError(err.message);
            setPhase('review');
        }
    };

    // what stands in the way, and when the call is asked again
    const waiting = wait && (
        <Notice title="Wikidata or the server is slow">
            {wait.error}. Carrying on in <Countdown until={wait.until}/> s by itself, nothing is lost.
        </Notice>
    );

    const pickFirstOfEach = () => setChoices(new Map(plan.toChoose.map(({name, items}) => [name, items[0].qid])));

    const over = Math.max(0, wanted - room);
    const title = {reading: 'Reading the file…', ready: 'Names found', checking: 'Looking them up', review: 'Check before following', importing: 'Following them…', done: 'Done'}[phase];

    let body = null;
    let footer = null;
    if (phase === 'reading') body = <Working>Reading the file…</Working>;
    if (phase === 'ready') {
        body = (
            <div className="space-y-4">
                {error && <Notice type="error">{error}</Notice>}
                {!error && names.length === 0 && <p>No name found in the first column of the file.</p>}
                {names.length > 0 && (
                    <>
                        <p>
                            <strong>{names.length}</strong> {names.length === 1 ? 'name' : 'names'} in the first column
                            {names.length > PREVIEW && <>, the first ones are: </>}
                            {names.length <= PREVIEW && <>: </>}
                            {names.slice(0, PREVIEW).join(', ')}{names.length > PREVIEW && '…'}
                        </p>
                        <Checkbox checked={skipFirst} onChange={event => setSkipFirst(event.target.checked)}>The first row is a title, not a name</Checkbox>
                        <p className="caption">
                            Each name is looked for in Wikidata, about two minutes for 300. The ones it has one item for are linked to it; for the ones it has
                            several, you choose; the others are followed as written. You can follow {room} more.
                        </p>
                    </>
                )}
            </div>
        );
        footer = (
            <>
                <Button onClick={close}>Cancel</Button>
                <Button variant="primary" onClick={look} disabled={names.length === 0}>Look them up</Button>
            </>
        );
    }
    if (phase === 'checking') {
        body = (
            <div className="space-y-4">
                {error
                    ? <Notice type="error">{error}</Notice>
                    : <Working>Looking up in Wikidata…</Working>}
                {!error && waiting}
                <Progress.Root value={done} max={names.length} aria-label="Names looked up" className="relative h-px w-full bg-rule">
                    <Progress.Indicator className="h-full bg-ink transition-[width]" style={{width: `${names.length === 0 ? 0 : 100 * done / names.length}%`}}/>
                </Progress.Root>
                <p className="caption">{done} of {names.length} names</p>
            </div>
        );
        footer = (
            <>
                <Button onClick={close}>Cancel</Button>
                {error && <Button variant="primary" onClick={look}>Try again</Button>}
            </>
        );
    }
    if (phase === 'review') {
        const {counts} = plan;
        body = (
            <div className="space-y-6">
                {error && <Notice type="error">{error}</Notice>}
                <p>
                    {counts.linked > 0 && <><strong>{counts.linked}</strong> linked to Wikidata. </>}
                    {counts.toChoose > 0 && <><strong>{counts.toChoose}</strong> to choose. </>}
                    {counts.word > 0 && <><strong>{counts.word}</strong> followed as written. </>}
                    {counts.known > 0 && <>{counts.known} already followed. </>}
                    {counts.invalid > 0 && <>{counts.invalid} left out (2 to 60 characters). </>}
                </p>
                {over > 0 && (
                    <Notice type="error" title="More than you can follow">
                        You can follow {room} more and this makes {wanted}: the clubs, people and organisations come first, the last {over} are left out.
                    </Notice>
                )}
                {plan.toChoose.length > 0 && (
                    <section>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h3 className="kicker">Which one?</h3>
                            <Button size="sm" variant="subtle" onClick={pickFirstOfEach}>Pick the first of each</Button>
                        </div>
                        <p className="caption mt-1">Wikidata has several for these names and none stands out. Pick the one you mean, or follow the name as written.</p>
                        <ul className="mt-3 list-none border-t border-rule p-0">
                            {plan.toChoose.map(({name, items}) => (
                                <li key={name} className="border-b border-rule py-3">
                                    <p className="font-semibold">“{name}”</p>
                                    <RadioGroup.Root aria-label={`Which “${name}”?`} value={choices.get(name) ?? 'none'} className="mt-1"
                                                     onValueChange={value => setChoices(current => new Map(current).set(name, value))}>
                                        {items.map(item => (
                                            <Choice key={item.qid} value={item.qid}>
                                                <a href={`https://www.wikidata.org/wiki/${item.qid}`} target="_blank" rel="noreferrer" className="link">{item.label}</a>
                                                {item.description && <span className="caption block">{item.description}</span>}
                                            </Choice>
                                        ))}
                                        <Choice value="none">None of these: follow “{name}” as written</Choice>
                                    </RadioGroup.Root>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                {plan.linked.length > 0 && (
                    <details>
                        <summary className="kicker cursor-pointer">The {plan.linked.length} linked to Wikidata</summary>
                        <ul className="mt-2 list-none p-0 text-[0.9375rem] leading-snug">
                            {plan.linked.map(({name, item, famous}) => (
                                <li key={name} className="py-1">
                                    “{name}” → <a href={`https://www.wikidata.org/wiki/${item.qid}`} target="_blank" rel="noreferrer" className="link">{item.label}</a>
                                    {item.description && <span className="caption">, {item.description}</span>}
                                    {famous && <span className="caption"> (the best known of several)</span>}
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </div>
        );
        footer = (
            <>
                <Button onClick={close}>Cancel</Button>
                <Button variant="primary" onClick={follow} disabled={wanted === 0 || room === 0}>
                    Follow {Math.min(wanted, room)}
                </Button>
            </>
        );
    }
    if (phase === 'importing') {
        body = (
            <div className="space-y-4">
                <Working>Following them…</Working>
                {waiting}
            </div>
        );
    }
    if (phase === 'done' && outcome) {
        const {added, left} = outcome;
        body = (
            <div className="space-y-3">
                <p>
                    <strong>{added.items}</strong> {added.items === 1 ? 'club, person or organisation' : 'clubs, people and organisations'} and{' '}
                    <strong>{added.words}</strong> {added.words === 1 ? 'name' : 'names'} as written are followed.
                </p>
                {left.full > 0 && <p className="caption">{left.full} left out: you follow {outcome.limits.total} names at most.</p>}
                {left.missing > 0 && <p className="caption">{left.missing} are not in Wikidata any more and were left out.</p>}
                {added.items > 0 && <p className="caption">Their names and links are read in full from Wikidata in the background, which takes a few minutes.</p>}
            </div>
        );
        footer = <Button variant="primary" onClick={close}>Close</Button>;
    }

    return (
        <>
            <input ref={input} type="file" accept=".xlsx" className="sr-only" tabIndex={-1} aria-label="Excel file of names" onChange={pick}/>
            <Button disabled={disabled || room === 0} onClick={() => input.current?.click()}>Import from an Excel file</Button>
            <Dialog open={phase !== null} onOpenChange={open => !open && close()} kicker="Import names" title={title ?? ''} footer={footer} wide={phase === 'review'}
                    description="The names in the first column of an Excel file, followed at once.">
                {body}
            </Dialog>
        </>
    );
};
