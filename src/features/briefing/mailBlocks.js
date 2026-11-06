//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: mailBlocks.js
//  Description: What a story can carry in the e-mail, block by block (the user, 05.11.2026): the picture, the countries, the badges
//               (told by, contested, officially confirmed, unconfirmed), who it is about, the AI analysis, the angles, the affair and
//               its coverage. Which of them a story has, which are on at first, and the presets that set them for every story
//

// key: the block; label: what the editor says; badge: one of the badges of the line under the title. picture and countries are
// kept by the choices of the picture and of the countries (a picture none, no country), the others by the 'blocks' the server takes
export const BLOCKS = [
    {key: 'picture', label: 'Picture'},
    {key: 'countries', label: 'Countries'},
    {key: 'media', label: 'Told by', badge: true},
    {key: 'contested', label: 'Contested', badge: true},
    {key: 'official', label: 'Officially confirmed', badge: true},
    {key: 'unconfirmed', label: 'Unconfirmed', badge: true},
    {key: 'names', label: 'Who it is about'},
    {key: 'analysis', label: 'AI analysis'},
    {key: 'angles', label: 'Angles'},
    {key: 'affair', label: 'This affair'},
    {key: 'coverage', label: 'Coverage'},
];

// what the server is told, for each story: the e-mail of before (its words of who denies, the official sources, the angles, the
// analysis) and the badges and who it is about at first; the affair and its coverage only when the reader asks for them
export const DEFAULT_BLOCKS = {
    media: true, contested: true, official: true, unconfirmed: true, names: true, analysis: true, angles: true, affair: false, coverage: false,
};

// the keys the server takes ('blocks' of the e-mail), the picture and the countries having their own
export const SERVER_BLOCKS = Object.keys(DEFAULT_BLOCKS);

// the presets of the editor: the blocks each one puts on, for every story that has them
const SHORT = ['media', 'contested', 'official', 'unconfirmed'];
const STANDARD = [...SHORT, 'picture', 'countries', 'names', 'analysis'];
export const PRESETS = [
    {value: 'short', label: 'Short', means: 'Title, text and badges', on: SHORT},
    {value: 'standard', label: 'Standard', means: 'Adds picture, countries, who it is about and the analysis', on: STANDARD},
    {value: 'everything', label: 'Everything', means: 'Adds the angles, the affair and its coverage', on: BLOCKS.map(block => block.key)},
];

const lines = (analysis) => analysis ? ['why', 'next', 'timeline'].reduce((sum, part) => sum + (analysis[part]?.length ?? 0), 0) : 0;

// does the story have this block: what it has none of is not offered
// story: {thumbnail, countries, media, contested, official, hedged, names, analysis, angles, affair, hasArticles}
export const hasBlock = (story, key) => {
    switch (key) {
        case 'picture': return true;
        case 'countries': return (story.countries ?? []).length > 0;
        case 'media': return (story.media ?? 0) > 0;
        case 'contested': return (story.contested ?? []).length > 0;
        case 'official': return (story.official ?? []).length > 0;
        case 'unconfirmed': return Boolean(story.hedged);
        case 'names': return (story.names ?? []).length > 0;
        case 'analysis': return lines(story.analysis) > 0;
        case 'angles': return (story.angles ?? []).length > 0;
        case 'affair': return Boolean(story.affair);
        case 'coverage': return Boolean(story.hasArticles);
        default: return false;
    }
};

// how many of the stories have this block, and how many of them have it on: the column of the matrix, the line of "all the stories"
// isOn(story, key): see useMailDraft
export const countOf = (stories, key, isOn) => {
    const having = stories.filter(story => hasBlock(story, key));
    return {having: having.length, on: having.filter(story => isOn(story, key)).length};
};
