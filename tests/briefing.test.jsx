//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: briefing.test.jsx
//  Description: A story of the briefing: what the reader is told about who tells it, and its sources
//

import '@testing-library/jest-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BriefingCard} from '@/features/briefing/components/BriefingCard.jsx';
import {aiFirstPreference} from '@/features/briefing/aiFirst.js';
import {coverageLabel} from '@/features/briefing/corroboration.js';

// what lies around the news of a card is behind one strip of buttons, none open at first (the user chose it, 05.11.2026): a test opens the one it reads
// the first one is open at first (the user, 05.11.2026): a test that counts the links or the items of the card itself closes it first
const closeTabs = () => document.querySelectorAll('button[aria-expanded="true"][id$="-tab"]').forEach(tab => fireEvent.click(tab));
// (a click on an open one would close it)
const openTab = (name) => {
    const tab = screen.getByRole('button', {name: new RegExp(`^${name}`)});
    if (tab.getAttribute('aria-expanded') !== 'true') fireEvent.click(tab);
};

const article = (n) => ({title: `Article ${n}`, url: `https://media${n}.fr/story`, source: `media${n}.fr`, publishedAt: '2026-09-24T10:00:00.000Z'});

const item = (changes = {}) => ({
    storyId: 1,
    title: 'Toulon bat Vannes au bout du suspense',
    why: 'Du Top 14, que vous suivez.',
    summary: 'Premier paragraphe.\n\nSecond paragraphe.',
    topic: 'sport',
    sourcing: 'named',
    hedged: null,
    publishedAt: '2026-09-24T10:00:00.000Z',
    corroboration: {media: 3, read: 3, independent: 2, agencies: [], mediaNames: ['a.fr', 'b.fr', 'c.fr']},
    articles: [article(1), article(2), article(3)],
    ...changes,
});

describe('coverageLabel of the texts read', () => {
    it('should never count ten copies of one wire as ten confirmations', () => {
        const label = coverageLabel({media: 10, read: 5, independent: 1, agencies: ['AFP']});
        expect(label.text).toBe('Told by 10 media, one single text republished · wire: AFP');
        // the card says it alone, its count of media being elsewhere
        expect(label.texts).toBe('one single text republished · wire: AFP');
    });

    it('should say how many different texts there are among the ones read', () => {
        expect(coverageLabel({media: 4, read: 3, independent: 3}).text).toBe('Told by 4 media, 3 different texts of 3 read');
    });

    it('should not claim anything when too few texts could be read', () => {
        expect(coverageLabel({media: 4, read: 1, independent: 1}).text).toBe('Told by 4 media, too few texts could be read to compare them');
        expect(coverageLabel({media: 1, read: 1, independent: 1}).text).toBe('Only one medium');
    });
});

