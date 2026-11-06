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

// The names of the countries of a card to show, in 'locale': all of them, even when its title names them (the user, 06.11.2026: the
// rule of 18.10.2026 that left a country out when the title named it hid the country of cards found in the editor)
export const countryNames = (countries = [], {locale = 'en'} = {}) => countries.map(code => countryName(code, locale));
