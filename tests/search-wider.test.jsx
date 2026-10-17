//
//  Author: Fabian Rostello
//  Date: 17.10.2026
//  File: search-wider.test.jsx
//  Description: The wider search offered when a search of words finds close to nothing: run as the
//               server counted it, its exact phrases and -words with it
//

import '@testing-library/jest-dom';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {FeedList} from '@/features/search/components/feed-list/FeedList.jsx';

describe('FeedList, a search that found nothing', () => {
    it('should run the wider search the server counted, its phrases and excluded words kept', () => {
        const onWiden = vi.fn();
        render(<FeedList newsList={[]} mode="words" onWiden={onWiden}
                         wider={{found: 5, terms: ['red card', 'referee'], keywords: '"red card", referee, -rugby'}}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Show those 5'}));

        expect(onWiden).toHaveBeenCalledWith('"red card", referee, -rugby');
    });

    it('should run the words alone of a search kept from before', () => {
        const onWiden = vi.fn();
        render(<FeedList newsList={[]} mode="words" onWiden={onWiden} wider={{found: 5, terms: ['referee', 'football']}}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Show those 5'}));

        expect(onWiden).toHaveBeenCalledWith('referee, football');
    });
});