describe('BriefingCard, a title without the bait of its medium', () => {
    it('should say the title was shortened and show it as published on demand', () => {
        render(<BriefingCard item={item({title: 'Messi signe à Miami', titleAsPublished: 'Information incroyable ! Messi signe à Miami'})}/>);
        expect(screen.getByRole('heading', {name: 'Messi signe à Miami'})).toBeInTheDocument();
        expect(screen.getByText('Title shortened')).toBeInTheDocument();
        expect(screen.queryByText(/Information incroyable/)).toBeNull();

        fireEvent.click(screen.getByRole('button', {name: 'Show the title as published'}));
        expect(screen.getByText(/Information incroyable ! Messi signe à Miami/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Hide the title as published'}));
        expect(screen.queryByText(/Information incroyable/)).toBeNull();
    });

    it('should show the title as published as the original of a translated one, and say it was shortened', () => {
        render(<BriefingCard item={item({title: 'Messi signe à Miami', titleTranslation: 'Messi signs in Miami', language: 'fr',
            titleAsPublished: 'Information incroyable ! Messi signe à Miami'})}/>);
        expect(screen.getByText(/Translated from French, title shortened/)).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole('button', {name: 'Show original'})[0]);
        expect(screen.getByText(/Information incroyable ! Messi signe à Miami/)).toBeInTheDocument();
    });

    it('should say nothing of a title left as it was', () => {
        render(<BriefingCard item={item()}/>);
        expect(screen.queryByText('Title shortened')).toBeNull();
        expect(screen.queryByText(/Title rewritten by the AI/)).toBeNull();
    });
});

// a title the AI rewrote (the user, 03.11.2026): its own caption and button, not the "Show original" of a translation
describe('BriefingCard, a title rewritten by the AI', () => {
    const PUBLISHED = 'Historic: from this matchday onwards referees will speak after the matches';

    it('should say the AI rewrote the title and show the title as published on demand', () => {
        render(<BriefingCard item={item({title: 'From this matchday onwards referees will speak after the matches', titleAsPublished: PUBLISHED, titleRewritten: true})}/>);
        expect(screen.getByRole('heading', {name: 'From this matchday onwards referees will speak after the matches'})).toBeInTheDocument();
        expect(screen.getByText(/Title rewritten by the AI/)).toBeInTheDocument();
        expect(screen.queryByText('Title shortened')).toBeNull();
        expect(screen.queryByText(/Historic/)).toBeNull();

        fireEvent.click(screen.getByRole('button', {name: 'Show the title as published'}));
        expect(screen.getByText(`“${PUBLISHED}”`)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Hide the title as published'}));
        expect(screen.queryByText(/Historic/)).toBeNull();
    });

    it('should keep the button of the title as published apart from the "Show original" of the translation', () => {
        render(<BriefingCard item={item({title: 'Ab dieser Spieltag sprechen die Schiedsrichter nach den Spielen', titleTranslation: 'From this matchday onwards referees will speak',
            language: 'de', titleAsPublished: 'Historisch: Ab dieser Spieltag sprechen die Schiedsrichter nach den Spielen', titleRewritten: true})}/>);
        expect(screen.getByText(/Translated from German/)).toBeInTheDocument();
        expect(screen.queryByText(/title shortened/)).toBeNull();
        expect(screen.getByText(/Title rewritten by the AI/)).toBeInTheDocument();

        // "Show original" shows the title of the card in its language, rewritten: not the one as published
        fireEvent.click(screen.getAllByRole('button', {name: 'Show original'})[0]);
        expect(screen.getByText('“Ab dieser Spieltag sprechen die Schiedsrichter nach den Spielen”')).toBeInTheDocument();
        expect(screen.queryByText(/Historisch/)).toBeNull();

        // the title as published has a button of its own
        fireEvent.click(screen.getByRole('button', {name: 'Show the title as published'}));
        expect(screen.getByText('“Historisch: Ab dieser Spieltag sprechen die Schiedsrichter nach den Spielen”')).toBeInTheDocument();
    });
});

describe('BriefingCard', () => {
    it('should show why the story was chosen, its summary and how widely it is told', () => {
        render(<BriefingCard item={item()}/>);
        expect(screen.getByText('Du Top 14, que vous suivez.')).toBeInTheDocument();
        expect(screen.getByText('Second paragraphe.')).toBeInTheDocument();
        // the media that tell it in one line under the title, how many wrote their own text in the coverage, open at first
        expect(screen.getByRole('button', {name: 'Told by 3 media'})).toBeInTheDocument();
        expect(screen.getByText(/2 different texts of 3 read/)).toBeInTheDocument();
        // what the article says of its sources (named, unnamed) and the tab that said it are gone (the user, 05.11.2026)
        expect(screen.queryByText(/named sources/)).toBeNull();
        expect(screen.queryByText('Who tells it')).toBeNull();
        expect(screen.queryByRole('button', {name: /^Sources/})).toBeNull();
        closeTabs();
        expect(screen.getAllByRole('link')).toHaveLength(3);
    });

    // the way to the article right under its sentences, who else covers it at the very bottom (the user, 06.11.2026)
    it('should put the link to the article right under the sentences, before the tabs, and the media that cover it at the very bottom of the card', () => {
        render(<BriefingCard item={item()}/>);
        const link = screen.getByRole('link', {name: /Read the article at/});
        const tab = screen.getByRole('button', {name: /^Coverage/});
        const panel = document.getElementById(tab.getAttribute('aria-controls'));
        expect(screen.getByText('Second paragraphe.').compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(link.compareDocumentPosition(tab) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(link.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getByText(/Also covered by/).compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
        // one link to the article only: the media at the bottom do not repeat it
        expect(screen.getAllByRole('link', {name: /Read the article at/})).toHaveLength(1);
    });

    // the titles of the parts of a card are titles, and the links are of three kinds (the user, 06.11.2026)
    it('should write the title of the sentences as a title, not a small label', () => {
        render(<BriefingCard item={item()}/>);
        const title = screen.getByText("In the article's words");
        expect(title).toHaveClass('section-title');
        expect(title).not.toHaveClass('kicker');
    });

    it('should show the name of a medium that covers it as a link of the quiet kind, the one to the article as the action', () => {
        render(<BriefingCard item={item()}/>);
        expect(within(screen.getByText(/Also covered by/)).getByRole('link', {name: 'media2.fr'})).toHaveClass('medium-link');
        expect(screen.getByRole('link', {name: /Read the article at/})).toHaveClass('link');
    });

    it('should send to read the article of the passages, and name the others as covering it', () => {
        render(<BriefingCard item={item({lead: article(2)})}/>);
        expect(screen.getByRole('link', {name: /Read the article at media2.fr/})).toHaveAttribute('href', 'https://media2.fr/story');
        expect(screen.getByText(/as the article of media2.fr published them/)).toBeInTheDocument();
        expect(screen.getByText(/Also covered by/)).toHaveTextContent('Also covered by media1.fr, media3.fr');
    });

    it('should end the links of the sources with their language, no arrow after it', () => {
        render(<BriefingCard item={item({lead: {...article(2), language: 'fr'}, articles: [article(1), {...article(3), language: 'de'}]})}/>);
        expect(screen.getByRole('link', {name: /Read the article at media2.fr/})).toHaveTextContent(/^Read the article at media2\.fr\s*fr$/);
        expect(screen.getByText(/Also covered by/)).toHaveTextContent(/^Also covered by media1\.fr, media3\.fr\s*de$/);
        expect(screen.queryByText(/↗/)).toBeNull();
    });

    it('should send to its first article a card of a briefing made before the article of the passages was given', () => {
        render(<BriefingCard item={item()}/>);
        expect(screen.getByRole('link', {name: /Read the article at media1.fr/})).toBeInTheDocument();
    });

    it('should say when no article could be read, and when the article itself has no confirmation', () => {
        render(<BriefingCard item={item({summary: null, hedged: 'selon nos informations'})}/>);
        expect(screen.getByText(/could be read/)).toBeInTheDocument();
        // a badge next to the media, the words of the article in the column beside the card, nothing to open
        expect(screen.getByRole('button', {name: 'Unconfirmed'})).toBeInTheDocument();
        expect(screen.getByText(/selon nos informations/)).toBeInTheDocument();
    });

    // the first media in the line under the article, the others in the coverage, which "and 8 more" opens
    it('should name the first media of a big story, and open the coverage for all of them', () => {
        render(<BriefingCard item={item({articles: Array.from({length: 12}, (_, i) => article(i + 1))})}/>);
        // the coverage is the first tab, open: the article to read and 3 others in the line under the text, 8 in the list of the coverage
        expect(screen.getByRole('link', {name: /Read the article at/})).toBeInTheDocument();
        expect(screen.getByText(/Also covered by/)).toHaveTextContent('Also covered by media2.fr, media3.fr, media4.fr');
        closeTabs();
        expect(screen.queryByText('How widely it is told')).toBeNull();
        expect(screen.getAllByRole('link')).toHaveLength(4);
        fireEvent.click(screen.getByRole('button', {name: 'and 8 more'}));
        expect(screen.getByText('How widely it is told')).toBeInTheDocument();
        expect(screen.queryByRole('link', {name: 'media12.fr'})).toBeNull();
        fireEvent.click(screen.getByRole('button', {name: 'Show all 12 media'}));
        expect(screen.getByRole('link', {name: 'media12.fr'})).toBeInTheDocument();
    });

    it('should show how widely it is told on every card: the media, the languages, who told it first', () => {
        render(<BriefingCard item={item({articles: [{...article(1), language: 'fr'}, {...article(2), publishedAt: '2026-09-24T12:00:00.000Z', language: 'en'}, article(3)]})}/>);
        openTab('Coverage');
        expect(screen.getByText('3 media · 2 languages')).toBeInTheDocument();
        expect(screen.getByText(/First told by media1.fr/)).toBeInTheDocument();
        expect(screen.getByText('English 1 · French 1')).toBeInTheDocument();
    });

    it('should open the first tab at first, close it when its button is pressed again, and show one panel at a time', () => {
        const angles = [{title: 'Another angle', url: 'https://si.com/a', source: 'si.com', language: 'es', publishedAt: '2026-10-08T07:00:00.000Z', media: 3}];
        render(<BriefingCard item={item({angles})}/>);
        expect(screen.getByText('Same affair, other angles')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: /^Angles/}));
        expect(screen.queryByText('Same affair, other angles')).toBeNull();
        openTab('Coverage');
        expect(screen.getByText('How widely it is told')).toBeInTheDocument();
        openTab('Angles');
        expect(screen.queryByText('How widely it is told')).toBeNull();
        expect(screen.getByText('Same affair, other angles')).toBeInTheDocument();
    });

    it('should have no tab "Sources": what it held is a badge next to the media and its words in the column beside the card', () => {
        render(<BriefingCard item={item({hedged: 'selon nos informations'})}/>);
        expect(screen.queryByRole('button', {name: /^Sources/})).toBeNull();
    });
});

describe('BriefingCard explanations', () => {
    it('should say what the texts read mean on a tap of the "i", where nothing is hovered', async () => {
        render(<BriefingCard item={item()}/>);
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'What “2 different texts of 3 read” means'}));
        expect(await screen.findByRole('tooltip')).toHaveTextContent(/2 of the 3 texts read are not copies of one another/);
    });

    it('should say when the media of a card republish one wire', () => {
        render(<BriefingCard item={item({corroboration: {media: 10, read: 5, independent: 1, agencies: ['AFP']}})}/>);
        expect(screen.getByText(/One single text republished · wire: AFP/)).toBeInTheDocument();
    });
});

