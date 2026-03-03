import '@testing-library/jest-dom';
import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import Home from '../src/App.jsx';

it('should display the fetch button', () => {
    render(<Home/>);

    const button = screen.getByRole('button', {name: 'Fetch News'});

    expect(button).toBeInTheDocument();
});