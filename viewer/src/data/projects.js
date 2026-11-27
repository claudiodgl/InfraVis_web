// InfraVis support projects used by the story and the site. Facts from the
// project pages on infravis.se (read 2026-11-26); `nodes` are the InfraVis
// nodes that did the support work, `users` the researchers' home
// institutions where the page states them. `people` are named on the page
// (application experts first). Images are the pages' own; the site loads
// them lazily, the story never needs them.
//
// thread: which chapter of the story a project belongs to.
// verify: true marks text that still needs checking with the team.

export const PROJECTS = [
  {
    id: 'forestvis', thread: 'forest', year: 2026,
    title: 'ForestVis',
    subtitle: 'Individual trees in forest 3D point clouds',
    nodes: ['lnu'], users: ['lnu'],
    domain: 'Forest science · remote sensing', technique: 'Web 3D point clouds, linked views',
    blurb: 'A web tool that turns airborne LiDAR into a forest you can walk through: every tree measured, coloured by height or NDVI, filtered with linked histograms and a UMAP of tree statistics.',
    people: [
      { name: 'Benjamin Powley', node: 'lnu' }, { name: 'Petra Horváth', node: 'lnu' },
      { name: 'Claudio D. G. Linhares', node: 'lnu' }, { name: 'Amilcar Soares', node: 'lnu' },
      { name: 'Johan E. S. Fransson', node: 'lnu', role: 'researcher' },
    ],
    url: 'https://infravis.se/forestvis-visualizing-individual-tree-characteristics-in-forest-3d-point-clouds-using-remote-sensing-data/',
    image: 'https://infravis.se/wp-content/uploads/2026/06/forest-vis.png',
    code: 'https://github.com/BenPowley/ForestVis-Demo',
  },
  {
    id: 'forest-to-fork', thread: 'fork', year: 2026,
    title: 'Forest to fork',
    subtitle: 'Deforestation and carbon embodied in commodity trade',
    nodes: ['liu'], users: ['chalmers'],
    domain: 'Land use · climate · trade', technique: 'Public web dashboard (maps, flows)',
    blurb: 'A public dashboard of the DeDuCE model: deforestation and carbon emissions, 2001–2023, for 180+ commodities and countries, followed along the trade routes to the people who consume them.',
    people: [
      { name: 'Måns Gezelius', node: 'liu' }, { name: 'Ylva Selling', node: 'liu' }, { name: 'Yin He', node: 'liu' },
      { name: 'Martin Persson', node: 'chalmers', role: 'researcher' }, { name: 'Chandrakant Singh', node: 'chalmers', role: 'researcher' },
    ],
    url: 'https://infravis.se/forest-to-fork-building-a-platform-for-tracking-deforestation-and-carbon-emissions-embodied-in-the-trade-of-agricultural-commodities/',
    image: 'https://infravis.se/wp-content/uploads/2026/08/forest-fork-4.png',
  },
  {
    id: 'amazon', thread: 'amazon', year: 2026, verify: true,
    title: 'Amazon from within',
    subtitle: 'The flooded forest of Mamirauá, and the jaguars that live in its canopy',
    nodes: ['lnu'], users: [],
    domain: 'Ecology · conservation', technique: 'Real-time 3D landscape, data-driven animals, film + explorer',
    blurb: 'A 97 km stretch of Amazon várzea rebuilt from satellite, elevation and flood data, with a streamed forest and jaguars that climb the trees during the flood season, told as a film and opened up as an explorer.',
    people: [{ name: 'Claudio D. G. Linhares', node: 'lnu' }],
    url: 'https://github.com/claudiodgl/AmazonMamiraua',
  },
  {
    id: 'buzz', thread: 'pollinators', year: 2023,
    title: 'Visualizing Buzz Pollination',
    subtitle: 'How a bee shakes pollen out of a flower',
    nodes: ['kth'], users: ['uu'],
    domain: 'Plant–pollinator biology', technique: 'Physics simulation, rendered film',
    blurb: 'A Blender simulation of 10,000 pollen grains inside a Solanum anther, shaken out by a bumblebee\'s buzz: research on pollination, pesticides and the bees we depend on.',
    people: [
      { name: 'Filip Berendt', node: 'kth' }, { name: 'Ingemar Markström', node: 'kth' },
      { name: 'Mario Vallejo-Marin', node: 'uu', role: 'researcher' },
    ],
    url: 'https://infravis.se/visualizing-buzz-pollination/',
    image: 'https://infravis.se/wp-content/uploads/2023/12/BuzzPollinationThumbnail.png',
  },
  {
    id: 'butterflies', thread: 'pollinators', year: 2023,
    title: 'Butterflies in Virtual Reality',
    subtitle: 'Segmenting microCT scans by hand, in VR',
    nodes: ['lu'], users: ['lu'],
    domain: 'Evolutionary biology', technique: 'VR segmentation of microCT',
    blurb: 'A VR brush for carving butterfly heads out of microCT scans, to study how their eyes and brains evolve with their environment.',
    people: [
      { name: 'Jens Nirme', node: 'lu' }, { name: 'Joakim Eriksson', node: 'lu' }, { name: 'Mattias Wallergård', node: 'lu' },
      { name: 'Sridhar Halali', node: 'lu', role: 'researcher' },
    ],
    url: 'https://infravis.se/butterflies-in-virtual-reality-developing-workflows-for-efficient-morphological-segmentation-and-analysis-of-microct-scans-lu/',
  },
  {
    id: 'genomelens', thread: 'pollinators', year: 2025,
    title: 'GenomeLens',
    subtitle: 'Genome-wide variation, chromosome by chromosome',
    nodes: ['umu', 'lnu', 'gu'], users: [],
    domain: 'Population genomics', technique: 'Open-source web tool',
    blurb: 'A browser tool for exploring genetic variation along chromosomes: Atlantic and Mediterranean krill populations, and the signatures selection leaves behind.',
    people: [
      { name: 'Amilcar Soares', node: 'lnu' }, { name: 'Ahmad Abdou', node: null }, { name: 'Matteo Tomasini', node: null }, { name: 'Kajsa Palm', node: 'umu' },
    ],
    url: 'https://infravis.se/genomelens/',
    image: 'https://infravis.se/wp-content/uploads/2025/05/meganyctiphanes_norvegica_full_20240301-AW_filtered-Copy-1024x702.jpg',
  },
  {
    id: 'darkness', thread: 'darkness', year: 2026,
    title: 'Darkness Matters',
    subtitle: 'A fulldome documentary on light pollution',
    nodes: ['kth'], users: [],
    domain: 'Light pollution · skyglow', technique: 'Fulldome, VR (satellite night lights)',
    blurb: 'Satellite night-light data turned into skyglow maps and projected into the dome: how much of the night sky we have already lost, and how much more we stand to lose.',
    people: [{ name: 'Julius Häger', node: 'kth' }, { name: 'Costanza Julia Bani', node: null, role: 'researcher' }],
    url: 'https://infravis.se/darkness-matters/',
    image: 'https://infravis.se/wp-content/uploads/2026/08/Darkness-Matters-1024x768.png',
  },
  {
    id: 'past', thread: 'heritage', year: 2026,
    title: 'PAST – Platsen Asine Spår och Tid',
    subtitle: 'Touchscreen storytelling at the Gustavianum',
    nodes: ['umu', 'gu'], users: ['uu'],
    domain: 'Archaeology · museums', technique: 'Interactive installation (3D, maps, archives)',
    blurb: 'An interactive table at the Gustavianum Museum in Uppsala that tells the story of the Swedish excavations at Asine, Greece, with 3D finds, photographs and maps.',
    people: [
      { name: 'Mattis Lindmark', node: 'umu' }, { name: 'Kajsa Palm', node: 'umu' }, { name: 'Tristan Bridge', node: 'gu' },
      { name: 'Anna Foka', node: 'uu', role: 'researcher' },
    ],
    url: 'https://infravis.se/past-platsen-asine-spar-och-tid/',
    image: 'https://infravis.se/wp-content/uploads/2026/09/PAST-objects.jpg',
  },
  {
    id: 'eyes', thread: 'molecules', year: 2026,
    title: 'Truth is in the eyes of the solver',
    subtitle: 'Eye tracking on 3D molecules, in VR',
    nodes: ['miun', 'umu', 'lu'], users: ['umu'],
    domain: 'Chemistry education', technique: 'VR + eye tracking',
    blurb: 'Students rotate molecules in VR while an eye tracker records where they look; fixations are mapped to atoms and replayed to see how experts and novices reason in 3D.',
    people: [
      { name: 'Emin Zerman', node: 'miun' }, { name: 'Liang Zhou', node: 'miun' }, { name: 'Henrik Garde', node: 'lu' }, { name: 'Mattis Lindmark', node: 'umu' },
      { name: 'Karolina Broman', node: 'umu', role: 'researcher' },
    ],
    url: 'https://infravis.se/truth-is-in-the-eyes-of-the-solver-an-eye-tracking-study-of-three-dimensional-chemical-structure-problems/',
    image: 'https://infravis.se/wp-content/uploads/2026/11/VRgaze_replay2.png',
  },
  {
    id: 'nutrients', thread: 'molecules', year: 2026,
    title: 'Advanced Visualization for Nutrient Recovery',
    subtitle: 'Finding phosphate inside ash particles',
    nodes: ['kth'], users: ['umu'],
    domain: 'Environmental chemistry', technique: 'X-ray micro-CT volumes',
    blurb: 'Per-voxel diffraction matching inside micro-CT scans of ash and soot, mapping where the phosphate is, so it can be recovered rather than end up as algal blooms.',
    people: [{ name: 'Ingemar Markström', node: 'kth' }, { name: 'Anna Strandberg', node: 'umu', role: 'researcher' }],
    url: 'https://infravis.se/advanced-visualization-for-nutrient-recovery/',
    image: 'https://infravis.se/wp-content/uploads/2026/10/xrdf5.png',
  },
  {
    id: 'synthetic-sweden', thread: 'society', year: 2025,
    title: 'Synthetic Sweden',
    subtitle: 'What synthetic census data can and cannot tell',
    nodes: ['liu'], users: ['liu'],
    domain: 'Demography · social science', technique: 'Touch-table map installation',
    blurb: 'Synthetic demographic data on a touch-table map, extending the "Sweden in Numbers" installation at the Visualization Center in Norrköping.',
    people: [{ name: 'Yin He', node: 'liu' }, { name: 'Måns Gezelius', node: 'liu' }, { name: 'Rickard Falk', node: 'liu' }, { name: 'Ericka Johnson', node: 'liu', role: 'researcher' }],
    url: 'https://infravis.se/synthetic-sweden-exploring-applications-and-limitations-of-synthetic-demographic-data/',
    image: 'https://infravis.se/wp-content/uploads/2025/08/left.png',
  },
  {
    id: 'miljovis', thread: 'society', year: 2023,
    title: 'MiljöVis II & MålVis',
    subtitle: 'Air, sound and social impact in 3D city models',
    nodes: ['chalmers'], users: ['chalmers'],
    domain: 'Urban planning', technique: '3D city models with auralisation',
    blurb: 'Air quality and traffic noise, heard and seen inside 3D city models, beside social-impact data: a visual language for planning decisions.',
    people: [{ name: 'Fabio Latino', node: 'chalmers' }, { name: 'Beata Stahre Wästberg', node: 'chalmers', role: 'researcher' }],
    url: 'https://infravis.se/miljovis-ii-malvis-2022-2024/',
    image: 'https://infravis.se/wp-content/uploads/2023/12/Screenshot-2023-12-18-at-15.20.25-1-edited.png',
  },
  {
    id: 'nek5000', thread: 'flow', year: 2023,
    title: 'In-situ visualization in Nek5000',
    subtitle: 'Seeing the flow while the supercomputer computes it',
    nodes: ['kth'], users: ['kth'],
    domain: 'Fluid dynamics · aerospace', technique: 'In-situ visualization on HPC',
    blurb: 'Wind around aircraft wings visualised during the simulation itself, so the data can be analysed before it is thrown away.',
    people: [{ name: 'Ingemar Markström', node: 'kth' }, { name: 'Tino Weinkauf', node: 'kth' }, { name: 'Philipp Schlatter', node: 'kth', role: 'researcher' }],
    url: 'https://infravis.se/in-situ-visualization-support-in-nek5000/',
  },
  {
    id: 'human-timeline', thread: 'heritage', year: 2026,
    title: 'Human Timeline',
    subtitle: 'Human culture and environment, side by side in time',
    nodes: ['kth', 'miun', 'umu'], users: [],
    domain: 'Archaeology', technique: 'Web app (stacked timelines)',
    blurb: 'Stacked timelines of archaeological periods, isotope records and species, to see how people and their environment changed together.',
    people: [{ name: 'Liang Zhou', node: 'miun' }, { name: 'Kajsa Palm', node: 'umu' }, { name: 'Jaume Nualart', node: null }],
    url: 'https://infravis.se/human-timeline/',
    image: 'https://infravis.se/wp-content/uploads/2026/02/smallPic.png',
  },
];
export const PROJECT = Object.fromEntries(PROJECTS.map((p) => [p.id, p]));

// every node a project touches (support + users), for the map's edges
export const projectNodes = (p) => [...new Set([...p.nodes, ...p.users, ...p.people.map((x) => x.node).filter(Boolean)])];
