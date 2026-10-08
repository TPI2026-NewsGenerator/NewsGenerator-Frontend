//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: mailPictures.js
//  Description: The picture a reader chose for a story of the e-mail: what it shows, what the server
//               is sent (see MailPicture.jsx)
//

// as the server takes them (server/services/utils/mail-pictures.js)
export const MAX_PICTURE_BYTES = 2 * 1024 * 1024;
export const MAX_FILES_BYTES = 6 * 1024 * 1024;
export const PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// a choice: undefined (its own), {kind: 'none'}, {kind: 'url', url}, {kind: 'file', data, preview, name}.
// What it shows: the address of the image, null when there is none
export const shownPicture = (story, choice) => choice === undefined ? story.thumbnail
    : choice.kind === 'none' ? null
    : choice.kind === 'url' ? choice.url
    : choice.preview;

// what the server is sent for a choice (see BriefingApi.email)
export const sentPicture = (choice) => choice.kind === 'none' ? null : choice.kind === 'url' ? {url: choice.url} : {data: choice.data};

// the bytes of a file sent in base64
export const fileBytes = (choice) => choice?.kind === 'file' ? choice.data.length * 3 / 4 : 0;
