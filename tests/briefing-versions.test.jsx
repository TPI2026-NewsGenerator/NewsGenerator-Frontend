//
//  Author: Fabian Rostello
//  Date: 09.11.2026
//  File: briefing-versions.test.jsx
//  Description: The same news written by another profile of the account: the card offers its version, and the way back once it is used
//

import '@testing-library/jest-dom';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BriefingCard} from '@/features/briefing/components/BriefingCard.jsx';

const item = (changes = {}) => ({
    storyId: 7, title: 'Arsène Wenger au Soir', summary: 'Premier paragraphe.', topic: 'sport', sourcing: 'named', hedged: null,
    publishedAt: '2026-11-09T07:00:00.000Z', articles: [{title: 'A', url: 'https://lesoir.be/a', source: 'lesoir.be', publishedAt: '2026-11-09T07:00:00.000Z'}], ...changes,
});
const versions = [{briefingId: 508, profile: 'Chris', createdAt: '2026-11-09T07:23:00.000Z', source: 'hln.be'}];

describe('BriefingCard, another version of its news', () => {
    it('should offer the version another profile has and use it on a click', () => {
        const onUseVersion = vi.fn();
        render(<MemoryRouter><BriefingCard item={item()} versions={versions} onUseVersion={onUseVersion}/></MemoryRouter>);
        expect(screen.getByText('Another version')).toBeInTheDocument();
        expect(screen.getByText(/Chris wrote it from hln\.be/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: "Use Chris's version"}));
        expect(onUseVersion).toHaveBeenCalledWith(versions[0]);
    });

    it('should say nothing when no profile has another version, nor for a card that cannot take one', () => {
        const {rerender} = render(<MemoryRouter><BriefingCard item={item()} versions={[]} onUseVersion={vi.fn()}/></MemoryRouter>);
        expect(screen.queryByText('Another version')).toBeNull();
        rerender(<MemoryRouter><BriefingCard item={item()} versions={versions}/></MemoryRouter>);
        expect(screen.queryByText('Another version')).toBeNull();
    });

    it('should say whose version the card is and bring the one of its profile back on a click, offering no other meanwhile', () => {
        const onRestoreVersion = vi.fn();
        const used = item({version: {briefingId: 508, profile: 'Chris', createdAt: '2026-11-09T07:23:00.000Z'}, previousVersion: {title: 'Wenger', source: 'lesoir.be'}});
        render(<MemoryRouter><BriefingCard item={used} versions={versions} onUseVersion={vi.fn()} onRestoreVersion={onRestoreVersion}/></MemoryRouter>);
        expect(screen.getByText("Chris's version")).toBeInTheDocument();
        expect(screen.queryByText('Another version')).toBeNull();

        fireEvent.click(screen.getByRole('button', {name: 'Back to the one of this profile (lesoir.be)'}));
        expect(onRestoreVersion).toHaveBeenCalledTimes(1);
    });

    it('should not let the reader click again while the card is being changed', () => {
        render(<MemoryRouter><BriefingCard item={item()} versions={versions} onUseVersion={vi.fn()} versionBusy/></MemoryRouter>);
        expect(screen.getByRole('button', {name: "Use Chris's version"})).toBeDisabled();
    });
});
