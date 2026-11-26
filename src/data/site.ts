/**
 * Site-wide content. Everything here is dummy text - edit freely.
 */
export interface Social {
  label: string;
  href: string;
}

export interface AwardGroup {
  /** Shown as a header line in the awards column. */
  org: string;
  items: { count: number; label: string }[];
}

export const site = {
  name: 'SHADHAD SHEREEF',
  /** Wordmark in the top-left corner (condensed display font). */
  logo: 'SHADHAD',
  tagline: 'Software Developer',
  // availability: 'Available Jan. 2027',
  description:
    'Milo Ferrand is an independent creative developer building fast, motion-first websites and WebGL experiences.',
  url: 'https://example.com',
  /** Two-line giant heading on the about page. */
  aboutHeading: ['CRAFT', '+CODE'] as [string, string],
  socials: [
    { label: 'Email', href: 'mailto:hello@example.com' },
    { label: 'Instagram', href: 'https://instagram.com/' },
    { label: 'Twitter', href: 'https://twitter.com/' },
    { label: 'LinkedIn', href: 'https://linkedin.com/' },
    { label: 'GitHub', href: 'https://github.com/' },
  ] satisfies Social[],
  /** How many socials are shown in the bottom-right corner on home / project pages. */
  cornerSocials: 3,
  clients: [
    'Atelier Nord',
    'Arcadia Records',
    'Dovetail',
    'Driftwood Press',
    'Folio Society',
    'Fieldnotes',
    'Halcyon Magazine',
    'Maison Vesper',
    'Meridian Watches',
    'Northwind',
    'Solstice Hotels',
    'Studio Basalt',
    'Tidal Foundation',
    'Wildcard',
    'Woodland Trust',
    'Zephyr',
  ],
  awards: [
    {
      org: 'Awwwards',
      items: [
        { count: 14, label: 'Site of the day' },
        { count: 9, label: 'Developer award' },
        { count: 3, label: 'Site of the month' },
        { count: 1, label: 'Independent of the year' },
      ],
    },
    {
      org: 'FWA',
      items: [
        { count: 11, label: 'FWA of the day' },
        { count: 2, label: 'FWA of the month' },
      ],
    },
    {
      org: 'CSS Design Awards',
      items: [
        { count: 8, label: 'Website of the day' },
        { count: 4, label: 'Best UI / UX' },
      ],
    },
  ] satisfies AwardGroup[],
  copyright: 'All rights reserved',
  year: 2026,
};

export type Site = typeof site;
