//
//  Author: Fabian Rostello
//  Date: 09.10.2026
//  File: profile-funnel.test.jsx
//  Description: A profile written with the AI: a few words, the questions of each round answered by
//               ticking and writing, sent back each time, then the profile it writes given to the page
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';

vi.mock('@/features/briefing/api/briefingApi.js', () => ({
    ProfileApi: {funnelQuestions: vi.fn(), funnelText: vi.fn()},
}));

const {ProfileApi} = await import('@/features/briefing/api/briefingApi.js');
const {ProfileFunnel} = await import('@/features/profiles/ProfileFunnel.jsx');

const ROUND_1 = [
    {question: 'Quels tournois ?', options: ['Grand Chelem', 'Masters 1000']},
    {question: "D'autres sujets ?", options: ['Politique', 'Sciences']},
];
const ROUND_2 = [{question: 'Quelle politique ?', options: ['Votations', 'Élections']}];

const start = (onWritten = vi.fn()) => {
    render(<ProfileFunnel language="fr" onWritten={onWritten} onCancel={vi.fn()}/>);
    fireEvent.change(screen.getByLabelText('In a few words, what do you want to follow?'), {target: {value: '  Le tennis. '}});
    fireEvent.click(screen.getByRole('button', {name: 'Continue'}));
    return onWritten;
};

describe('ProfileFunnel', () => {
    afterEach(() => vi.clearAllMocks());

    it('should send back each round answered, then give the profile written', async () => {
        ProfileApi.funnelQuestions
            .mockResolvedValueOnce({enough: false, questions: ROUND_1, maxRounds: 3})
            .mockResolvedValueOnce({enough: false, questions: ROUND_2, maxRounds: 3});
        ProfileApi.funnelText.mockResolvedValue({text: 'Je suis le Grand Chelem et la politique suisse.'});
        const onWritten = start();

        expect(await screen.findByText('Questions, round 1 of 3')).toBeInTheDocument();
        expect(ProfileApi.funnelQuestions).toHaveBeenLastCalledWith({start: 'Le tennis.', rounds: [], language: 'fr'});
        fireEvent.click(screen.getByLabelText('Grand Chelem'));
        fireEvent.change(screen.getByLabelText("D'autres sujets ?: in your own words"), {target: {value: ' la politique suisse '}});
        fireEvent.click(screen.getByRole('button', {name: 'Next questions'}));

        expect(await screen.findByText('Questions, round 2 of 3')).toBeInTheDocument();
        const round1 = [
            {question: 'Quels tournois ?', options: ['Grand Chelem', 'Masters 1000'], chosen: ['Grand Chelem'], free: ''},
            {question: "D'autres sujets ?", options: ['Politique', 'Sciences'], chosen: [], free: 'la politique suisse'},
        ];
        expect(ProfileApi.funnelQuestions).toHaveBeenLastCalledWith({start: 'Le tennis.', rounds: [round1], language: 'fr'});

        fireEvent.click(screen.getByLabelText('Votations'));
        fireEvent.click(screen.getByRole('button', {name: 'Write my profile now'}));
        await waitFor(() => expect(onWritten).toHaveBeenCalledWith('Je suis le Grand Chelem et la politique suisse.'));
        expect(ProfileApi.funnelText).toHaveBeenCalledWith({start: 'Le tennis.', language: 'fr', rounds: [
            round1, [{question: 'Quelle politique ?', options: ['Votations', 'Élections'], chosen: ['Votations'], free: ''}],
        ]});
    });

    it('should write the profile at once when the AI has enough, and on the last round', async () => {
        ProfileApi.funnelQuestions
            .mockResolvedValueOnce({enough: false, questions: ROUND_2, maxRounds: 2})
            .mockResolvedValueOnce({enough: true, questions: [], maxRounds: 2});
        ProfileApi.funnelText.mockResolvedValue({text: 'Le tennis.'});
        const onWritten = start();

        await screen.findByText('Questions, round 1 of 2');
        fireEvent.click(screen.getByRole('button', {name: 'Next questions'}));
        await waitFor(() => expect(onWritten).toHaveBeenCalledWith('Le tennis.'));
        expect(ProfileApi.funnelQuestions).toHaveBeenCalledTimes(2);
    });

    it('should tick all the choices of a question, then untick them all', async () => {
        ProfileApi.funnelQuestions.mockResolvedValue({enough: false, questions: ROUND_1, maxRounds: 3});
        start();

        fireEvent.click(await screen.findByRole('button', {name: 'Tick all: Quels tournois ?'}));
        expect(screen.getByLabelText('Grand Chelem')).toBeChecked();
        expect(screen.getByLabelText('Masters 1000')).toBeChecked();
        expect(screen.getByLabelText('Politique')).not.toBeChecked();      // only the choices of its question

        fireEvent.click(screen.getByRole('button', {name: 'Untick all: Quels tournois ?'}));
        expect(screen.getByLabelText('Grand Chelem')).not.toBeChecked();
        expect(screen.getByLabelText('Masters 1000')).not.toBeChecked();
    });

    it('should leave the focus in the field the reader types in', async () => {
        ProfileApi.funnelQuestions.mockResolvedValue({enough: false, questions: ROUND_1, maxRounds: 3});
        start();

        expect(await screen.findByText('Questions, round 1 of 3')).toHaveFocus();
        const field = screen.getByLabelText("D'autres sujets ?: in your own words");
        field.focus();
        fireEvent.change(field, {target: {value: 'la'}});
        fireEvent.change(field, {target: {value: 'la politique'}});
        expect(field).toHaveFocus();
    });

    it('should say what went wrong and keep what the reader wrote', async () => {
        ProfileApi.funnelQuestions.mockResolvedValue({error: 'Too many questions asked from here, try again in an hour.'});
        start();

        expect(await screen.findByText('Too many questions asked from here, try again in an hour.')).toBeInTheDocument();
        expect(screen.getByLabelText('In a few words, what do you want to follow?')).toHaveValue('  Le tennis. ');
    });

    it('should not ask the AI for less than a word', () => {
        render(<ProfileFunnel language="fr" onWritten={vi.fn()}/>);
        fireEvent.change(screen.getByLabelText('In a few words, what do you want to follow?'), {target: {value: 'ab'}});
        expect(screen.getByRole('button', {name: 'Continue'})).toBeDisabled();
    });
});
