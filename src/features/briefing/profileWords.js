//
//  Author: Fabian Rostello
//  Date: 29.09.2026
//  File: profileWords.js
//  Description: What a profile is written with, on the profile page and when the account is created
//

export const LANGUAGES = {en: 'English', fr: 'French', es: 'Spanish', de: 'German', it: 'Italian'};
export const LANGUAGE_OPTIONS = Object.entries(LANGUAGES).map(([value, label]) => ({value, label}));
export const MIN_PROFILE_TEXT = 20;         // the server refuses less: too little to read interests in
export const PLACEHOLDER = "I follow rugby: the Top 14, the Six Nations and the transfers. I also love fashion: new collections, brands, shows. " +
    "I don't want football or celebrity gossip.";
