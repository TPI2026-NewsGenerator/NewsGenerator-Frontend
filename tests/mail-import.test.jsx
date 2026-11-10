//
//  Author: Fabian Rostello
//  Date: 10.11.2026
//  File: mail-import.test.jsx
//  Description: A news of another profile's briefing imported from the editor of the e-mail: the profiles of the account, the news of the one chosen,
//               the ones already here, the limit, and what a click does
//

import '@testing-library/jest-dom';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MailImport} from '@/features/briefing/components/MailImport.jsx';

const news = (number, storyId, title, changes = {}) => ({storyId, number, title, source: `media${storyId}.fr`, language: 'fr', thumbnail: null, imported: false, inBriefing: false, ...changes});
const ANSWER = {
    added: 0, max: 10,
    profiles: [
        {idProfile: 4, profile: 'Chris', briefingId: 508, createdAt: '2026-11-10T07:12:00.000Z', news: [news(1, 30, 'Wenger and the FIFA', {similarTo: 4}), news(2, 31, 'The VAR holds back', {inBriefing: true}), news(3, -2, 'A page added', {imported: true})]},
        {idProfile: 5, profile: 'Roberto', briefingId: 509, createdAt: '2026-11-10T07:08:00.000Z', news: [news(1, 40, 'Lardot and the goal')]},
    ],
};
const added = (story, similar = null) => ({storyId: story + 1000, title: `Imported ${story}`, source: 'hln.be', similar});
const draft = (changes = {}) => ({profilesNews: vi.fn(async () => ANSWER), importNews: vi.fn(async (from, story) => added(story)), canFold: true, foldNews: vi.fn(async () => true), ...changes});
const open = async (props) => {
    render(<MailImport {...props}/>);
    fireEvent.click(screen.getByRole('button', {name: 'Import from a profile'}));
    return screen;
};

