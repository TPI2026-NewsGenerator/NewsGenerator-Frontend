//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: mailEditorLayout.js
//  Description: The way the editor of the e-mail is laid out, chosen in the settings (the user, 05.11.2026) and kept in the browser:
//               three frames (the order, the e-mail as it will be sent, what the story carries), or a matrix of the stories and
//               their blocks
//

export const LAYOUTS = [
    {value: 'frames', label: 'Three frames', means: 'The order of the stories, the e-mail as it will be sent, and what the story chosen carries.'},
    {value: 'matrix', label: 'Matrix', means: 'The stories in rows and what they carry in columns: the same choice for every story in one look.'},
];
export const DEFAULT_LAYOUT = 'frames';
const KEY = 'newsgenerator.mail-editor';

// the layout the reader chose, kept in the browser
export const keptLayout = () => {
    try {
        const value = localStorage.getItem(KEY);
        return LAYOUTS.some(layout => layout.value === value) ? value : DEFAULT_LAYOUT;
    } catch {
        return DEFAULT_LAYOUT;
    }
};
export const keepLayout = (layout) => {
    try {
        localStorage.setItem(KEY, layout);
    } catch {
        // kept for the page only
    }
};
