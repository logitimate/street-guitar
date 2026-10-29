import { GuitarAudioService } from './guitar-audio.service';

export interface SlotClockOptions<E> {
  /** seconds per slot (an eighth note), read every tick so tempo changes apply live */
  slotSec: () => number;
  /** schedule audio for slot i at audio time t; return what to show when it sounds */
  schedule: (i: number, t: number) => E;
  /** called on the animation frame when slot's audio time arrives */
  show: (e: E) => void;
}

/**
 * Look-ahead scheduler: audio is queued ~120ms ahead on the AudioContext clock
 * (sample accurate), and visuals fire on requestAnimationFrame when their time comes.
 */
export class SlotClock<E> {
  private timer: ReturnType<typeof setInterval> | null = null;
  private raf = 0;
  private nextTime = 0;
  private n = 0;
  private queue: { t: number; e: E }[] = [];

  constructor(private audio: GuitarAudioService, private opts: SlotClockOptions<E>) {}

  get running() { return this.timer !== null; }

  start() {
    if (!this.audio.ensure() || this.running) return;
    this.n = 0;
    this.queue = [];
    this.nextTime = this.audio.now + 0.15;
    this.tick();
    this.timer = setInterval(() => this.tick(), 25);
    const frame = () => {
      const now = this.audio.now;
      while (this.queue.length && this.queue[0].t <= now) this.opts.show(this.queue.shift()!.e);
      if (this.running) this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    cancelAnimationFrame(this.raf);
    this.queue = [];
    this.audio.damp();
  }

  private tick() {
    while (this.nextTime < this.audio.now + 0.12) {
      this.queue.push({ t: this.nextTime, e: this.opts.schedule(this.n, this.nextTime) });
      this.nextTime += this.opts.slotSec();
      this.n++;
    }
  }
}

/** counts for 8 eighth-note slots: 1 & 2 & 3 & 4 & */
export const COUNTS = ['1', '&', '2', '&', '3', '&', '4', '&'];

/** Strum patterns from the book: 1 = hit, 0 = keep the hand moving but miss (gray arrow). */
export const PATTERNS = {
  1: { name: 'Pattern 1', arrows: '↓ ↓↑ ↓ ↓↑', hits: [1, 0, 1, 1, 1, 0, 1, 1] },
  2: { name: 'Pattern 2', arrows: '↓ ↓↑↓↑↓↑', hits: [1, 0, 1, 1, 1, 1, 1, 1] },
  // beat 3 is tied to the & of 2: hold it, don't strum it
  3: { name: 'Pattern 3', arrows: '↓ ↓↑ ↑↓↑', hits: [1, 0, 1, 1, 0, 1, 1, 1] },
} as const;
export type PatternId = keyof typeof PATTERNS;

/** Strum Along / Strum Check modes: a pattern, all 3 (2 bars each), or Lift Off (Pattern 3, last & lifts) */
export type StrumMode = PatternId | 'all' | 'lift';
export const LIFT_SLOT = 7;
export const STRUM_PICKS: { mode: StrumMode; name: string; sub: string; wide?: boolean }[] = [
  ...([1, 2, 3] as const).map(p => ({ mode: p, name: PATTERNS[p].name, sub: PATTERNS[p].arrows })),
  { mode: 'all', name: 'All 3', sub: '2 bars each' },
  { mode: 'lift', name: 'Last Step: Lift Off', sub: 'G over and over, the red arrow = lift off', wide: true },
];

export function patternForBar(mode: StrumMode, bar: number): PatternId {
  if (mode === 'all') return ((Math.floor(bar / 2) % 3) + 1) as PatternId;
  return mode === 'lift' ? 3 : mode;
}

export function modeLabel(mode: StrumMode): string {
  return mode === 'lift' ? 'Lift Off' : mode === 'all' ? 'All 3' : PATTERNS[mode].name;
}
