//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: watch-terms.test.jsx
//  Description: The names and terms followed, saved as soon as one is added or removed: added to the
//               list only, a term looked followed and was not
//

import '@testing-library/jest-dom';
import {describe, expect, it, vi} from 'vitest';
import {useState} from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {WatchTerms} from '@/features/profiles/WatchTerms.jsx';

// the page: the terms saved are the ones the server answers
const Page = ({save}) => {
    const [terms, setTerms] = useState(['VAR']);
    return <WatchTerms terms={terms} onSave={async (next) => {
        if (await save(next)) setTerms(next);
    }}/>;
};
const followed = () => screen.queryAllByRole('listitem').map(item => item.textContent);

describe('WatchTerms', () => {
    it('should save a term as soon as it is added, with no other button to press', async () => {
        const save = vi.fn(async () => true);
        render(<Page save={save}/>);
        expect(screen.queryByRole('button', {name: /Save/})).toBeNull();

        fireEvent.change(screen.getByLabelText('A name or a term'), {target: {value: ' Dario  Amodei '}});
        fireEvent.keyDown(screen.getByLabelText('A name or a term'), {key: 'Enter'});

        expect(save).toHaveBeenCalledWith(['VAR', 'Dario Amodei']);
        await waitFor(() => expect(followed()).toEqual(['VAR', 'Dario Amodei']));
        expect(screen.getByLabelText('A name or a term')).toHaveValue('');
    });

    it('should save a term as soon as it is removed', async () => {
        const save = vi.fn(async () => true);
        render(<Page save={save}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Stop following VAR'}));
        expect(save).toHaveBeenCalledWith([]);
        await waitFor(() => expect(followed()).toEqual([]));
    });

    it('should show the terms saved again when the server refused the change', async () => {
        const save = vi.fn(async () => false);
        render(<Page save={save}/>);

        fireEvent.change(screen.getByLabelText('A name or a term'), {target: {value: 'Infantino'}});
        fireEvent.click(screen.getByRole('button', {name: 'Add'}));

        await waitFor(() => expect(save).toHaveBeenCalled());
        await waitFor(() => expect(followed()).toEqual(['VAR']));
    });

    it('should not add a term twice, whatever its case', () => {
        const save = vi.fn(async () => true);
        render(<Page save={save}/>);

        fireEvent.change(screen.getByLabelText('A name or a term'), {target: {value: 'var'}});
        fireEvent.click(screen.getByRole('button', {name: 'Add'}));
        expect(save).not.toHaveBeenCalled();
    });
});
