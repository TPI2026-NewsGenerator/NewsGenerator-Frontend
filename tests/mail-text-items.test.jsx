//
//  Author: Fabian Rostello
//  Date: 06.11.2026
//  File: mail-text-items.test.jsx
//  Description: The sentences the e-mail sends of a story, a box for each point or passage (the user, 06.11.2026: one box with a line a
//               point had no bullet, and the end of a point could not be told from the next): the bullets, the […] between two passages,
//               Enter to add one, the cross to take one out, and the text as the draft keeps it (a line a point, a blank line between two passages)
//

import '@testing-library/jest-dom';
import {describe, expect, it, vi} from 'vitest';
import {useState} from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {MailTextItems} from '@/features/briefing/components/MailTextItems.jsx';

// the draft holds the text; the last text it was given is kept to be read
const Draft = ({way, start, spy}) => {
    const [value, setValue] = useState(start);
    return <MailTextItems id={1} way={way} label={`Its ${way} in the e-mail`} value={value} describedBy="help"
                          onChange={text => { spy?.(text); setValue(text); }}/>;
};
const values = (noun) => screen.getAllByRole('textbox', {name: new RegExp(`^${noun} \\d+$`)}).map(box => box.value);

describe('MailTextItems, the points', () => {
    it('should draw a box for each point, with a bullet before it', () => {
        const {container} = render(<Draft way="points" start={'First point.\nSecond point.\nThird point.'}/>);
        expect(values('Point')).toEqual(['First point.', 'Second point.', 'Third point.']);
        expect([...container.querySelectorAll('li')].map(item => item.textContent.includes('•'))).toEqual([true, true, true]);
        // the bullets are drawn, not read; and no […] between points
        expect(container.querySelectorAll('[aria-hidden="true"]:not(svg)').length).toBe(3);
        expect(container).not.toHaveTextContent('[…]');
        expect(screen.getByRole('group', {name: 'Its points in the e-mail'})).toBeInTheDocument();
    });

    it('should add a box under the one where Enter is pressed, with the cursor in it', () => {
        const spy = vi.fn();
        render(<Draft way="points" start={'First point.\nThird point.'} spy={spy}/>);
        fireEvent.keyDown(screen.getByRole('textbox', {name: 'Point 1'}), {key: 'Enter'});
        expect(values('Point')).toEqual(['First point.', '', 'Third point.']);
        expect(screen.getByRole('textbox', {name: 'Point 2'})).toHaveFocus();
        // the draft keeps a line a point, the one just added empty
        expect(spy).toHaveBeenLastCalledWith('First point.\n\nThird point.');
    });

    it('should add one at the end with its button', () => {
        render(<Draft way="points" start="Only point."/>);
        fireEvent.click(screen.getByRole('button', {name: 'Add a point'}));
        expect(values('Point')).toEqual(['Only point.', '']);
        expect(screen.getByRole('textbox', {name: 'Point 2'})).toHaveFocus();
    });

    it('should take a point out with its cross, and with Backspace in an empty one', () => {
        const spy = vi.fn();
        render(<Draft way="points" start={'One.\nTwo.\nThree.'} spy={spy}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Remove point 2'}));
        expect(values('Point')).toEqual(['One.', 'Three.']);
        expect(spy).toHaveBeenLastCalledWith('One.\nThree.');

        fireEvent.click(screen.getByRole('button', {name: 'Add a point'}));
        fireEvent.keyDown(screen.getByRole('textbox', {name: 'Point 3'}), {key: 'Backspace'});
        expect(values('Point')).toEqual(['One.', 'Three.']);
        expect(screen.getByRole('textbox', {name: 'Point 2'})).toHaveFocus();
        // Backspace in a box with a text only deletes a letter
        fireEvent.keyDown(screen.getByRole('textbox', {name: 'Point 2'}), {key: 'Backspace'});
        expect(values('Point')).toEqual(['One.', 'Three.']);
    });

    it('should keep one empty box when the last point is taken out, with no cross to take it out', () => {
        const spy = vi.fn();
        render(<Draft way="points" start="Only point." spy={spy}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Remove point 1'}));
        expect(values('Point')).toEqual(['']);
        expect(spy).toHaveBeenLastCalledWith('');
        expect(screen.queryByRole('button', {name: /^Remove/})).toBeNull();
    });

    it('should make several points of several lines pasted in a box', () => {
        render(<Draft way="points" start={'First.\nLast.'}/>);
        fireEvent.change(screen.getByRole('textbox', {name: 'Point 1'}), {target: {value: 'A.\nB.\nC.'}});
        expect(values('Point')).toEqual(['A.', 'B.', 'C.', 'Last.']);
        expect(screen.getByRole('textbox', {name: 'Point 3'})).toHaveFocus();
    });

    it('should not let a box hold a line break, and give the text of one change as it is typed', () => {
        const spy = vi.fn();
        render(<Draft way="points" start="First." spy={spy}/>);
        fireEvent.change(screen.getByRole('textbox', {name: 'Point 1'}), {target: {value: 'First, longer.'}});
        expect(spy).toHaveBeenLastCalledWith('First, longer.');
    });
});

describe('MailTextItems, the passages and the summary', () => {
    it('should put […] between two passages, as the e-mail does, and no bullet', () => {
        const {container} = render(<Draft way="passages" start={'The first.\n\nThe second.\n\nThe third.'}/>);
        expect(values('Passage')).toEqual(['The first.', 'The second.', 'The third.']);
        expect(container.querySelectorAll('li p[aria-hidden]')).toHaveLength(2);
        expect([...container.querySelectorAll('li p[aria-hidden]')].map(mark => mark.textContent)).toEqual(['[…]', '[…]']);
        expect(container).not.toHaveTextContent('•');
    });

    it('should keep a blank line between two passages in the text of the draft', () => {
        const spy = vi.fn();
        render(<Draft way="digest" start={'One.\n\nTwo.'} spy={spy}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Add a passage'}));
        fireEvent.change(screen.getByRole('textbox', {name: 'Passage 3'}), {target: {value: 'Three.'}});
        expect(spy).toHaveBeenLastCalledWith('One.\n\nTwo.\n\nThree.');
        expect(screen.getByRole('group', {name: 'Its digest in the e-mail'})).toBeInTheDocument();
    });

    it('should make one passage of the lines pasted in it, and several of the paragraphs', () => {
        render(<Draft way="passages" start="Only."/>);
        fireEvent.change(screen.getByRole('textbox', {name: 'Passage 1'}), {target: {value: 'Line one\nline two'}});
        expect(values('Passage')).toEqual(['Line one line two']);
        fireEvent.change(screen.getByRole('textbox', {name: 'Passage 1'}), {target: {value: 'Para one\n\nPara two'}});
        expect(values('Passage')).toEqual(['Para one', 'Para two']);
    });

    it('should add and take out passages as points', () => {
        render(<Draft way="passages" start={'A.\n\nB.'}/>);
        fireEvent.keyDown(screen.getByRole('textbox', {name: 'Passage 2'}), {key: 'Enter'});
        expect(values('Passage')).toEqual(['A.', 'B.', '']);
        fireEvent.click(screen.getByRole('button', {name: 'Remove passage 1'}));
        expect(values('Passage')).toEqual(['B.', '']);
    });
});

describe('MailTextItems, disabled', () => {
    it('should not change while the e-mail is being sent', () => {
        render(<MailTextItems id={1} way="points" label="Its points" value="A." onChange={() => {}} disabled/>);
        expect(screen.getByRole('textbox', {name: 'Point 1'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Add a point'})).toBeDisabled();
        expect(within(screen.getByRole('group')).getByRole('button', {name: 'Remove point 1'})).toBeDisabled();
    });
});
