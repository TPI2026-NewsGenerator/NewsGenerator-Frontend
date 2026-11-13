//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: Patterns.jsx
//  Description: The textures of the map of the FIFA presidency, SVG patterns drawn with the colours of the theme only (no hex): the fine dots of a
//               probable position (dots of the colour of the candidate on a light base of the same hue, so a probable reads apart from the
//               solid declared one at a glance and not by lightness alone) and the diagonal hatch of conflicting indications. Two patterns
//               are never alike: dots are round and staggered, the hatch is a line. The map draws them at the size of the screen whatever
//               the zoom (WorldMap sets their transform); a swatch of the legend draws its own
//

// a base of the same hue, light; the dots a deeper shade of the colour: 3.3 to 6 against the base in both themes, for the six colours
const baseOf = (colour) => `color-mix(in srgb, ${colour} 16%, var(--paper))`;
const dotOf = (colour) => `color-mix(in srgb, ${colour} 70%, var(--ink))`;

// the tile: 6 px, two dots of 2.7 px, staggered. id: its id; zoom: the pattern of the map (its transform follows the zoom), marked for it
export const DotPattern = ({id, colour, size = 6, zoom = false}) => (
    <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" data-zoom={zoom ? 'dots' : undefined}>
        <rect width={size} height={size} style={{fill: baseOf(colour)}}/>
        <circle cx={size / 4} cy={size / 4} r={size * 0.225} style={{fill: dotOf(colour)}}/>
        <circle cx={(size * 3) / 4} cy={(size * 3) / 4} r={size * 0.225} style={{fill: dotOf(colour)}}/>
    </pattern>
);

// conflicting indications: lines of the ink at 45 degrees on the grey
export const HatchPattern = ({id, size = 5, zoom = false}) => (
    <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" patternTransform="rotate(45)" data-zoom={zoom ? 'hatch' : undefined}>
        <rect width={size} height={size} style={{fill: 'var(--map-unknown)'}}/>
        <line x1="0" y1="0" x2="0" y2={size} strokeWidth={size * 0.44} style={{stroke: 'var(--ink)'}}/>
    </pattern>
);