describe('MailImport', () => {
    it('should list the profiles and the news of the first, in their order, once the panel opens', async () => {
        const mail = draft();
        await open({draft: mail});
        expect(await screen.findByRole('button', {name: 'Chris'})).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', {name: 'Roberto'})).toHaveAttribute('aria-pressed', 'false');
        const list = screen.getByRole('list', {name: 'The news of Chris'});
        expect(within(list).getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual([
            'Import “Wenger and the FIFA” into the e-mail', 'Import “The VAR holds back” into the e-mail', 'Import “A page added” into the e-mail']);
        // the hour is the reader's own: the time zone of the machine
        expect(screen.getByText(/Its briefing of 10 Nov, \d\d:\d\d: 3 news\./)).toBeInTheDocument();
        expect(mail.profilesNews).toHaveBeenCalledTimes(1);
    });

    it('should show the news of another profile when its name is clicked', async () => {
        await open({draft: draft()});
        fireEvent.click(await screen.findByRole('button', {name: 'Roberto'}));
        expect(screen.getByRole('button', {name: 'Roberto'})).toHaveAttribute('aria-pressed', 'true');
        expect(within(screen.getByRole('list', {name: 'The news of Roberto'})).getAllByRole('button')).toHaveLength(1);
        expect(screen.queryByText('Wenger and the FIFA')).toBeNull();
    });

    it('should import the news clicked, say it is added, and keep the panel open for the next one', async () => {
        const mail = draft();
        await open({draft: mail});
        fireEvent.click(await screen.findByRole('button', {name: 'Import “Wenger and the FIFA” into the e-mail'}));
        await waitFor(() => expect(mail.importNews).toHaveBeenCalledWith(508, 30));
        const row = await screen.findByRole('button', {name: 'Import “Wenger and the FIFA” into the e-mail'});
        await waitFor(() => expect(within(row).getByText('Added')).toBeInTheDocument());
        expect(row).toBeDisabled();
        // the next one, of a news the profile had added itself
        fireEvent.click(screen.getByRole('button', {name: 'Import “A page added” into the e-mail'}));
        await waitFor(() => expect(mail.importNews).toHaveBeenCalledWith(508, -2));
        expect(within(screen.getByRole('button', {name: 'Import “A page added” into the e-mail'})).getByText(/added by the profile/)).toBeInTheDocument();
    });

    it('should say a news tells the same news as a card here, and import it all the same: only the exact same card is refused', async () => {
        const mail = draft();
        await open({draft: mail});
        const close = await screen.findByRole('button', {name: 'Import “Wenger and the FIFA” into the e-mail'});
        expect(within(close).getByText(/same news as 04 here/)).toBeInTheDocument();
        expect(within(close).queryByText('Already here')).toBeNull();
        expect(close).toBeEnabled();
        fireEvent.click(close);
        await waitFor(() => expect(mail.importNews).toHaveBeenCalledWith(508, 30));
    });

    it('should not offer the exact same card as one that is already in the briefing, and not import it', async () => {
        const mail = draft();
        await open({draft: mail});
        const here = await screen.findByRole('button', {name: 'Import “The VAR holds back” into the e-mail'});
        expect(here).toBeDisabled();
        expect(within(here).getByText('Already here')).toBeInTheDocument();
        fireEvent.click(here);
        expect(mail.importNews).not.toHaveBeenCalled();
    });

    it('should leave the news as it is when the page refused it (no answer): it can be tried again', async () => {
        const mail = draft({importNews: vi.fn(async () => null)});
        await open({draft: mail});
        const row = await screen.findByRole('button', {name: 'Import “Wenger and the FIFA” into the e-mail'});
        fireEvent.click(row);
        await waitFor(() => expect(mail.importNews).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(row).toBeEnabled());
        expect(within(row).getByText('Add')).toBeInTheDocument();
    });

    it('should stop offering news when the briefing has the most it takes', async () => {
        await open({draft: draft({profilesNews: vi.fn(async () => ({...ANSWER, added: 10}))})});
        expect(await screen.findByText(/10 news are added to this briefing: no more can be\./)).toBeInTheDocument();
        screen.getAllByRole('button', {name: /^Import “/}).forEach(button => expect(button).toBeDisabled());
    });

    it('should say so when no other profile has a briefing of the last days, and when the server cannot answer', async () => {
        const {unmount} = render(<MailImport draft={draft({profilesNews: vi.fn(async () => ({profiles: [], added: 0, max: 10}))})}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Import from a profile'}));
        expect(await screen.findByText(/No other profile of your account has a briefing of the last 7 days/)).toBeInTheDocument();
        unmount();
        render(<MailImport draft={draft({profilesNews: vi.fn(async () => { throw new Error('HTTP 500'); })})}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Import from a profile'}));
        expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 500');
    });

    it('should ask the briefings again each time the panel opens, and not while the e-mail is being sent', async () => {
        const mail = draft();
        const {rerender} = render(<MailImport draft={mail}/>);
        const button = screen.getByRole('button', {name: 'Import from a profile'});
        fireEvent.click(button);
        await screen.findByRole('button', {name: 'Chris'});
        fireEvent.keyDown(document.activeElement ?? document.body, {key: 'Escape'});
        await waitFor(() => expect(screen.queryByRole('button', {name: 'Chris'})).toBeNull());
        fireEvent.click(button);
        await screen.findByRole('button', {name: 'Chris'});
        expect(mail.profilesNews).toHaveBeenCalledTimes(2);
        rerender(<MailImport draft={mail} disabled/>);
        expect(screen.getByRole('button', {name: 'Import from a profile'})).toBeDisabled();
    });
});

describe('MailImport, a news that tells the same news as a card of the briefing', () => {
    const similar = {storyId: 10, number: 3, title: 'Wenger and the FIFA, by your profile', source: 'lesoir.be'};
    const importWithSimilar = async (changes = {}) => {
        const mail = draft({importNews: vi.fn(async (from, story) => added(story, similar)), ...changes});
        await open({draft: mail});
        fireEvent.click(await screen.findByRole('button', {name: 'Import “Wenger and the FIFA” into the e-mail'}));
        return mail;
    };

    it('should ask which of the two versions the reader uses, naming both', async () => {
        await importWithSimilar();
        const message = await screen.findByRole('dialog', {name: 'Same news as card 03'});
        expect(within(message).getByText('Card 03 of this briefing')).toBeInTheDocument();
        expect(within(message).getByText('Wenger and the FIFA, by your profile')).toBeInTheDocument();
        expect(within(message).getByText('Imported from Chris')).toBeInTheDocument();
        expect(within(message).getByText('Imported 30')).toBeInTheDocument();
        expect(within(message).getAllByRole('button', {name: 'Use this one'})).toHaveLength(2);
        expect(within(message).getByRole('button', {name: 'Keep both'})).toBeInTheDocument();
    });

    it('should keep the card of the briefing and fold the news imported into it', async () => {
        const mail = await importWithSimilar();
        const message = await screen.findByRole('dialog', {name: 'Same news as card 03'});
        fireEvent.click(within(message).getAllByRole('button', {name: 'Use this one'})[0]);
        await waitFor(() => expect(mail.foldNews).toHaveBeenCalledWith(10, 1030));
        await waitFor(() => expect(screen.queryByRole('dialog', {name: 'Same news as card 03'})).toBeNull());
    });

    it('should keep the news imported and fold the card of the briefing into it', async () => {
        const mail = await importWithSimilar();
        const message = await screen.findByRole('dialog', {name: 'Same news as card 03'});
        fireEvent.click(within(message).getAllByRole('button', {name: 'Use this one'})[1]);
        await waitFor(() => expect(mail.foldNews).toHaveBeenCalledWith(1030, 10));
        await waitFor(() => expect(screen.queryByRole('dialog', {name: 'Same news as card 03'})).toBeNull());
    });

    it('should keep both when the reader says so or closes the message, and fold nothing', async () => {
        const mail = await importWithSimilar();
        fireEvent.click(within(await screen.findByRole('dialog', {name: 'Same news as card 03'})).getByRole('button', {name: 'Keep both'}));
        await waitFor(() => expect(screen.queryByRole('dialog', {name: 'Same news as card 03'})).toBeNull());
        expect(mail.foldNews).not.toHaveBeenCalled();
        // the news stays added
        expect(within(screen.getByRole('button', {name: 'Import “Wenger and the FIFA” into the e-mail'})).getByText('Added')).toBeInTheDocument();
    });

    it('should leave the message open, and say nothing, when the two could not be made one', async () => {
        const mail = await importWithSimilar({foldNews: vi.fn(async () => false)});
        const message = await screen.findByRole('dialog', {name: 'Same news as card 03'});
        fireEvent.click(within(message).getAllByRole('button', {name: 'Use this one'})[0]);
        await waitFor(() => expect(mail.foldNews).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(within(screen.getByRole('dialog', {name: 'Same news as card 03'})).getAllByRole('button', {name: 'Use this one'})[0]).toBeEnabled());
    });

    it('should ask nothing for a news that tells no other news here, nor when the page cannot fold', async () => {
        await open({draft: draft()});
        fireEvent.click(await screen.findByRole('button', {name: 'Import “Wenger and the FIFA” into the e-mail'}));
        await waitFor(() => expect(within(screen.getByRole('button', {name: 'Import “Wenger and the FIFA” into the e-mail'})).getByText('Added')).toBeInTheDocument());
        expect(screen.queryByRole('dialog', {name: /Same news as card/})).toBeNull();
    });
});
