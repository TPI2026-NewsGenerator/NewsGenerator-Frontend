//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: mailPictures.js
//  Description: The picture a reader chose for a story of the e-mail: what it shows, what the server
//               is sent (see MailPicture.jsx)
//

import {useEffect, useState} from "react";

// as the server takes them (server/services/utils/mail-pictures.js)
export const MAX_PICTURE_BYTES = 2 * 1024 * 1024;
export const MAX_FILES_BYTES = 6 * 1024 * 1024;
export const PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// The width of the picture in the e-mail (server/services/utils/briefing-mail.js): a narrower one is
// stretched and blurred there. 49 of the 289 pictures of 6 briefings were, some 72 pixels wide
// (bench/picture-sizes.mjs, 10.10.2026)
export const MIN_PICTURE_WIDTH = 560;
const MEASURE_TIMEOUT = 15000;

// url -> the promise of its {width, height} as the browser loads it, 0 x 0 when it does not load: each
// image once
const NOT_LOADED = {width: 0, height: 0};
const measured = new Map();
const sizeOf = (url) => {
    if (!measured.has(url)) {
        measured.set(url, new Promise(resolve => {
            const image = new Image();
            const timer = setTimeout(() => resolve(NOT_LOADED), MEASURE_TIMEOUT);
            image.onload = () => { clearTimeout(timer); resolve({width: image.naturalWidth, height: image.naturalHeight}); };
            image.onerror = () => { clearTimeout(timer); resolve(NOT_LOADED); };
            image.referrerPolicy = 'no-referrer';
            image.src = url;
        }));
    }
    return measured.get(url);
};

// {url: {width, height}} of the images of the web among urls, each there once it is loaded (0 x 0 when
// it does not)
export const usePictureSizes = (urls) => {
    const [sizes, setSizes] = useState({});
    const key = [...new Set(urls.filter(url => /^https?:\/\//i.test(url ?? '')))].join('\n');
    useEffect(() => {
        let live = true;
        for (const url of key ? key.split('\n') : []) {
            sizeOf(url).then(size => { if (live) setSizes(current => current[url] === size ? current : {...current, [url]: size}); });
        }
        return () => { live = false; };
    }, [key]);
    return sizes;
};

// wide enough for the e-mail; false while it is not known
export const sharp = (sizes, url) => (sizes[url]?.width ?? 0) >= MIN_PICTURE_WIDTH;
// measured too narrow for the e-mail, or that does not load; false while it is not known
export const tooSmall = (sizes, url) => sizes[url] !== undefined && !sharp(sizes, url);

// the best of pictures ([{url}]) for the e-mail: wide enough, lying (a standing one fills the screen of
// a phone) before standing, the widest first. undefined when none is
export const bestPicture = (pictures, sizes) => pictures
    .filter(picture => sharp(sizes, picture.url))
    .map(picture => ({url: picture.url, lying: sizes[picture.url].width >= sizes[picture.url].height, width: sizes[picture.url].width}))
    .sort((a, b) => Number(b.lying) - Number(a.lying) || b.width - a.width)[0]?.url;

// a choice: undefined (its own), {kind: 'none'}, {kind: 'url', url}, {kind: 'file', data, preview,
// name}. Its own too small: {kind: 'url', url, auto: true}, the best other of the story, else
// {kind: 'none', small: true}.
// What it shows: the address of the image, null when there is none
export const shownPicture = (story, choice) => choice === undefined ? story.thumbnail
    : choice.kind === 'none' ? null
    : choice.kind === 'url' ? choice.url
    : choice.preview;

// what the server is sent for a choice (see BriefingApi.email)
export const sentPicture = (choice) => choice.kind === 'none' ? null : choice.kind === 'url' ? {url: choice.url} : {data: choice.data};

// the bytes of a file sent in base64
export const fileBytes = (choice) => choice?.kind === 'file' ? choice.data.length * 3 / 4 : 0;
