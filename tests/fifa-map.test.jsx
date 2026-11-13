//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: fifa-map.test.jsx
//  Description: The map of the page "The FIFA presidency": the base map is a light TopoJSON that separates the four nations of the United
//               Kingdom, the 211 associations are drawn (a polygon each or, when too small, a marker), a click or a key opens the sheet,
//               Uncertain has its ring, the legend follows the levels of the server, and no colour is written in the SVG
//
//  The associations and their positions are the invented ones of bench/fifa/mock-data.mjs
//

import '@testing-library/jest-dom';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import process from 'node:process';
import {gzipSync} from 'node:zlib';
import {describe, expect, it, vi} from 'vitest';
import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {ALL_LEVELS, COARSE_LEVELS, buildMock} from '../bench/fifa/mock-data.mjs';
import {describe as describeMember, passes} from '@/features/fifa/positions.js';
import {MARKER_KM2, layoutOf, shapesOf} from '@/features/fifa/geometry.js';
import {WorldMap} from '@/features/fifa/components/WorldMap.jsx';
import {Legend} from '@/features/fifa/components/Legend.jsx';
import {Badge} from '@/components/ui/badge.jsx';

const TOPOLOGY_FILE = resolve(process.cwd(), 'public/fifa-map.topo.json');
// the map is 211 shapes drawn again at each step: under the whole suite running at once a test needs more than 5 s
vi.setConfig({testTimeout: 30000});

const topology = JSON.parse(readFileSync(TOPOLOGY_FILE, 'utf8'));
const FILTERS = {confederation: 'all', level: 'all', search: ''};

const rowsOf = ({levels = ALL_LEVELS, scope = {mode: 'all'}, filters = FILTERS} = {}) => {
    const {map} = buildMock({levels});
    const rows = new Map(map.members.filter(member => member.level === 'association').map(member => {
        const described = describeMember(member, scope, levels, map.subjects);
        return [member.qid, {member, described, visible: passes(member, described, filters)}];
    }));
    return {map, rows};
};

describe('the base map', () => {
    it('should weigh less than 250 KB gzipped', () => {
        expect(gzipSync(readFileSync(TOPOLOGY_FILE)).length).toBeLessThan(250 * 1024);
    });

    it('should separate England, Scotland, Wales and Northern Ireland, and leave Antarctica out', () => {
        const ids = topology.objects.units.geometries.map(geometry => geometry.id);
        for (const nation of ['GB-ENG', 'GB-SCT', 'GB-WLS', 'GB-NIR', 'FR', 'NO', 'XK', 'PS', 'TW']) expect(ids).toContain(nation);
        expect(ids).not.toContain('AQ');
        expect(ids).not.toContain('GB');
    });

    it('should hold a polygon for nearly every one of the 211 members: the others are markers', () => {
        const {map} = rowsOf();
        const ids = new Set(topology.objects.units.geometries.map(geometry => geometry.id));
        const without = map.members.filter(member => member.level === 'association' && !ids.has(member.iso));
        expect(without.map(member => member.fifa)).toEqual(['GIB']);
    });

    it('should draw about fifty members as markers: those with no polygon or under the area of a marker', () => {
        const {map} = rowsOf();
        const layout = layoutOf(map.members, shapesOf(topology));
        expect(layout.polygons.length + layout.markers.length).toBe(211);
        expect(layout.markers.length).toBeGreaterThanOrEqual(40);
        expect(layout.markers.length).toBeLessThanOrEqual(60);
        for (const {member} of layout.polygons) {
            expect(topology.objects.units.geometries.find(geometry => geometry.id === member.iso).properties.km2).toBeGreaterThanOrEqual(MARKER_KM2);
        }
    });
});

