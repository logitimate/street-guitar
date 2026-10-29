import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ChordChart } from '../chord-chart';
import { GuitarAudioService } from '../guitar-audio.service';
import { LIFT_SLOT, PATTERNS, PatternId, STRUM_PICKS, SlotClock, StrumMode, modeLabel, patternForBar } from '../slot-clock';
import { StrumLane } from '../strum-lane';

type Shown = { count: number } | { bar: number; s: number; pk: PatternId };

const BPM_KEY = 'sg.strumAlong.bpm';

@Component({
  selector: 'app-strum-along',
  templateUrl: './strum-along.html',
  styleUrl: './strum-along.css',
  imports: [ChordChart, StrumLane],
})
export class StrumAlong {
  private audio = inject(GuitarAudioService);

  protected readonly picks = STRUM_PICKS;

  protected mode = signal<StrumMode>(1);
  protected guitar = signal(true);
  protected bpm = signal(this.loadBpm());
  protected running = signal(false);
  protected countIn = signal<number | null>(null);
  protected shownPk = signal<PatternId>(1);
  protected active = signal(-1);
  protected bar = signal(0);

  protected hits = computed(() => PATTERNS[this.shownPk()].hits);
  protected liftAt = computed(() => (this.mode() === 'lift' ? LIFT_SLOT : -1));
  protected status = computed(() => {
    if (this.countIn() !== null) return 'Count-in';
    if (!this.running()) return this.mode() === 'all' ? 'All 3 patterns' : modeLabel(this.mode());
    return `${modeLabel(this.mode() === 'all' ? this.shownPk() : this.mode())} · Bar ${this.bar() + 1}`;
  });
  protected next = computed(() => {
    if (!this.running()) return 'Press Start';
    if (this.countIn() !== null) return 'Get ready';
    if (this.mode() === 'all') return this.bar() % 2 ? `Pattern ${patternForBar('all', this.bar() + 1)} next bar` : 'Same again next bar';
    return this.active() === LIFT_SLOT && this.mode() === 'lift' ? 'Fingers off!' : 'Keep going';
  });

  private clock = new SlotClock<Shown>(this.audio, {
    slotSec: () => 60 / this.bpm() / 2,
    schedule: (i, t) => {
      // one bar of clicks first
      if (i < 8) {
        if (i % 2 === 0) this.audio.click(t, i === 0, 0.8);
        return { count: i / 2 + 1 };
      }
      const m = i - 8, bar = Math.floor(m / 8), s = m % 8, pk = patternForBar(this.mode(), bar);
      if (s % 2 === 0) this.audio.click(t, s === 0, this.guitar() ? 0.35 : 0.8);
      if (this.guitar() && PATTERNS[pk].hits[s]) {
        const lift = this.mode() === 'lift' && s === LIFT_SLOT;
        this.audio.strum('G', s % 2 ? 'up' : 'down', t, s === 0 ? 1.1 : 0.95, lift);
      }
      return { bar, s, pk };
    },
    show: e => {
      if ('count' in e) { this.countIn.set(e.count); return; }
      this.countIn.set(null);
      this.shownPk.set(e.pk);
      this.bar.set(e.bar);
      this.active.set(e.s);
    },
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clock.stop());
  }

  protected setMode(m: StrumMode) {
    this.mode.set(m);
    if (!this.running()) this.shownPk.set(patternForBar(m, 0));
  }

  protected toggle() {
    if (this.running()) this.stop();
    else { this.clock.start(); this.running.set(this.clock.running); }
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
    this.shownPk.set(patternForBar(this.mode(), 0));
  }

  private loadBpm() {
    try {
      const v = parseInt(localStorage.getItem(BPM_KEY) ?? '', 10);
      if (v >= 40 && v <= 160) return v;
    } catch { /* private mode */ }
    return 70;
  }
}
