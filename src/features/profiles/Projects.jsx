//
//  Author: Fabian Rostello
//  Date: 13.10.2026
//  File: Projects.jsx
//  Description: The projects of a profile: what the reader prepares for a time (a trip, a purchase, a
//               report), written with the AI as the profile is. The briefing looks for their news in the
//               profile's sources until their last day
//

import {useState} from "react";
import {Button} from "@/components/ui/button.jsx";
import {Help, Input, Label, Textarea} from "@/components/ui/field.jsx";
import {Meta} from "@/components/ui/text.jsx";
import {ProfileApi} from "@/features/briefing/api/briefingApi.js";
import {ProfileFunnel} from "@/features/profiles/ProfileFunnel.jsx";
import {MIN_PROFILE_TEXT} from "@/features/briefing/profileWords.js";

const PROJECT_FUNNEL = {
    questions: (funnel) => ProfileApi.projectQuestions(funnel),
    text: (funnel) => ProfileApi.projectText(funnel),
    start: 'In a few words, what is your project?',
    placeholder: 'A trip to Japan in November, or: buying an electric car',
    help: 'Press Enter or Continue: the AI asks you a few questions on the project only, then describes it from your answers. You read it before it is saved.',
    writing: 'The AI describes your project from your answers…',
    write: 'Describe my project',
    writeNow: 'Describe it now',
};

const today = () => new Date().toISOString().slice(0, 10);
const inAYear = () => new Date(Date.now() + 365 * 24 * 3600e3).toISOString().slice(0, 10);
const dayLabel = (day) => new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'});

// one project: its description, the interests the AI read in it, its last day, which can be changed
const Project = ({project, busy, onEnd, onRemove}) => {
    const [end, setEnd] = useState(project.endsOn ?? '');
    const id = `project-end-${project.id}`;
    return (
        <li className="border-b border-rule py-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="font-display text-[1.4rem] leading-tight">{project.name}</h3>
                <Meta>{project.running
                    ? project.endsOn ? `read until ${dayLabel(project.endsOn)}` : 'read until you delete it'
                    : `ended on ${dayLabel(project.endsOn)}: no longer read`}</Meta>
            </div>
            <p className="body-text mt-3 whitespace-pre-line">{project.text}</p>
            {project.interests.length > 0 && (
                <p className="caption mt-3">Read by the AI as: {project.interests.map(interest => interest.text).join(' · ')}</p>
            )}
            <div className="mt-4 flex flex-wrap items-end gap-3">
                <div>
                    <Label htmlFor={id}>Last day</Label>
                    <Input id={id} type="date" className="mt-1" min={today()} max={inAYear()} value={end} onChange={event => setEnd(event.target.value)}/>
                </div>
                <Button size="sm" disabled={busy || end === (project.endsOn ?? '')} onClick={() => onEnd(end || null)}>
                    {end ? 'Change the last day' : 'No last day'}
                </Button>
                <Button size="sm" variant="subtle" disabled={busy} onClick={onRemove}>Delete</Button>
            </div>
        </li>
    );
};

// projects: as the server gives them; max: how many at most; language: the one of the profile;
// change(call): the call made, the profile shown as the server answers it, true when it did
export const Projects = ({projects, max = 5, language, busy, change}) => {
    // null: no project being written; else {name, endsOn, text, guided}
    const [draft, setDraft] = useState(null);
    const edit = (changes) => setDraft(current => ({...current, ...changes}));
    const canSave = draft && draft.name.trim() && draft.text.trim().length >= MIN_PROFILE_TEXT;

    const save = async () => {
        if (await change(() => ProfileApi.createProject({name: draft.name.trim(), text: draft.text.trim(), endsOn: draft.endsOn || null}))) setDraft(null);
    };

    return (
        <div className="max-w-[70ch] space-y-6">
            {projects.length > 0 && (
                <ul className="list-none border-t border-rule p-0">
                    {projects.map(project => (
                        <Project key={`${project.id}:${project.endsOn}`} project={project} busy={busy}
                                 onEnd={endsOn => change(() => ProfileApi.setProjectEnd(project.id, endsOn))}
                                 onRemove={() => change(() => ProfileApi.removeProject(project.id))}/>
                    ))}
                </ul>
            )}

            {draft === null ? (
                <div>
                    <Button variant="primary" disabled={busy || projects.length >= max}
                            onClick={() => setDraft({name: '', endsOn: '', text: '', guided: true})}>New project</Button>
                    {projects.length >= max && <Help>At most {max} projects: delete one first.</Help>}
                </div>
            ) : (
                <div className="space-y-5 border-t border-ink pt-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label htmlFor="project-name">Its name</Label>
                            <Input id="project-name" className="mt-2" maxLength={40} value={draft.name} placeholder="Trip to Japan"
                                   onChange={event => edit({name: event.target.value})}/>
                        </div>
                        <div>
                            <Label htmlFor="project-end">Its last day</Label>
                            <Input id="project-end" type="date" className="mt-2" min={today()} max={inAYear()} value={draft.endsOn}
                                   onChange={event => edit({endsOn: event.target.value})}/>
                            <Help>Its news are left out after it. None: until you delete it.</Help>
                        </div>
                    </div>
                    {draft.guided ? (
                        <ProfileFunnel idPrefix="project-funnel" language={language} words={PROJECT_FUNNEL}
                                       onWritten={text => edit({text, guided: false})}
                                       onCancel={() => edit({guided: false})} cancelLabel="Describe it myself"/>
                    ) : (
                        <>
                            <div>
                                <Label htmlFor="project-text">The project and the news you want for it</Label>
                                <Textarea id="project-text" rows={7} className="mt-3" maxLength={3000} value={draft.text}
                                          onChange={event => edit({text: event.target.value})}/>
                                <Help>The AI reads it as interests, as your profile. Its news come from the sources of this profile.</Help>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button variant="primary" loading={busy} disabled={busy || !canSave} onClick={save}>Save the project</Button>
                                <Button onClick={() => edit({guided: true})}>Ask me questions</Button>
                                <Button variant="subtle" onClick={() => setDraft(null)}>Cancel</Button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
