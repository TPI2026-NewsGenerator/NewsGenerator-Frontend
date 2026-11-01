//
//  Author: Fabian Rostello
//  Date: 02.11.2026
//  File: readAnswer.js
//  Description: The answer of the API as data. Behind the server stand Caddy and the tunnel of Cloudflare,
//               which answer with a page of their own (HTML) when the server restarts, does not answer in
//               time (524 after about 100 s) or refuses: the page is not data, and parsing it said
//               "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"
//

// {error, status} for an answer that is not JSON, saying what came, else the data. A call that failed carries
// its status too, for a client that decides whether to ask again (a 502 or a 524 is worth asking again, a 403 is not)
export const readAnswer = async (response) => {
    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        const page = text.trimStart().startsWith('<');
        return {error: `The server answered ${response.status}${page ? ' with a page, not data' : ''}: it may be restarting or busy. Try again in a moment.`,
            status: response.status};
    }
    return !response.ok && data && typeof data === 'object' && !Array.isArray(data) ? {...data, status: response.status} : data;
};
