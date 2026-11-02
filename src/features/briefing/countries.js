//
//  Author: Fabian Rostello
//  Date: 18.10.2026
//  File: countries.js
//  Description: The names of the countries of a card (item.countries, codes ISO 3166-1, the main first),
//               for a reader who does not know who it names: in English, as the page (server
//               country-names.js for the e-mail)
//

const names = new Map();
// the name of a country in a language: countryName('ZM', 'fr') is "Zambie". The code itself when it
// names none
export const countryName = (code, locale = 'en') => {
    try {
        if (!names.has(locale)) names.set(locale, new Intl.DisplayNames([locale], {type: 'region', fallback: 'code'}));
        return names.get(locale).of(code);
    } catch {
        return code;
    }
};

// codes that are no country: the European Union, the eurozone, the United Nations, outlying Oceania,
// pseudo-locales, unknown (as server country-names.js)
const NOT_COUNTRIES = new Set(['EU', 'EZ', 'UN', 'QO', 'XA', 'XB', 'ZZ']);
const regionOf = (code) => {
    try {
        return new Intl.Locale(`und-${code}`).region;
    } catch {
        return null;
    }
};

// Every country the e-mail can name, by name in 'locale': [{code, name}]. The codes Intl has a name for, an
// old code (FX, DD, SU) left to the one of today
export const allCountries = (locale = 'en') => {
    const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
    return letters.flatMap(a => letters.map(b => a + b))
        .filter(code => !NOT_COUNTRIES.has(code) && regionOf(code) === code && countryName(code, locale) !== code)
        .map(code => ({code, name: countryName(code, locale)}))
        .sort((a, b) => a.name.localeCompare(b.name, locale));
};

// a text in small letters, without accents, its words between spaces
const plain = (text) => ` ${String(text ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;

// The names of the countries of a card to show, in 'locale'; none when its titles name every one of them
// already, in one of 'languages' (a word starting so counts: "zambien" names Zambia)
export const countryNames = (countries = [], {titles = [], languages = [], locale = 'en'} = {}) => {
    if (countries.length === 0) return [];
    const written = titles.filter(Boolean).map(plain);
    const tongues = [...new Set([locale, ...languages, 'en'].filter(Boolean))];
    const named = (code) => tongues.some(language => {
        const name = plain(countryName(code, language)).trimEnd();
        return name.trim().length > 0 && written.some(title => title.includes(name));
    });
    return countries.every(named) ? [] : countries.map(code => countryName(code, locale));
};
