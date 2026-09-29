//
//  Author: Fabian Rostello
//  Date: 29.09.2026
//  File: profileWords.js
//  Description: What a profile is written with, on the profile page and when the account is created
//

export const LANGUAGES = {en: 'English', fr: 'French', es: 'Spanish', de: 'German', it: 'Italian'};
export const LANGUAGE_OPTIONS = Object.entries(LANGUAGES).map(([value, label]) => ({value, label}));
export const MIN_PROFILE_TEXT = 20;         // the server refuses less: too little to read interests in

// the language of the browser, "fr" of "fr-CH"
export const browserLanguage = () => (typeof navigator !== 'undefined' ? navigator.language : 'en')?.slice(0, 2);

// the language a reader most likely writes in, among the ones they read: the browser's when they read
// it, else the first. The first alone searched "arbitrage football" in English for a French reader
// and found an insurance paper
export const likelyLanguage = (languages, fallback = 'en') => {
    if (!languages?.length) return fallback;
    return languages.includes(browserLanguage()) ? browserLanguage() : languages[0];
};

export const PLACEHOLDER ="I follow rugby: the Top 14, the Six Nations and the transfers. I also love fashion: new collections, brands, shows. " +
    "I don't want football or celebrity gossip.";
