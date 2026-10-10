//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: MailPicture.jsx
//  Description: The picture of a story in the e-mail of the briefing, as the reader chooses it before
//               sending: its own, none, another of the story, an image of the web or a file of theirs
//

import {useRef, useState} from "react";
import {ImageOff} from "lucide-react";
import {Button} from "@/components/ui/button.jsx";
import {FieldError, Input, Label} from "@/components/ui/field.jsx";
import {Working} from "@/components/ui/text.jsx";
import {cn} from "@/lib/utils.js";
import {MAX_PICTURE_BYTES, PICTURE_TYPES, sharp, shownPicture, usePictureSizes} from "@/features/briefing/mailPictures.js";

// the file as base64, without the "data:image/png;base64," before it, and as an address to show it
const readFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({preview: reader.result, data: String(reader.result).replace(/^data:[^,]*,/, '')});
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
});

// small, beside the title of the story in the list of the e-mail
export const Thumbnail = ({src}) => src
    ? <img src={src} alt="" referrerPolicy="no-referrer" className="h-9 w-14 shrink-0 border border-rule bg-paper-deep object-cover"/>
    : <span className="flex h-9 w-14 shrink-0 items-center justify-center border border-dashed border-rule text-ink-mute"><ImageOff aria-hidden className="size-4"/></span>;

// story: {storyId, title, thumbnail, thumbnailSource}; choice: undefined (its own), {kind: 'none'},
// {kind: 'url', url}, {kind: 'file', data, preview, name}; onChoose(choice | undefined);
// pictures: [{url, source}], the pictures of the story, null while they are asked. Only the ones wide
// enough for the e-mail are offered, the others left out once the browser has loaded them
export const MailPicture = ({story, choice, pictures, onChoose, onClose}) => {
    const [address, setAddress] = useState(choice?.kind === 'url' ? choice.url : '');
    const [error, setError] = useState(null);
    const file = useRef(null);
    const current = shownPicture(story, choice);
    const sizes = usePictureSizes((pictures ?? []).map(picture => picture.url));
    const offered = (pictures ?? []).filter(picture => sharp(sizes, picture.url));
    const measuring = (pictures ?? []).some(picture => sizes[picture.url] === undefined);
    const leftOut = (pictures ?? []).filter(picture => sizes[picture.url] !== undefined).length - offered.length;

    // a picture of the story: its own one is its own again
    const pick = (url) => onChoose(url === story.thumbnail ? undefined : {kind: 'url', url});

    const takeAddress = () => {
        const url = address.trim();
        if (!/^https?:\/\/\S+$/i.test(url)) {
            setError('The address of an image, like https://example.org/photo.jpg');
            return;
        }
        setError(null);
        onChoose({kind: 'url', url});
    };

    const takeFile = async (event) => {
        const picked = event.target.files?.[0];
        event.target.value = '';
        if (!picked) return;
        if (!PICTURE_TYPES.includes(picked.type)) {
            setError('A JPEG, PNG, GIF or WebP image.');
            return;
        }
        if (picked.size > MAX_PICTURE_BYTES) {
            setError(`An image of ${MAX_PICTURE_BYTES / 1024 / 1024} MB at most.`);
            return;
        }
        setError(null);
        onChoose({kind: 'file', name: picked.name, ...await readFile(picked)});
    };

    return (
        <div role="group" aria-label={`The picture of “${story.title}”`} className="mt-2 border border-rule p-3">
            <p className="kicker">Its picture in the e-mail</p>
            {pictures === null || (measuring && offered.length === 0)
                ? <Working>Finding the pictures of the story…</Working>
                : (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {offered.map(picture => (
                            <button key={picture.url} type="button" onClick={() => pick(picture.url)} aria-pressed={current === picture.url}
                                    aria-label={`The picture of ${picture.source}`} title={picture.source}
                                    className={cn('cursor-pointer border p-0.5', current === picture.url ? 'border-ink' : 'border-transparent hover:border-rule')}>
                                <img src={picture.url} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-14 w-20 bg-paper-deep object-cover"/>
                            </button>
                        ))}
                        <button type="button" onClick={() => onChoose({kind: 'none'})} aria-pressed={current === null}
                                className={cn('flex h-[3.75rem] w-[5.25rem] cursor-pointer flex-col items-center justify-center gap-1 border text-ink-mute',
                                    current === null ? 'border-ink text-ink' : 'border-dashed border-rule hover:border-ink')}>
                            <ImageOff aria-hidden className="size-4"/>
                            <span className="text-[0.75rem]">No picture</span>
                        </button>
                    </div>
                )}
            {pictures !== null && !measuring && leftOut > 0 && (
                <p className="caption mt-2">
                    {offered.length === 0
                        ? 'No picture of the story is wide enough to stay sharp in the e-mail.'
                        : `Left out: ${leftOut} ${leftOut === 1 ? 'picture' : 'pictures'} too small to stay sharp in the e-mail.`}
                </p>
            )}
            {choice?.kind === 'file' && <p className="caption mt-2">Your image: {choice.name}, joined to the e-mail.</p>}

            <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1 basis-56">
                    <Label htmlFor={`picture-url-${story.storyId}`}>Or the address of an image</Label>
                    <Input id={`picture-url-${story.storyId}`} type="url" inputMode="url" placeholder="https://"
                           value={address} onChange={event => setAddress(event.target.value)}
                           onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); takeAddress(); } }}/>
                </div>
                <Button size="sm" onClick={takeAddress} disabled={!address.trim()}>Use it</Button>
                <Button size="sm" onClick={() => file.current?.click()}>From your computer</Button>
                <input ref={file} type="file" accept={PICTURE_TYPES.join(',')} className="hidden" onChange={takeFile}
                       aria-label={`An image of yours for “${story.title}”`}/>
            </div>
            {error && <FieldError>{error}</FieldError>}

            <div className="mt-3 flex flex-wrap gap-2">
                {choice !== undefined && !choice.small && !choice.auto && <Button size="sm" variant="subtle" onClick={() => onChoose(undefined)}>Back to its own</Button>}
                <Button size="sm" variant="primary" onClick={onClose}>Done</Button>
            </div>
        </div>
    );
};