describe('WorldMap', () => {
    it('should render the 211 members, a polygon or a marker each, one of them in the tab order', () => {
        const {rows} = rowsOf();
        const {container} = render(<WorldMap topology={topology} rows={rows} selected="" onSelect={vi.fn()}/>);
        const shapes = [...container.querySelectorAll('[data-qid]')];
        expect(shapes).toHaveLength(211);
        expect(container.querySelectorAll('path[data-qid]').length + container.querySelectorAll('g[data-marker]').length).toBe(211);
        expect(container.querySelectorAll('g[data-marker]').length).toBeGreaterThanOrEqual(40);
        expect(shapes.filter(shape => shape.tabIndex === 0)).toHaveLength(1);
        expect(new Set(shapes.map(shape => shape.dataset.qid)).size).toBe(211);
    });

    it('should name each association, its confederation and its position for a screen reader', () => {
        const {rows} = rowsOf();
        render(<WorldMap topology={topology} rows={rows} selected="" onSelect={vi.fn()}/>);
        expect(screen.getByRole('button', {name: /^Brazil, BRA, CONMEBOL: Declared support for Mock candidate A, 1 uncertain signal$/})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /^Afghanistan, AFG, AFC: No known position$/})).toBeInTheDocument();
        expect(screen.getByRole('group', {name: 'Map of the 211 FIFA member associations'})).toBeInTheDocument();
    });

    it('should open the sheet of an association on a click, a polygon or a marker', () => {
        const {rows} = rowsOf();
        const onSelect = vi.fn();
        render(<WorldMap topology={topology} rows={rows} selected="" onSelect={onSelect}/>);
        fireEvent.click(screen.getByRole('button', {name: /^Brazil, BRA/}));
        fireEvent.click(screen.getByRole('button', {name: /^Malta, MLT/}));
        const brazil = [...rows.values()].find(row => row.member.fifa === 'BRA').member.qid;
        const malta = [...rows.values()].find(row => row.member.fifa === 'MLT').member.qid;
        expect(onSelect).toHaveBeenNthCalledWith(1, brazil);
        expect(onSelect).toHaveBeenNthCalledWith(2, malta);
    });

    it('should open the sheet with Enter and move to the next association with an arrow', () => {
        const {rows} = rowsOf();
        const onSelect = vi.fn();
        render(<WorldMap topology={topology} rows={rows} selected="" onSelect={onSelect}/>);
        const brazil = screen.getByRole('button', {name: /^Brazil, BRA/});
        act(() => brazil.focus());
        fireEvent.keyDown(brazil, {key: 'ArrowRight'});
        expect(document.activeElement).not.toBe(brazil);
        expect(document.activeElement.dataset.qid).toBeTruthy();
        fireEvent.keyDown(brazil, {key: 'Enter'});
        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should draw the dotted ring of Uncertain on the grey of an association with signals and no position', () => {
        const {rows} = rowsOf();
        const {container} = render(<WorldMap topology={topology} rows={rows} selected="" onSelect={vi.fn()}/>);
        const rung = [...container.querySelectorAll('[data-ring="true"], g[data-marker][data-kind="uncertain"] .fifa-ring')];
        expect(rung.length).toBeGreaterThan(0);
        // Australia: Uncertain signals on a candidate and no position
        expect(screen.getByRole('button', {name: /^Australia, AUS/})).toHaveAttribute('data-kind', 'uncertain');
        expect(screen.getByRole('button', {name: /^Australia, AUS/})).toHaveAttribute('data-ring', 'true');
        // a coloured association is not ringed
        expect(screen.getByRole('button', {name: /^Brazil, BRA/})).not.toHaveAttribute('data-ring');
    });

    it('should mark the hatch for conflicting indications and never write a hex colour in the SVG', () => {
        const {rows} = rowsOf();
        const {container} = render(<WorldMap topology={topology} rows={rows} selected="" onSelect={vi.fn()}/>);
        expect(screen.getByRole('button', {name: /^Spain, ESP.*Conflicting indications/})).toHaveAttribute('data-kind', 'conflicting');
        expect(container.querySelector('#fifa-hatch')).toBeInTheDocument();
        expect(container.querySelector('svg').outerHTML).not.toMatch(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-zA-Z-])/);
    });

    it('should dim and hide from the keys what the filters leave out', () => {
        const filters = {...FILTERS, confederation: 'UEFA'};
        const {rows} = rowsOf({filters});
        const {container} = render(<WorldMap topology={topology} rows={rows} selected="" onSelect={vi.fn()}/>);
        const brazil = screen.queryByRole('button', {name: /^Brazil, BRA/});
        expect(brazil).toBeNull();
        expect(container.querySelector('[data-dim]')).not.toBeNull();
        expect(container.querySelectorAll('[data-qid]:not([data-dim])').length).toBe(55);
    });

    it('should give the buttons that zoom, and mark the selected association', () => {
        const {rows} = rowsOf();
        const {container} = render(<WorldMap topology={topology} rows={rows} selected={[...rows.values()].find(row => row.member.fifa === 'BRA').member.qid} onSelect={vi.fn()}/>);
        expect(screen.getByRole('button', {name: 'Zoom in'})).toBeEnabled();
        expect(screen.getByRole('button', {name: 'Zoom out'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Reset the zoom'})).toBeDisabled();
        expect(container.querySelector('.fifa-outline[data-state="selected"]')).not.toBeNull();
    });
});

// a probable position drawn with a pattern of dots, a declared one solid: the patterns of the map and what is said of them
describe('WorldMap, declared solid and probable with dots', () => {
    const entry = (position) => ({position, since: '2026-11-01T00:00:00Z', previous: null, changed: false, stale: false, signals_count: 1, last_signal_at: null, uncertain_count: 0, articles_30d: 3, media_30d: 2, basis: [], human: null});
    // rows where small territories (markers) hold a declared, a probable and a conflicting position
    const markerRows = () => {
        const {map} = buildMock();
        const by = {
            MLT: {QMOCK1: entry('soutien_probable')},
            AND: {QMOCK1: entry('soutien_declare')},
            LUX: {QMOCK1: entry('soutien_declare'), QMOCK2: entry('soutien_probable')},
            CYP: {QMOCK2: {...entry('soutien_declare'), human: {value: 'for', by: 'Enzo', at: '2026-11-10T00:00:00Z', newer_evidence: false}, ai_position: 'soutien_probable'}},
        };
        const members = map.members.filter(member => member.level === 'association').map(member => by[member.fifa] ? {...member, positions: by[member.fifa]} : member);
        return new Map(members.map(member => {
            const described = describeMember(member, {mode: 'all'}, ALL_LEVELS, map.subjects);
            return [member.qid, {member, described, visible: true}];
        }));
    };
    it('should draw a declared position solid and a probable one with the dots of its candidate, side by side', () => {
        const {rows} = rowsOf();
        const {container} = render(<WorldMap topology={topology} rows={rows} selected="" onSelect={vi.fn()}/>);
        // Brazil: declared support for A; Peru, its neighbour: probable support for A
        const brazil = screen.getByRole('button', {name: /^Brazil, BRA/});
        const peru = screen.getByRole('button', {name: /^Peru, PER/});
        expect(brazil).toHaveAccessibleName(/Declared support for Mock candidate A/);
        expect(peru).toHaveAccessibleName(/Probable support for Mock candidate A/);
        expect(brazil.style.fill).toBe('var(--cand-1)');
        expect(brazil).not.toHaveAttribute('data-pattern');
        expect(peru).toHaveAttribute('data-pattern', 'fifa-dots-1');
        // the pattern exists in the map, made of round dots; the hatch is a line: they are never alike
        const dots = container.querySelector('pattern#fifa-dots-1');
        expect(dots.querySelectorAll('circle')).toHaveLength(2);
        expect(dots.querySelector('line')).toBeNull();
        const hatch = container.querySelector('pattern#fifa-hatch');
        expect(hatch.querySelector('line')).not.toBeNull();
        expect(hatch.querySelector('circle')).toBeNull();
        // Egypt and Kenya: probable too (Kenya is a vote: solid)
        expect(screen.getByRole('button', {name: /^Egypt, EGY/})).toHaveAttribute('data-pattern', 'fifa-dots-1');
        expect(screen.getByRole('button', {name: /^Kenya, KEN/})).not.toHaveAttribute('data-pattern');
    });

    it('should define a pattern of dots for each colour of a candidate and for an opposition, for a polygon and for a marker, no hex in them', () => {
        const {rows} = rowsOf();
        const {container} = render(<WorldMap topology={topology} rows={rows} selected="" onSelect={vi.fn()}/>);
        for (const key of ['1', '2', '3', '4', '5', '6', 'no']) {
            expect(container.querySelector(`pattern#fifa-dots-${key}`)).not.toBeNull();
            expect(container.querySelector(`pattern#fifa-dots-marker-${key}`)).not.toBeNull();
        }
        expect(container.querySelector('pattern#fifa-hatch-marker')).not.toBeNull();
        for (const pattern of container.querySelectorAll('pattern')) expect(pattern.outerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
        // the patterns of a polygon follow the zoom, the ones of a marker do not (a marker is at the size of the screen already)
        expect(container.querySelector('pattern#fifa-dots-2')).toHaveAttribute('data-zoom', 'dots');
        expect(container.querySelector('pattern#fifa-hatch')).toHaveAttribute('data-zoom', 'hatch');
        expect(container.querySelector('pattern#fifa-dots-marker-2')).not.toHaveAttribute('data-zoom');
        // set at the size of the screen from the start
        expect(container.querySelector('pattern#fifa-dots-2').getAttribute('patternTransform')).toMatch(/^scale\(/);
        expect(container.querySelector('pattern#fifa-hatch').getAttribute('patternTransform')).toMatch(/^rotate\(45\) scale\(/);
    });

    it('should follow the same rule on the markers of small territories: a filled circle declared, the dots probable, the hatch conflicting', () => {
        const rows = markerRows();
        const {container} = render(<WorldMap topology={topology} rows={rows} selected="" onSelect={vi.fn()}/>);
        const marker = (name) => screen.getByRole('button', {name: new RegExp(`^${name},`)});
        expect(marker('Malta')).toHaveAttribute('data-marker', 'true');
        expect(marker('Malta')).toHaveAttribute('data-pattern', 'fifa-dots-marker-1');
        expect(marker('Andorra')).not.toHaveAttribute('data-pattern');
        expect(marker('Andorra').querySelector('.fifa-dot').style.fill).toBe('var(--cand-1)');
        expect(marker('Luxembourg')).toHaveAttribute('data-pattern', 'fifa-hatch-marker');
        // a vote on a marker is solid: Cyprus
        expect(marker('Cyprus')).not.toHaveAttribute('data-pattern');
        expect(marker('Cyprus').querySelector('.fifa-dot').style.fill).toBe('var(--cand-2)');
        // the marker patterns are in the map
        expect(container.querySelector('pattern#fifa-dots-marker-1')).not.toBeNull();
    });

    it('should fade a position older than 90 days and keep the way it is drawn', () => {
        const {rows} = rowsOf();
        render(<WorldMap topology={topology} rows={rows} selected="" onSelect={vi.fn()}/>);
        // Uzbekistan: probable support, 118 days old
        const uzbekistan = screen.getByRole('button', {name: /^Uzbekistan, UZB/});
        expect(uzbekistan).toHaveAttribute('data-stale', 'true');
        expect(uzbekistan).toHaveAttribute('data-pattern', 'fifa-dots-1');
        expect(uzbekistan).toHaveAccessibleName(/older than 90 days/);
        expect(screen.getByRole('button', {name: /^Peru, PER/})).not.toHaveAttribute('data-stale');
    });
});

describe('Legend', () => {
    const subjects = buildMock().map.subjects;
    const entries = () => within(screen.getByRole('list', {name: 'Legend'})).getAllByRole('listitem').map(item => item.textContent);
    const swatches = (legend) => [...legend.querySelectorAll('[id^="fifa-dots-key-"]')].map(pattern => pattern.id);

    it('should have an entry for each way of drawing, built from the levels: Declared solid, Probable dots, Conflicting hatch, Uncertain ring, Unknown grey', () => {
        render(<Legend scope={{mode: 'all'}} subjects={subjects} levels={ALL_LEVELS}/>);
        expect(entries()).toEqual(['Mock candidate A', 'Mock candidate B', 'Mock candidate C', 'Declared: solid', 'Probable: dots', 'Conflicting indications', 'Uncertain: signals, no position', 'Unknown']);
        expect(screen.getByText(/Solid colour: declared, or confirmed by a reader\. Dots: read from the news, not confirmed by a reader\./)).toBeInTheDocument();
        const legend = screen.getByRole('list', {name: 'Legend'});
        // the entry of Probable and the candidates draw dots, the entry of Declared a solid dot, Conflicting the hatch
        expect(swatches(legend)).toEqual(['fifa-dots-key-1', 'fifa-dots-key-2', 'fifa-dots-key-3', 'fifa-dots-key-neutral']);
        expect(legend.querySelector('[id="fifa-hatch-key"]')).not.toBeNull();
    });

    it('should have no entry of Probable when the levels hold no probable level, and none of Declared when they hold no declared one', () => {
        const {rerender} = render(<Legend scope={{mode: 'all'}} subjects={subjects} levels={['soutien_declare', 'inconnue', 'non_soutien_declare']}/>);
        expect(entries()).toEqual(['Mock candidate A', 'Mock candidate B', 'Mock candidate C', 'Declared: solid', 'Conflicting indications', 'Uncertain: signals, no position', 'Unknown']);
        expect(screen.queryByText(/Dots: read from the news/)).toBeNull();
        expect(swatches(screen.getByRole('list', {name: 'Legend'}))).toEqual([]);
        // the merged level is solid: neither entry
        rerender(<Legend scope={{mode: 'all'}} subjects={subjects} levels={COARSE_LEVELS}/>);
        expect(entries()).toEqual(['Mock candidate A', 'Mock candidate B', 'Mock candidate C', 'Conflicting indications', 'Uncertain: signals, no position', 'Unknown']);
        rerender(<Legend scope={{mode: 'all'}} subjects={subjects} levels={['soutien_probable', 'inconnue']}/>);
        expect(entries()).toContain('Probable: dots');
        expect(entries()).not.toContain('Declared: solid');
    });

    it('should list the candidates, conflicting, Uncertain and unknown in the overview', () => {
        render(<Legend scope={{mode: 'all'}} subjects={subjects} levels={ALL_LEVELS}/>);
        const legend = screen.getByRole('list', {name: 'Legend'});
        for (const text of ['Mock candidate A', 'Mock candidate B', 'Mock candidate C', 'Conflicting indications', 'Uncertain: signals, no position', 'Unknown']) {
            expect(within(legend).getByText(text)).toBeInTheDocument();
        }
    });

    it('should draw the scale from yes to no with the enabled levels only, when a candidate is chosen', () => {
        const {rerender} = render(<Legend scope={{mode: 'candidate', subject: 'QMOCK1'}} subjects={subjects} levels={ALL_LEVELS}/>);
        const labels = () => within(screen.getByRole('list', {name: 'Legend'})).getAllByRole('listitem').map(item => item.textContent);
        expect(labels()).toEqual(['Declared support', 'Probable support', 'No known position', 'Probable opposition', 'Declared opposition', 'Uncertain: signals, no position', 'Unknown']);
        // Probable support: the dots of the candidate; Probable opposition: the dots of the ink; the declared ones are solid
        expect([...screen.getByRole('list', {name: 'Legend'}).querySelectorAll('[id^="fifa-dots-key-"]')].map(pattern => pattern.id)).toEqual(['fifa-dots-key-1', 'fifa-dots-key-no']);
        rerender(<Legend scope={{mode: 'candidate', subject: 'QMOCK1'}} subjects={subjects} levels={COARSE_LEVELS}/>);
        expect(labels()).toEqual(['Support', 'No known position', 'Uncertain: signals, no position', 'Unknown']);
        expect(screen.getByText('Opposition is not read from the news reliably yet: it shows only where a reader set it.')).toBeInTheDocument();
    });

    it('should draw the candidates, with no scale of articles, when no candidate is chosen', () => {
        render(<Legend scope={{mode: 'all'}} subjects={subjects} levels={ALL_LEVELS}/>);
        const items = within(screen.getByRole('list', {name: 'Legend'})).getAllByRole('listitem').map(item => item.textContent);
        expect(items).toEqual(expect.arrayContaining(subjects.map(subject => subject.name)));
        expect(items).toContain('Conflicting indications');
        expect(items).not.toContain('No article');
        expect(items).not.toContain('60 or more');
    });
});

describe('Badge', () => {
    it('should be a plain label without onClick and a button with it', () => {
        const {rerender} = render(<Badge tone="uncertain">Uncertain</Badge>);
        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.getByText('Uncertain')).toHaveClass('border-dashed');
        rerender(<Badge tone="warn" onClick={vi.fn()}>Contested</Badge>);
        expect(screen.getByRole('button', {name: 'Contested'})).toBeInTheDocument();
    });
});
