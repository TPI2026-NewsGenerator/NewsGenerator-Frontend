//
//  Author: Fabian Rostello
//  Date: 03.11.2026
//  File: wordDiff.js
//  Description: What a rewrite of a title took out and put in, word by word, to show the reader a proposal against
//               the title it comes from (the neutral title of the editor of the e-mail)
//

// a word as compared: in small letters, without accents nor the punctuation around it ("Europe!" is "europe")
const keyOf = (word) => word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '') || word;

// before, after: two texts. Answers {before, after}: the words of each as [{text, changed}], changed for a word the
// other does not have at that place (the longest run of words they share is kept, as a diff does)
export const wordDiff = (before, after) => {
    const a = String(before ?? '').split(/\s+/).filter(Boolean);
    const b = String(after ?? '').split(/\s+/).filter(Boolean);
    const keys = {a: a.map(keyOf), b: b.map(keyOf)};
    // length of the longest common run of words from i and j to the end
    const run = Array.from({length: a.length + 1}, () => new Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) {
        for (let j = b.length - 1; j >= 0; j--) {
            run[i][j] = keys.a[i] === keys.b[j] ? run[i + 1][j + 1] + 1 : Math.max(run[i + 1][j], run[i][j + 1]);
        }
    }
    const left = a.map(text => ({text, changed: true}));
    const right = b.map(text => ({text, changed: true}));
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        if (keys.a[i] === keys.b[j]) {
            left[i].changed = false;
            right[j].changed = false;
            i++;
            j++;
        } else if (run[i + 1][j] >= run[i][j + 1]) i++;
        else j++;
    }
    return {before: left, after: right};
};
