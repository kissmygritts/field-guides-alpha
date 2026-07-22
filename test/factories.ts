// Minimal well-formed guide object (pre-parse input) used across tests.
// Structured clone so a test can mutate a copy without affecting others.

export function validGuideInput(): Record<string, unknown> {
  return structuredClone({
    masthead: {
      eyebrow: 'Sample route',
      title: 'A *scaffold* loop',
      dek: 'Validates the **data layer**.',
      meta: ['2 days', '4 stops'],
      startDate: '2026-09-17',
    },
    moon: { start: '2026-09-17', end: '2026-09-18' },
    darkSites: 'Great Basin skies.',
    days: [
      {
        theme: 'Day one',
        route: 'A → B',
        summary: 'Easy *first* day.',
        legs: [{ at: '07:00', text: 'Roll out' }],
        brief: [
          { label: 'Fuel', value: 'Top off — **no services**.', icon: '⛽' },
          { label: 'Signal', value: 'Dead past the cattle guard.', warn: true },
        ],
        stops: [
          {
            id: 'trailhead',
            name: 'North Trailhead',
            badge: 'state park',
            optional: false,
            when: 'Low AM',
            teaser: 'A *gentle* warm-up.',
            description: 'Shoot **wide** early.',
            location: 'Basin State Park',
            gps: { lat: 39.1234, lng: -114.5678, label: 'North Trailhead', elev: 6120 },
            directions: [{ label: 'Light', value: 'Backlit before 9am.' }],
            theShot: 'Get **low**.',
            images: [
              {
                file: 'trailhead-wide.webp',
                role: 'wide',
                source: 'wikimedia',
                artist: 'A. Photographer',
                license: 'CC BY-SA 4.0',
                licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
                sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sample.jpg',
              },
            ],
          },
        ],
      },
    ],
    fieldNotes: [{ heading: 'Water', body: 'Carry **all** of it.' }],
    colophon: { artDirection: 'Field Guide', photographers: 'Per-image', route: 'Scouted' },
  })
}
