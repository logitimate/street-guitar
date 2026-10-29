/**
 * David's open-chord fingerings (Book 1, Ch 2) and the common / guide finger rule.
 * Ported from street-guitar-apps/shared/open-chords.js.
 *
 * Strings run low E → high e. Each entry is [fret, finger], 0 = open, null = not played.
 * Common finger: same finger, same string, same fret in both chords.
 * Guide finger:  same finger, same string, new fret (it slides, never lifts).
 */
export type Fret = [fret: number, finger: number] | 0 | null;
export type ChordName = 'G' | 'A' | 'Am' | 'C' | 'D' | 'Dm' | 'E' | 'Em';

export const CHORDS: Record<ChordName, Fret[]> = {
  G:  [[3, 2], [2, 1], 0, 0, [3, 3], [3, 4]],
  D:  [null, null, 0, [2, 1], [3, 3], [2, 2]],
  C:  [null, [3, 3], [2, 2], 0, [1, 1], 0],
  A:  [null, 0, [2, 2], [2, 1], [2, 3], 0],
  Dm: [null, null, 0, [2, 2], [3, 3], [1, 1]],
  E:  [0, [2, 2], [2, 3], [1, 1], 0, 0],
  Em: [0, [2, 1], [2, 2], 0, 0, 0],
  Am: [null, 0, [2, 2], [2, 3], [1, 1], 0],
};

export const CHORD_LABEL: Record<ChordName, string> = {
  G: 'G', D: 'D', C: 'C', A: 'A', Dm: 'D minor', E: 'E', Em: 'E minor', Am: 'A minor',
};

export const STRING_NAMES = ['low E', 'A', 'D', 'G', 'B', 'high E'];

export interface Moves {
  /** common fingers */
  cf: number[];
  /** guide fingers */
  gf: number[];
  /** guide finger → its lowest string index */
  gs: Record<number, number>;
}

export function moves(a: ChordName, b: ChordName): Moves {
  const A = CHORDS[a], B = CHORDS[b];
  const out: Moves = { cf: [], gf: [], gs: {} };
  A.forEach((p, s) => {
    const q = B[s];
    if (!p || !q || q[1] !== p[1]) return;
    if (q[0] === p[0]) {
      if (!out.cf.includes(p[1])) out.cf.push(p[1]);
    } else if (!(p[1] in out.gs)) {
      out.gf.push(p[1]);
      out.gs[p[1]] = s;
    }
  });
  // a finger that stays down on one string cannot also slide on another
  out.gf = out.gf.filter(f => !out.cf.includes(f));
  out.cf.sort();
  out.gf.sort();
  return out;
}

/** fingers a chord uses, sorted */
export function fingersOf(c: ChordName): number[] {
  const f = new Set<number>();
  CHORDS[c].forEach(p => { if (p) f.add(p[1]); });
  return [...f].sort();
}

export function listWords(a: number[]): string {
  return a.length === 1 ? String(a[0]) : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
}
