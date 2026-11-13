//
//  Author: Fabian Rostello
//  Date: 13.11.2026
//  File: fifa-lean.test.jsx
//  Description: The mock of "which candidate an association leans toward" (an association has one vote): the field `lean` of the members and of the sheet, and the route
//               POST /fifa/leans of the server (answerLean) as the mock does it. The page no longer calls the route (13.11.2026: the block "Which candidate does {country} lean
//               towards?" is gone, a reader votes in the detail of the candidate selected in the strip, see fifa-cards.test.jsx and fifa-vote.test.jsx); the server keeps it,
//               and the page derives the candidate it leans toward from the positions it draws (leanOf, for the list: see fifa-positions.test.js)
//
//  The associations, the readers and the answers are the invented ones of bench/fifa/mock-data.mjs
//

import {describe, expect, it} from 'vitest';
import {ALL_LEVELS, MOCK_SUBJECTS, answerLean, buildMock} from '../bench/fifa/mock-data.mjs';

describe('the mock: which candidate an association leans toward', () => {
    it('should say it in the map and in the sheet: the candidate shown, who set it, several, none', () => {
        const members = buildMock().map.members;
        const lean = (fifa) => members.find(member => member.fifa === fifa).lean;
        expect(lean('IND')).toEqual({subject_qid: 'QMOCK1', source: 'news', conflicting: []});
        expect(lean('NGA')).toEqual({subject_qid: 'QMOCK1', source: 'reader', conflicting: []});
        expect(lean('ESP')).toEqual({subject_qid: null, source: 'news', conflicting: ['QMOCK1', 'QMOCK2']});
        expect(lean('GER')).toBeNull();
    });

    it('should set the association for the candidate chosen and "no position" on the others it was shown supporting, never touching an opposition', () => {
        const given = [];
        const mock = buildMock();
        const esp = mock.map.members.find(member => member.fifa === 'ESP').qid;
        const first = answerLean({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: esp, subject: 'QMOCK2'}, by: 'reader'});
        expect(first.written).toBe(2);
        expect(first.positions.QMOCK2.human).toMatchObject({value: 'for', by: 'reader'});
        expect(first.positions.QMOCK1.human).toMatchObject({value: 'unknown', by: 'reader'});
        expect(first.lean).toEqual({subject_qid: 'QMOCK2', source: 'reader', conflicting: []});
        // a choice that already stands writes nothing
        expect(answerLean({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: esp, subject: 'QMOCK2'}, by: 'reader'}).written).toBe(0);
        // an opposition is never touched: Norway is against A (probable), the reader leans it toward B
        const nor = mock.map.members.find(member => member.fifa === 'NOR').qid;
        const second = answerLean({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: nor, subject: 'QMOCK2'}, by: 'reader'});
        expect(second.written).toBe(1);
        expect(second.positions.QMOCK1.human).toBeNull();
        expect(second.positions.QMOCK1.position).toBe('non_soutien_probable');
        // "none": no position on the candidate it was shown supporting
        const ind = mock.map.members.find(member => member.fifa === 'IND').qid;
        expect(answerLean({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: ind, subject: 'none'}, by: 'reader'}).lean).toBeNull();
        // "withdraw": everything the reader wrote on the association goes
        const back = answerLean({levels: ALL_LEVELS, candidates: MOCK_SUBJECTS, given, body: {member: esp, subject: 'withdraw'}, by: 'reader'});
        expect(back.written).toBe(2);
        expect(back.lean).toEqual({subject_qid: null, source: 'news', conflicting: ['QMOCK1', 'QMOCK2']});
    });
});
