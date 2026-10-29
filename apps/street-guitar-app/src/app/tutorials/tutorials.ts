export type TutorialId = 'chord-wheels' | 'strum-along-g' | 'strum-check' | 'puttin-it-together';

export interface TutorialMeta {
  id: TutorialId;
  title: string;
  eyebrow: string;
  blurb: string;
}

/** Book 1 · Chapter 2 (Open String Chords) practice apps */
export const TUTORIALS: Record<TutorialId, TutorialMeta> = {
  'chord-wheels': {
    id: 'chord-wheels',
    title: 'Chord Wheels',
    eyebrow: 'Book 1 · Chapter 2',
    blurb: 'Find the common finger and the guide finger in every chord switch.',
  },
  'strum-along-g': {
    id: 'strum-along-g',
    title: 'Strum Along in G',
    eyebrow: 'Strumming practice',
    blurb: 'Keep the hand moving: three patterns, then lift off.',
  },
  'strum-check': {
    id: 'strum-check',
    title: 'Strum Check',
    eyebrow: 'Keep it moving',
    blurb: 'The camera watches your strumming hand and checks every arrow.',
  },
  'puttin-it-together': {
    id: 'puttin-it-together',
    title: "Puttin' It All Together",
    eyebrow: 'Book 1 · Chapter 2',
    blurb: 'The four progressions: one strum then switch, then the full pattern.',
  },
};
