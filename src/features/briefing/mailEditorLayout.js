//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: mailEditorLayout.js
//  Description: The way the editor of the e-mail is laid out, chosen in the settings (the user, 05.11.2026) and kept on the account of the
//               reader (see features/preferences): three frames (the order, the e-mail as it will be sent, what the story carries), or a
//               matrix of the stories and their blocks
//

import {preference} from "@/features/preferences/preferences.js";

export const LAYOUTS = [
    {value: 'frames', label: 'Three frames', means: 'The order of the stories, the e-mail as it will be sent, and what the story chosen carries.'},
    {value: 'matrix', label: 'Matrix', means: 'The stories in rows and what they carry in columns: the same choice for every story in one look.'},
];
export const DEFAULT_LAYOUT = 'frames';

// the layout the reader chose, kept in the browser and on the account
export const layoutPreference = preference({
    name: 'layout',
    key: 'newsgenerator.mail-editor',
    fallback: DEFAULT_LAYOUT,
    parse: (text) => LAYOUTS.some(layout => layout.value === text) ? text : undefined,
});
export const keptLayout = () => layoutPreference.kept();
export const keepLayout = (layout) => layoutPreference.keep(layout);