describe('BriefingCard thumbs', () => {
    it('should give a thumb, and take it back with a second click', () => {
        const onVote = vi.fn();
        const {rerender} = render(<BriefingCard item={item({vote: null})} onVote={onVote}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Good for me'}));
        expect(onVote).toHaveBeenLastCalledWith('up');

        rerender(<BriefingCard item={item({vote: 'up'})} onVote={onVote}/>);
        expect(screen.getByRole('button', {name: 'Good for me'})).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', {name: 'Good for me'}));
        expect(onVote).toHaveBeenLastCalledWith(null);
        fireEvent.click(screen.getByRole('button', {name: 'Not for me'}));
        expect(onVote).toHaveBeenLastCalledWith('down');
    });

    it('should show no thumb without onVote', () => {
        render(<BriefingCard item={item()}/>);
        expect(screen.queryByRole('button', {name: 'Good for me'})).toBeNull();
    });
});

describe('BriefingCard and a trusted source', () => {
    it('should mark the article of a source the reader trusts', () => {
        render(<BriefingCard item={item({articles: [{...article(1), trusted: true}, article(2)]})}/>);
        // in the line under the text and in the list of the coverage, open at first
        expect(screen.getAllByLabelText('a source you trust')).toHaveLength(2);
        closeTabs();
        expect(screen.getAllByLabelText('a source you trust')).toHaveLength(1);
    });
});

describe('BriefingCard passages', () => {
    it('should show the translated passages with a gap between them, and the original only when asked', () => {
        render(<BriefingCard item={item({language: 'en', summary: 'He was fined $10,000.\n\nThe appeal was heard on Thursday.',
            translation: 'Il a reçu une amende de 10 000 $.\n\nL\'appel a été entendu jeudi.'})}/>);
        expect(screen.getByText('Il a reçu une amende de 10 000 $.')).toBeInTheDocument();
        expect(screen.getAllByText('[…]')).toHaveLength(1);
        expect(screen.getByText(/the original is the reference/)).toBeInTheDocument();
        expect(screen.queryByText('He was fined $10,000.')).toBeNull();

        fireEvent.click(screen.getByRole('button', {name: 'Show original'}));
        expect(screen.getByText('He was fined $10,000.')).toBeInTheDocument();
        expect(screen.getAllByText('[…]')).toHaveLength(2);
        fireEvent.click(screen.getByRole('button', {name: 'Hide original'}));
        expect(screen.queryByText('He was fined $10,000.')).toBeNull();
    });

    it('should show no translation for an article in the language of the reader', () => {
        render(<BriefingCard item={item()}/>);
        expect(screen.queryByText(/translated/i)).toBeNull();
        expect(screen.queryByRole('button', {name: 'Show original'})).toBeNull();
    });

    it('should show a translated title, and the title as written once the original is shown', () => {
        render(<BriefingCard item={item({title: 'Thierno Barry goal decision upheld', language: 'en',
            titleTranslation: 'La décision sur le but de Thierno Barry maintenue'})}/>);
        expect(screen.getByRole('heading', {name: 'La décision sur le but de Thierno Barry maintenue'})).toBeInTheDocument();
        expect(screen.getByText('Translated from English')).toBeInTheDocument();
        expect(screen.queryByText('“Thierno Barry goal decision upheld”')).toBeNull();
        fireEvent.click(screen.getByRole('button', {name: 'Show original'}));
        expect(screen.getByText('“Thierno Barry goal decision upheld”')).toBeInTheDocument();
    });
});

describe('BriefingCard ways of reading', () => {
    const ways = {
        summary: 'Le club a été sanctionné mardi.\n\nLe président fera appel.\n\nLa décision tombera en mai.',
        points: 'Le président fera appel.\n\nLe club a été sanctionné mardi.\n\nLa décision tombera en mai.',
        digest: 'Le club a été sanctionné mardi.\n\nLa décision tombera en mai.',
    };

    it('should show the most important sentences as bullet points, the most important first', () => {
        render(<BriefingCard item={item(ways)} format="points"/>);
        closeTabs();
        expect(screen.getAllByRole('listitem').map(point => point.textContent))
            .toEqual(['Le président fera appel.', 'Le club a été sanctionné mardi.', 'La décision tombera en mai.']);
        expect(screen.queryByText('[…]')).toBeNull();
    });

    it('should show the summary in one paragraph, its gaps marked inside it', () => {
        render(<BriefingCard item={item(ways)} format="digest"/>);
        const digest = screen.getByText(/Le club a été sanctionné mardi\./);
        expect(digest.tagName).toBe('P');
        expect(digest).toHaveTextContent('Le club a été sanctionné mardi. […] La décision tombera en mai.');
        expect(screen.queryByText('Le président fera appel.')).toBeNull();
    });

    it('should show the translated points, and the points as written once the original is shown', () => {
        render(<BriefingCard item={item({...ways, language: 'en', points: 'The president will appeal.\n\nThe club was sanctioned.',
            pointsTranslation: 'Le président fera appel.\n\nLe club a été sanctionné.', translation: 'Traduit.'})} format="points"/>);
        closeTabs();
        expect(screen.getAllByRole('listitem').map(point => point.textContent)).toEqual(['Le président fera appel.', 'Le club a été sanctionné.']);
        fireEvent.click(screen.getByRole('button', {name: 'Show original'}));
        expect(screen.getByText('The president will appeal.').tagName).toBe('LI');
    });

    it('should show the key passages of a briefing made before the other ways', () => {
        render(<BriefingCard item={item({summary: ways.summary})} format="points"/>);
        closeTabs();
        expect(screen.queryByRole('listitem')).toBeNull();
        expect(screen.getAllByText('[…]')).toHaveLength(2);
    });
});

// the number of a story on a phone is a little larger than the line it begins (the user, 05.11.2026), the big number of a screen from md up
describe('BriefingCard number', () => {
    it('should show the number of the story with two digits, larger than the rest of its line on a phone and as big as before from md up', () => {
        render(<BriefingCard item={item({topic: 'sport'})} number={1}/>);
        const number = screen.getByText('01');
        expect(number).toHaveClass('text-[1.25rem]', 'md:text-[3rem]');
        expect(number).not.toHaveClass('text-[0.8125rem]');
        expect(number).toHaveAttribute('aria-hidden', 'true');
    });
});

// the page shows the blocks of the preset the reader chose: all of the card at first, less in "Short" and "Standard" (the user, 06.11.2026)
describe('BriefingCard with the blocks of a preset', () => {
    const rich = () => item({
        thumbnail: 'https://cdn.example/a.jpg', countries: ['FR'], names: [{name: 'FIFA'}], hedged: 'selon nos informations',
        contested: [{by: 'Infantino', sentence: 'No.', source: 'bild.de', url: 'https://bild.de/a'}],
        official: [{party: 'UEFA', title: 'A post', url: 'https://uefa.com/a', channel: 'site'}],
        angles: [{title: 'Another angle', source: 'rfi.fr', url: 'https://rfi.fr/n'}],
    });
    const SHORT = ['media', 'contested', 'official', 'unconfirmed'];

    it('should show the whole card without a preset', () => {
        const {container} = render(<MemoryRouter><BriefingCard item={rich()}/></MemoryRouter>);
        expect(container.querySelector('img')).not.toBeNull();
        expect(screen.getByText('France')).toBeInTheDocument();
        expect(screen.getByRole('list', {name: 'Who it is about'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /^Coverage/})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /^Angles/})).toBeInTheDocument();
    });

    it('should show the title, the text and the badges only in "Short": no picture, countries, names, nor tabs', () => {
        const {container} = render(<BriefingCard item={rich()} show={SHORT}/>);
        expect(screen.getByText('Toulon bat Vannes au bout du suspense')).toBeInTheDocument();
        expect(screen.getByText('Second paragraphe.')).toBeInTheDocument();
        expect(container.querySelector('img')).toBeNull();
        expect(screen.queryByText('France')).toBeNull();
        expect(screen.queryByRole('list', {name: 'Who it is about'})).toBeNull();
        expect(screen.queryByRole('button', {name: /^Coverage/})).toBeNull();
        expect(screen.queryByRole('button', {name: /^Angles/})).toBeNull();
        // the badges, and the notes they lead to, stay
        expect(screen.getByText('Told by 3 media')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Contested'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Officially confirmed'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Unconfirmed'})).toBeInTheDocument();
    });

    it('should not make "Told by N media" a button to a coverage the preset does not show, nor "and N more" open it', () => {
        render(<BriefingCard item={item({articles: [1, 2, 3, 4, 5, 6].map(article)})} show={SHORT}/>);
        expect(screen.queryByRole('button', {name: 'Told by 3 media'})).toBeNull();
        expect(screen.getByText('Told by 3 media')).toBeInTheDocument();
        // the others are named in the line at the bottom, the rest opened there
        expect(screen.getByRole('button', {name: /and 2 more/})).toBeInTheDocument();
    });

    it('should leave a badge out when its block is not in the preset, with its words beside the card', () => {
        render(<BriefingCard item={rich()} show={['media', 'official']}/>);
        expect(screen.queryByRole('button', {name: 'Contested'})).toBeNull();
        expect(screen.queryByText(/Infantino denies/)).toBeNull();
        expect(screen.queryByRole('button', {name: 'Unconfirmed'})).toBeNull();
        expect(screen.getByRole('button', {name: 'Officially confirmed'})).toBeInTheDocument();
    });

    it('should add the picture, the countries, who it is about and the analysis in "Standard", and the other tabs in "Everything"', () => {
        const STANDARD = [...SHORT, 'picture', 'countries', 'names', 'analysis'];
        const {container} = render(<MemoryRouter><BriefingCard item={rich()} show={STANDARD} analysis={{why: ['It matters.'], next: [], timeline: []}}/></MemoryRouter>);
        expect(container.querySelector('img')).not.toBeNull();
        expect(screen.getByText('France')).toBeInTheDocument();
        expect(screen.getByRole('list', {name: 'Who it is about'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'AI analysis'})).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: /^Angles/})).toBeNull();
        expect(screen.queryByRole('button', {name: /^Coverage/})).toBeNull();
    });
});

