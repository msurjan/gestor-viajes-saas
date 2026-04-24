export const ANGLES = [
  {
    label: 'Global — próximos',
    prompt: (q: string, ex: string) =>
      `Find 5 upcoming events related to: "${q}".
Include events of different scales — from major international to mid-size conferences.
Return a variety: different countries, different months, different organizers.${ex}`,
  },
  {
    label: 'América Latina e Iberoamérica',
    prompt: (q: string, ex: string) =>
      `Find 5 upcoming events related to "${q}" taking place specifically in Latin America or Spain — Mexico, Colombia, Chile, Peru, Brazil, Argentina, Ecuador, Bolivia, or any Ibero-American country.
Include both large regional congresses and smaller local events.${ex}`,
  },
  {
    label: 'Europa, Asia y Oceanía',
    prompt: (q: string, ex: string) =>
      `Find 5 upcoming events related to "${q}" taking place in Europe, Asia, Middle East, or Oceania.
Look across multiple countries — not only the most famous venues. Include trade shows, summits, and technical conferences.${ex}`,
  },
  {
    label: 'Nicho y especializados',
    prompt: (q: string, ex: string) =>
      `Find 5 NICHE, REGIONAL, or HIGHLY SPECIALIZED events related to "${q}".
Avoid the most mainstream or widely publicized events. Focus on events that serve specific industry sub-segments, specific professional communities, or specific geographic markets that are often overlooked.${ex}`,
  },
  {
    label: '2027 y eventos futuros',
    prompt: (q: string, ex: string) =>
      `Find 5 events related to "${q}" scheduled for the second half of 2026 or during 2027.
Include events with confirmed dates AND annual recurring events that are expected to occur based on their historical cycle. Be creative — look beyond the first page of results.${ex}`,
  },
] as const

export type AngleIndex = 0 | 1 | 2 | 3 | 4
