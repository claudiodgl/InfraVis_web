// The nine InfraVis partner universities (infravis.se/about-infravis, 2026-11).
// map: the projected campus point is in static/lib/geo/sweden.json (pipeline/
// build_geo.mjs); logo: which of the nine circles of the InfraVis mark the
// node becomes in the finale (LOGO_NODES below), chosen so north stays up
// and west stays left as the map folds into the mark.
export const NODES = [
  { id: 'umu', name: 'Umeå University', short: 'UmU', city: 'Umeå', logo: 0, logoFile: 'umu' },
  { id: 'miun', name: 'Mid Sweden University', short: 'MIUN', city: 'Sundsvall · Östersund', logo: 1, logoFile: 'miun' },
  { id: 'uu', name: 'Uppsala University', short: 'UU', city: 'Uppsala', logo: 2, logoFile: 'uu' },
  { id: 'kth', name: 'KTH Royal Institute of Technology', short: 'KTH', city: 'Stockholm', logo: 3, logoFile: 'kth' },
  { id: 'liu', name: 'Linköping University', short: 'LiU', city: 'Linköping · Norrköping', logo: 4, logoFile: 'liu' },
  { id: 'chalmers', name: 'Chalmers University of Technology', short: 'Chalmers', city: 'Gothenburg', logo: 5, logoFile: 'chalmers' },
  { id: 'gu', name: 'University of Gothenburg', short: 'GU', city: 'Gothenburg', logo: 6, logoFile: 'gu' },
  { id: 'lnu', name: 'Linnaeus University', short: 'LNU', city: 'Växjö · Kalmar', logo: 7, logoFile: 'lnu' },
  { id: 'lu', name: 'Lund University', short: 'LU', city: 'Lund', logo: 8, logoFile: 'lu' },
];
export const NODE = Object.fromEntries(NODES.map((n) => [n.id, n]));

// centres of the nine node circles in the mark's own units (viewBox
// 0 0 131.18 149.03, assets/logos/infravis/infravis-mark.svg), read off a
// 655 px render; and the colour of the logo gradient at each one
export const LOGO_VIEWBOX = [0, 0, 131.18, 149.03];
export const LOGO_NODES = [
  { x: 54.5, y: 7.0, color: '#ed6a21' },    // top
  { x: 124.2, y: 20.6, color: '#ffed00' },  // the yellow tip
  { x: 74.5, y: 34.6, color: '#e84b1a' },
  { x: 94.7, y: 45.5, color: '#ed6a21' },
  { x: 27.0, y: 52.5, color: '#c4123f' },
  { x: 7.0, y: 85.7, color: '#4a4597' },    // far left
  { x: 27.0, y: 86.5, color: '#7d2a8a' },
  { x: 27.0, y: 121.8, color: '#1d71b8' },
  { x: 71.1, y: 141.2, color: '#5a3d93' },  // bottom
];
export const LOGO_NODE_R = 6.8;   // (measured on a render of the mark)

export const nodeColor = (id) => LOGO_NODES[NODE[id].logo].color;
