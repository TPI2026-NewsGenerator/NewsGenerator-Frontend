//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: analysis.js
//  Description: What the page knows of the AI analysis of a briefing, apart from the cards that show it
//

// analysis: {status: 'running' | 'ready' | 'failed', picked, cards}, null for a briefing written before it (15.10.2026); one of the first
// days, of another shape (changed, risks), is left aside: there is nothing to say of it
export const hasAnalysisNote = (analysis) => Boolean(analysis) && !(analysis.status === 'ready' && !analysis.cards);