// the AI version of the sentences is a switch over them, not a link under them (the user, 06.11.2026)
describe('BriefingCard, the AI version', () => {
    const withAi = (changes = {}) => item({points: 'Premier point.\n\nSecond point.', ai: {points: ['Un point de l’IA.'], summary: 'Un résumé de l’IA.', model: 'gemma4:31b'}, ...changes});

    // on at first (the user, 06.11.2026); a reader who turned it off in the settings has the sentences of the article alone at first
    const aiOffInSettings = () => aiFirstPreference.keep(false);
    afterEach(() => localStorage.removeItem('newsgenerator.ai-first'));

    it('should show it in place of the sentences from the start, as the settings have it, on at first', () => {
        render(<BriefingCard item={withAi()} format="points"/>);
        expect(screen.getByRole('switch', {name: 'AI version'})).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByText('Written by the AI')).toBeInTheDocument();
        expect(screen.getByText('Un point de l’IA.')).toBeInTheDocument();
        // it replaces the normal version (the user, 9.11.2026), it is not put under it
        expect(screen.queryByText('Premier point.')).toBeNull();
        expect(screen.queryByText("In the article's words")).toBeNull();
        // the card can still go back to the sentences of the article, alone
        fireEvent.click(screen.getByRole('switch', {name: 'AI version'}));
        expect(screen.queryByText('Written by the AI')).toBeNull();
        expect(screen.getByText('Premier point.')).toBeInTheDocument();
    });

    it('should offer it as a switch in the row of the title of the sentences, off when the settings have it off', () => {
        aiOffInSettings();
        render(<BriefingCard item={withAi()} format="points"/>);
        const toggle = screen.getByRole('switch', {name: 'AI version'});
        expect(toggle).toHaveAttribute('aria-checked', 'false');
        expect(screen.queryByText('Written by the AI')).toBeNull();
        // over the sentences, beside their title
        const title = screen.getByText("In the article's words");
        expect(title.parentElement).toContainElement(toggle);
        expect(toggle.compareDocumentPosition(screen.getByText('Premier point.')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        // the link under the sentences is gone
        expect(screen.queryByRole('button', {name: /AI version/})).toBeNull();
    });

    it('should show the AI version in place of the sentences when the switch is on, and put them back when it is off', () => {
        aiOffInSettings();
        render(<BriefingCard item={withAi()} format="points"/>);
        expect(screen.getByText('Premier point.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('switch', {name: 'AI version'}));
        expect(screen.getByRole('switch', {name: 'AI version'})).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByText('Written by the AI')).toBeInTheDocument();
        expect(screen.getByText('Un point de l’IA.')).toBeInTheDocument();
        expect(screen.getByText(/gemma4/)).toBeInTheDocument();
        // the sentences of the article are gone, the switch is in the row of the title of the AI version, before the link to the article
        expect(screen.queryByText('Premier point.')).toBeNull();
        expect(screen.queryByText('Second point.')).toBeNull();
        expect(screen.getByText('Written by the AI').parentElement).toContainElement(screen.getByRole('switch', {name: 'AI version'}));
        expect(screen.getByText('Written by the AI').compareDocumentPosition(screen.getByRole('link', {name: /Read the article at/})) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

        fireEvent.click(screen.getByRole('switch', {name: 'AI version'}));
        expect(screen.queryByText('Written by the AI')).toBeNull();
        expect(screen.getByText('Second point.')).toBeInTheDocument();
    });

    it('should show the AI version in place of a translated text too', () => {
        render(<BriefingCard item={withAi({translation: 'Translated passage.', pointsTranslation: 'Point traduit.'})} format="points"/>);
        expect(screen.getByText('Un point de l’IA.')).toBeInTheDocument();
        expect(screen.queryByText('Point traduit.')).toBeNull();
        // the original of the sentences stays one click away, under the AI version
        fireEvent.click(screen.getByRole('button', {name: 'Show original'}));
        expect(screen.getByText(/^Original,/)).toBeInTheDocument();
        expect(screen.getByText('Un point de l’IA.')).toBeInTheDocument();
    });

    it('should show the summary of the AI for the summary, and no switch for the key passages, which the AI did not write again', () => {
        aiOffInSettings();
        const {rerender} = render(<BriefingCard item={withAi({digest: 'Un digest.'})} format="digest"/>);
        fireEvent.click(screen.getByRole('switch', {name: 'AI version'}));
        expect(screen.getByText('Un résumé de l’IA.')).toBeInTheDocument();
        rerender(<BriefingCard item={withAi()} format="passages"/>);
        expect(screen.queryByRole('switch', {name: 'AI version'})).toBeNull();
    });

    it('should show no switch for a card the AI wrote nothing for', () => {
        render(<BriefingCard item={item({points: 'Premier point.'})} format="points"/>);
        expect(screen.queryByRole('switch')).toBeNull();
    });

    it('should put the switch beside the title of a translated text too', () => {
        aiOffInSettings();
        render(<BriefingCard item={withAi({translation: 'Translated passage.', pointsTranslation: 'Point traduit.'})} format="points"/>);
        expect(screen.getByText("In the article's words, translated").parentElement).toContainElement(screen.getByRole('switch', {name: 'AI version'}));
    });
});

// a card with no AI version, the AI having failed when the briefing was written (11.11.2026): the reader can have it written now
describe('BriefingCard, the AI version it has none of', () => {
    afterEach(() => localStorage.removeItem('newsgenerator.ai-first'));
    const none = (changes = {}) => item({points: 'Premier point.\n\nSecond point.', digest: 'Un digest.', ai: null, ...changes});

    it('should offer to write it in the ways that have one, said before the button, and not in the key passages', () => {
        const write = vi.fn();
        const {rerender} = render(<BriefingCard item={none()} format="points" onWriteAi={write}/>);
        expect(screen.getByText('No AI version for this card.')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Write it now'})).toBeInTheDocument();
        expect(screen.queryByRole('switch')).toBeNull();
        // beside the title of the sentences, where the switch will be
        expect(screen.getByText("In the article's words").parentElement).toContainElement(screen.getByRole('button', {name: 'Write it now'}));
        rerender(<BriefingCard item={none()} format="digest" onWriteAi={write}/>);
        expect(screen.getByRole('button', {name: 'Write it now'})).toBeInTheDocument();
        // the key passages have no AI version at all: nothing to write
        rerender(<BriefingCard item={none()} format="passages" onWriteAi={write}/>);
        expect(screen.queryByRole('button', {name: 'Write it now'})).toBeNull();
        // a page that gives no way to write it offers none, and a card that has it has its switch
        rerender(<BriefingCard item={none()} format="points"/>);
        expect(screen.queryByRole('button', {name: 'Write it now'})).toBeNull();
        rerender(<BriefingCard item={none({ai: {points: ['Un point.'], summary: null, model: 'x'}})} format="points" onWriteAi={write}/>);
        expect(screen.queryByRole('button', {name: 'Write it now'})).toBeNull();
        expect(screen.getByRole('switch', {name: 'AI version'})).toBeInTheDocument();
    });

    it('should ask the page to write it, and show the switch once the card has it', async () => {
        const {rerender} = render(<BriefingCard item={none()} format="points" onWriteAi={async () => ({ai: {points: ['Un point de l’IA.'], summary: null, model: 'x'}})}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Write it now'}));
        // the page puts it in the card: the card shows it
        rerender(<BriefingCard item={none({ai: {points: ['Un point de l’IA.'], summary: null, model: 'x'}})} format="points" onWriteAi={async () => ({})}/>);
        await waitFor(() => expect(screen.getByRole('switch', {name: 'AI version'})).toBeInTheDocument());
        expect(screen.getByText('Un point de l’IA.')).toBeInTheDocument();
        expect(screen.queryByText('No AI version for this card.')).toBeNull();
    });

    it('should say why none was written: the AI did not answer, a figure it does not give, the article not read, or the call failed', async () => {
        const answers = [{ai: null, reason: 'no-answer'}, {ai: null, reason: 'unbacked'}, {ai: null, reason: 'unreadable'}];
        const write = vi.fn(async () => answers.shift());
        render(<BriefingCard item={none()} format="points" onWriteAi={write}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Write it now'}));
        expect(await screen.findByText(/The AI did not answer: try again in a few minutes/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Write it now'}));
        expect(await screen.findByText(/a figure it does not give\), so none is kept/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Write it now'}));
        expect(await screen.findByText(/The article could not be read again/)).toBeInTheDocument();
        write.mockRejectedValueOnce(new Error('HTTP 500'));
        fireEvent.click(screen.getByRole('button', {name: 'Write it now'}));
        expect(await screen.findByText(/The AI version was not written: HTTP 500/)).toBeInTheDocument();
        expect(write).toHaveBeenCalledTimes(4);
    });
});

describe('BriefingCard topic', () => {
    // the feeds give "sport", the page shows it as a name (the user, 02.11.2026)
    it('should show the topic of the card with a capital letter', () => {
        render(<BriefingCard item={item({topic: 'sport'})} number={1}/>);
        expect(screen.getByText('Sport')).toBeInTheDocument();
        expect(screen.queryByText('sport')).toBeNull();
    });
});

describe('BriefingCard contested', () => {
    const denial = {by: 'Manchester City', sentence: 'Manchester City denies any wrongdoing.', language: 'en', translation: null,
        source: 'bbc.com', url: 'https://bbc.com/city', publishedAt: '2026-09-24T09:00:00.000Z'};

    it('should quote who denies the news and where', () => {
        render(<BriefingCard item={item({contested: [denial]})}/>);
        // a badge under the title, the quote in the column beside the card: nothing to open
        expect(screen.getByRole('button', {name: 'Contested'})).toBeInTheDocument();
        // orange, as what warns
        expect(screen.getByRole('button', {name: 'Contested'})).toHaveClass('text-accent-ink');
        expect(screen.getAllByText('Contested')).toHaveLength(2);
        expect(screen.getByText(/Manchester City denies:/)).toBeInTheDocument();
        expect(screen.getByText('Manchester City denies any wrongdoing.')).toBeInTheDocument();
        expect(screen.queryByText(/Machine translation/)).toBeNull();
        expect(screen.getByRole('link', {name: 'bbc.com'})).toHaveAttribute('href', 'https://bbc.com/city');
    });

    // the reader reads English: the quote of a French article is its translation, the original on demand (the user, 02.11.2026)
    it('should quote an article written in another language in the language of the reader, its original on demand', () => {
        render(<BriefingCard item={item({contested: [{...denial, by: 'FIFA', language: 'fr', sentence: 'La FIFA, de son côté, nie toute faute.',
            translation: 'FIFA, for its part, denies any fault.', source: 'walfoot.be', url: 'https://walfoot.be/1'}]})}/>);
        expect(screen.getByText(/“FIFA, for its part, denies any fault\.”/)).toBeInTheDocument();
        expect(screen.queryByText('La FIFA, de son côté, nie toute faute.')).toBeNull();
        expect(screen.getByText('Machine translation from French')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Show original'}));
        expect(screen.getByText('“La FIFA, de son côté, nie toute faute.”')).toHaveAttribute('lang', 'fr');
        fireEvent.click(screen.getByRole('button', {name: 'Hide original'}));
        expect(screen.queryByText('La FIFA, de son côté, nie toute faute.')).toBeNull();
    });

    it('should lead from its badge to the quote, in the column beside the card', () => {
        const scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
        render(<BriefingCard item={item({contested: [denial]})}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Contested'}));
        expect(scroll.mock.contexts[0]).toHaveAttribute('id', 'card-1-contested');
        expect(scroll.mock.contexts[0]).toHaveTextContent('Manchester City denies:');
        scroll.mockRestore();
    });

    it('should say nothing on a card nobody denies, or of a briefing made before', () => {
        render(<BriefingCard item={item({contested: []})}/>);
        render(<BriefingCard item={item()}/>);
        expect(screen.queryByText('Contested')).toBeNull();
    });
});

describe('BriefingCard official source', () => {
    it('should quote a statement an article reports, with the medium, in the language of the reader, the original on demand', () => {
        render(<BriefingCard item={item({official: [{party: 'FPF', title: 'A FPF publicou um comunicado.', translation: 'The FPF published a statement.',
            language: 'pt', url: 'https://www.abola.pt/1', source: 'abola.pt', channel: 'reported', publishedAt: null}]})}/>);
        // a badge under the title, the statement in the column beside the card
        expect(screen.getByRole('button', {name: 'Officially confirmed'})).toBeInTheDocument();
        // green, here and over the statement in the column beside the card
        expect(screen.getByRole('button', {name: 'Officially confirmed'})).toHaveClass('text-official');
        expect(screen.getByText('Official sources', {selector: 'p'})).toHaveClass('!text-official');
        expect(screen.getByText(/FPF said it, reported by/)).toBeInTheDocument();
        expect(screen.getByText('“The FPF published a statement.”')).toBeInTheDocument();
        expect(screen.queryByText(/A FPF publicou/)).toBeNull();
        expect(screen.getByText('Machine translation from Portuguese')).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'abola.pt'})).toHaveAttribute('href', 'https://www.abola.pt/1');

        fireEvent.click(screen.getByRole('button', {name: 'Show original'}));
        expect(screen.getByText('“A FPF publicou um comunicado.”')).toHaveAttribute('lang', 'pt');
    });

    it('should show the title of a post of a party in the language of the reader, with the original as its title', () => {
        render(<BriefingCard item={item({official: [{party: 'UEFA', title: 'Ceferin candidat', translation: 'Ceferin candidate',
            url: 'https://uefa.com/1', channel: 'site', publishedAt: null}]})}/>);
        expect(screen.getByRole('link', {name: 'Ceferin candidate'})).toHaveAttribute('title', 'Ceferin candidat');
    });
});

describe('BriefingCard other angles', () => {
    const angle = {title: 'Infantino tiene por ahora el camino despejado', titleTranslation: 'Infantino a pour l’instant le chemin dégagé',
        url: 'https://si.com/infantino', source: 'si.com', language: 'es', publishedAt: '2026-10-08T07:00:00.000Z', media: 3};

    it('should list the other angles, translated, with their source, language and media', () => {
        render(<BriefingCard item={item({angles: [angle]})}/>);
        expect(screen.getByRole('button', {name: 'Angles 1'})).toBeInTheDocument();
        openTab('Angles');
        expect(screen.getByText('Same affair, other angles')).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Infantino a pour l’instant le chemin dégagé'})).toHaveAttribute('href', 'https://si.com/infantino');
        expect(screen.getByText(/told by 3 media/)).toBeInTheDocument();
        expect(screen.getByLabelText('written in Spanish')).toBeInTheDocument();
        expect(screen.queryByText('“Infantino tiene por ahora el camino despejado”')).toBeNull();
    });

    it('should show the original title of an angle with the original of the card', () => {
        render(<BriefingCard item={item({title: 'Summit in Berlin', language: 'en', titleTranslation: 'Sommet à Berlin', angles: [angle]})}/>);
        openTab('Angles');
        fireEvent.click(screen.getByRole('button', {name: 'Show original'}));
        expect(screen.getByText('“Infantino tiene por ahora el camino despejado”')).toBeInTheDocument();
    });

    it('should say nothing on a card without any, or of a briefing made before', () => {
        render(<BriefingCard item={item({angles: []})}/>);
        render(<BriefingCard item={item()}/>);
        expect(screen.queryByRole('button', {name: /^Angles/})).toBeNull();
        expect(screen.queryByText('Same affair, other angles')).toBeNull();
    });
});

describe('BriefingCard AI analysis', () => {
    const analysis = {why: ['The vote decides who leads the federation.'], next: [{if: 'the vote fails', then: 'the plan is dropped.'}],
        timeline: [{date: '2026-10-01', title: 'A first vote', medium: 'bbc.com', url: 'https://bbc.com/vote'}]};

    it('should be the first tab, open at first, plain like the other tabs: no grey box around it', () => {
        render(<BriefingCard item={item()} analysis={analysis} analysisModel="deepseek-v4-pro:0813"/>);
        expect(screen.getByRole('button', {name: 'AI analysis'})).toHaveAttribute('aria-expanded', 'true');
        const panel = document.getElementById('analysis-1');
        expect(panel).toHaveTextContent('Why it matters');
        expect(panel).toHaveTextContent('What could come next');
        expect(panel).toHaveTextContent('Written by the AI (deepseek-v4-pro)');
        expect(panel.className).not.toMatch(/bg-paper-deep|rounded|border/);
        expect(screen.queryByRole('button', {name: 'Hide the AI analysis'})).toBeNull();
    });

    it('should name every model that wrote it, without its version, when deepseek failed on a card and gpt-oss:120b wrote it (8.11.2026)', () => {
        render(<BriefingCard item={item()} analysis={analysis} analysisModel="deepseek-v4-pro:0813 + gpt-oss:120b"/>);
        expect(document.getElementById('analysis-1')).toHaveTextContent('Written by the AI (deepseek-v4-pro + gpt-oss)');
    });

    it('should write a line of what could come next as "If X, then Y", with no point before the "then"', () => {
        render(<BriefingCard item={item()} analysis={analysis} analysisModel="deepseek-v4-pro:0813"/>);
        expect(screen.getByText('the vote fails', {exact: false}).closest('li')).toHaveTextContent('If the vote fails, then the plan is dropped.');
    });
});

describe('BriefingCard picture', () => {
    it('should show the picture of one of its articles, with its site, and leave it out when it fails to load', () => {
        const {container} = render(<BriefingCard item={item({thumbnail: 'https://cdn.example/a.jpg', thumbnailSource: 'lequipe.fr'})}/>);
        const picture = container.querySelector('img');
        expect(picture).toHaveAttribute('src', 'https://cdn.example/a.jpg');
        expect(picture).toHaveAttribute('referrerpolicy', 'no-referrer');
        expect(screen.getByText('Picture — lequipe.fr')).toBeInTheDocument();

        fireEvent.error(picture);
        expect(container.querySelector('img')).toBeNull();
        expect(screen.queryByText('Picture — lequipe.fr')).toBeNull();
    });

    it('should show none on a card without a picture', () => {
        const {container} = render(<BriefingCard item={item({thumbnail: null})}/>);
        expect(container.querySelector('img')).toBeNull();
    });
});

// a picture taller than wide is cut to the landscape of the card nearer its top, where the face is (the user, 10.11.2026, a friend: a photo in portrait mode)
describe('BriefingCard with a standing picture', () => {
    const picture = (container) => container.querySelector('article img');
    const loaded = (img, width, height) => {
        Object.defineProperty(img, 'naturalWidth', {value: width, configurable: true});
        Object.defineProperty(img, 'naturalHeight', {value: height, configurable: true});
        fireEvent.load(img);
    };

    it('should cut a picture taller than wide nearer its top, and a landscape one in the middle', () => {
        const {container} = render(<MemoryRouter><BriefingCard item={item({thumbnail: 'https://cdn.example/portrait.jpg'})}/></MemoryRouter>);
        expect(picture(container)).not.toHaveClass('object-[50%_12%]');
        loaded(picture(container), 800, 1200);
        expect(picture(container)).toHaveClass('object-cover', 'object-[50%_12%]');
    });

    it('should leave a landscape, a square-ish and a picture of no known size in the middle', () => {
        for (const [width, height] of [[1600, 900], [1000, 1000], [1000, 1050], [0, 0]]) {
            const {container, unmount} = render(<MemoryRouter><BriefingCard item={item({thumbnail: 'https://cdn.example/a.jpg'})}/></MemoryRouter>);
            loaded(picture(container), width, height);
            expect(picture(container)).not.toHaveClass('object-[50%_12%]');
            unmount();
        }
    });

    it('should cut an illustration nearer its top whatever its size, as before', () => {
        const illustration = {url: 'https://upload.wikimedia.org/p.jpg', width: 3333, height: 5000, credit: 'Wikimedia Commons'};
        const {container} = render(<MemoryRouter><BriefingCard item={item({thumbnail: illustration.url, thumbnailSource: 'Wikimedia Commons', illustration})}/></MemoryRouter>);
        expect(picture(container)).toHaveClass('object-[50%_12%]');
    });
});

// a title both translated and rewritten by the AI has two versions to go back to, each said on the line that shows it (the user, 10.11.2026)
describe('BriefingCard, a title translated and rewritten by the AI', () => {
    const translatedAndRewritten = () => item({title: 'Ab dieser Spieltag sprechen die Schiedsrichter nach den Spielen', titleTranslation: 'From this matchday onwards referees will speak',
        language: 'de', titleAsPublished: 'Historisch: Ab dieser Spieltag sprechen die Schiedsrichter nach den Spielen', titleRewritten: true});

    it('should say that the title shown by "Show original" is the one the AI rewrote, in its language', () => {
        render(<BriefingCard item={translatedAndRewritten()}/>);
        fireEvent.click(screen.getAllByRole('button', {name: 'Show original'})[0]);
        expect(screen.getByText('German, as the AI rewrote it')).toBeInTheDocument();
        expect(screen.queryByText(/As the medium wrote it/)).toBeNull();
    });

    it('should say that the title shown by "Show the title as published" is the medium\'s own, in its language, not translated', () => {
        render(<BriefingCard item={translatedAndRewritten()}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Show the title as published'}));
        expect(screen.getByText('As the medium wrote it, German')).toBeInTheDocument();
        expect(screen.getByText('“Historisch: Ab dieser Spieltag sprechen die Schiedsrichter nach den Spielen”')).toBeInTheDocument();
    });

    it('should have both lines open at once, each with its label, and the two buttons apart', () => {
        render(<BriefingCard item={translatedAndRewritten()}/>);
        fireEvent.click(screen.getAllByRole('button', {name: 'Show original'})[0]);
        fireEvent.click(screen.getByRole('button', {name: 'Show the title as published'}));
        expect(screen.getByText('German, as the AI rewrote it')).toBeInTheDocument();
        expect(screen.getByText('As the medium wrote it, German')).toBeInTheDocument();
        expect(screen.getByText('“Ab dieser Spieltag sprechen die Schiedsrichter nach den Spielen”')).toBeInTheDocument();
    });

    it('should say the language only for a title that is translated: a rewritten title in the reader\'s own language is "as the medium wrote it"', () => {
        render(<BriefingCard item={item({title: 'From this matchday onwards referees will speak', titleAsPublished: 'Historic: from this matchday onwards referees will speak', titleRewritten: true})}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Show the title as published'}));
        expect(screen.getByText('As the medium wrote it')).toBeInTheDocument();
    });

    it('should label a translated title that was not rewritten with its language only', () => {
        render(<BriefingCard item={item({title: 'Messi signe à Miami', titleTranslation: 'Messi signs in Miami', language: 'fr'})}/>);
        fireEvent.click(screen.getAllByRole('button', {name: 'Show original'})[0]);
        expect(screen.getByText('French')).toBeInTheDocument();
    });
});
