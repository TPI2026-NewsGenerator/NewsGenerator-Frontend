//
//  Author: Fabian Rostello
//  Date: 02.11.2026
//  File: readAnswer.js
//  Description: The answer of the API as data. Behind the server stand Caddy and the tunnel of Cloudflare,
//               which answer with a page of their own (HTML) when the server restarts, does not answer in
//               time (524 after about 100 s) or refuses: the page is not data, and parsing it said
//               "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"
//

// {error} for an answer that is not JSON, saying what came, else the data
export const readAnswer = async (response) => {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch {
        const page = text.trimStart().startsWith('<');
        return {error: `The server answered ${response.status}${page ? ' with a page, not data' : ''}: it may be restarting or busy. Try again in a moment.`};
    }
};
