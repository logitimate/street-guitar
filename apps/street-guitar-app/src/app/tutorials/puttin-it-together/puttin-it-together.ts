import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ChordChart } from '../chord-chart';
import { GuitarAudioService } from '../guitar-audio.service';
import { ChordName, moves } from '../open-chords';
import { PATTERNS, SlotClock } from '../slot-clock';
import { StrumLane } from '../strum-lane';

type StepId = 1 | 2;
type Shown = { count: number } | { chordIdx: number; s: number };

const PROGS: ChordName[][] = [
  ['G', 'Em', 'C', 'D'],
  ['Am', 'Dm', 'Am', 'E'],
  ['A', 'D', 'E', 'D'],
  ['Em', 'C', 'G', 'D'],
];
// Step 1: one down strum per beat, a new chord every beat (efficiency: never wait).
// Step 2: Pattern 3 on every chord; the last & is the open strings (fingers already off).
const STEP_HITS: Record<StepId, readonly number[]> = { 1: [1, 0, 1, 0, 1, 0, 1, 0], 2: PATTERNS[3].hits };
const LIFT_SLOT = 7;
const BPM_KEY = 'sg.puttin.bpm';

@Component({
  selector: 'app-puttin-it-together',
  templateUrl: './puttin-it-together.html',
  styleUrl: './puttin-it-together.css',
  imports: [ChordChart, StrumLane],
})
export class PuttinItTogether {
  private audio = inject(GuitarAudioService);

  protected readonly progs = PROGS;
  protected p = signal(0);
  protected stepId = signal<StepId>(1);
  protected bpm = signal(this.loadBpm());
  protected running = signal(false);
  protected countIn = signal<number | null>(null);
  protected chordIdx = signal(0);
  protected active = signal(-1);

  protected prog = computed(() => PROGS[this.p()]);
  protected hits = computed(() => STEP_HITS[this.stepId()]);
  protected liftAt = computed(() => (this.stepId() === 2 ? LIFT_SLOT : -1));
  protected now = computed(() => this.prog()[this.chordIdx()]);
  protected upNext = computed(() => this.prog()[(this.chordIdx() + 1) % 4]);
  /** fingers to keep down / slide on the switch coming up */
  protected switchMoves = computed(() => moves(this.now(), this.upNext()));
  protected switchLine = computed(() => {
    const m = this.switchMoves(), parts: string[] = [];
    if (m.cf.length) parts.push(`keep finger ${m.cf.join(' & ')} down`);
    if (m.gf.length) parts.push(`slide finger ${m.gf.join(' & ')}`);
    return `${this.now()} → ${this.upNext()}: ${parts.length ? parts.join(', ') : 'no common or guide finger, picture it first'}`;
  });

  private clock = new SlotClock<Shown>(this.audio, {
    slotSec: () => 60 / this.bpm() / 2,
    schedule: (i, t) => {
      if (i < 8) {
        if (i % 2 === 0) this.audio.click(t, i === 0, 0.8);
        return { count: i / 2 + 1 };
      }
      const m = i - 8, s = m % 8, bar = Math.floor(m / 8), prog = PROGS[this.p()];
      const step = this.stepId();
      // step 1 moves through the whole progression in one bar; step 2 is one chord per bar
      const chordIdx = step === 1 ? Math.floor(s / 2) : bar % 4;
      if (s % 2 === 0) this.audio.click(t, s === 0, 0.35);
      if (STEP_HITS[step][s]) {
        const lift = step === 2 && s === LIFT_SLOT;
        this.audio.strum(prog[chordIdx], s % 2 ? 'up' : 'down', t, s === 0 ? 1.05 : 0.9, lift);
      }
      return { chordIdx, s };
    },
    show: e => {
      if ('count' in e) { this.countIn.set(e.count); return; }
      this.countIn.set(null);
      this.chordIdx.set(e.chordIdx);
      this.active.set(e.s);
    },
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clock.stop());
  }

  protected pickProg(i: number) { this.stop(); this.p.set(i); }
  protected pickStep(s: StepId) { this.stop(); this.stepId.set(s); }

  protected hear(i: number) {
    if (this.running() || !this.audio.ensure()) return;
    this.chordIdx.set(i);
    this.audio.strum(this.prog()[i]);
  }

  protected toggle() {
    if (this.running()) { this.stop(); return; }
    this.chordIdx.set(0);
    this.clock.start();
    this.running.set(this.clock.running);
  }

  protected setBpm(v: number) {
    this.bpm.set(v);
    try { localStorage.setItem(BPM_KEY, String(v)); } catch { /* private mode */ }
  }

  private stop() {
    this.clock.stop();
    this.running.set(false);
    this.countIn.set(null);
    this.active.set(-1);
  }

  private loadBpm() {
    try {
      const v = parseInt(localStorage.getItem(BPM_KEY) ?? '', 10);
      if (v >= 40 && v <= 120) return v;
    } catch { /* private mode */ }
    return 70;
  }
}
