import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { GuitarAudioService } from '../guitar-audio.service';
import { HandTrackerService, judgeStroke } from '../hand-tracker.service';
import { LIFT_SLOT, PATTERNS, PatternId, STRUM_PICKS, SlotClock, StrumMode, modeLabel, patternForBar } from '../slot-clock';
import { StrumLane } from '../strum-lane';

type Shown = { count: number } | { bar: number; s: number; pk: PatternId };

const BPM_KEY = 'sg.strumAlong.bpm'; // shares the speed with Strum Along
const BEST_KEY = 'sg.strumCheck.best';

/**
 * Keep It Moving: Strum Check. Strum Along in G, plus the front camera watches the strumming hand.
 * On every arrow, black or gray, it marks ✓ if the hand was moving the right way (down on the
 * numbers, up on the &s) and ✗ if it went the wrong way or stopped.
 */
@Component({
  selector: 'app-strum-check',
  templateUrl: './strum-check.html',
  styleUrl: './strum-check.css',
  imports: [StrumLane],
})
export class StrumCheck {
  private audio = inject(GuitarAudioService);
  protected cam = inject(HandTrackerService);

  private video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private dots = viewChild.required<ElementRef<HTMLCanvasElement>>('dots');

  protected readonly picks = STRUM_PICKS;
  protected mode = signal<StrumMode>(1);
  protected guitar = signal(true);
  protected bpm = signal(this.loadNum(BPM_KEY, 70, 40, 160));
  protected starting = signal(false);
  protected running = signal(false);
  protected countIn = signal<number | null>(null);
  protected shownPk = signal<PatternId>(1);
  protected active = signal(-1);
  protected marks = signal<Record<number, boolean>>({});
  protected flash = signal<boolean | null>(null);

  protected right = signal(0);
  protected wrong = signal(0);
  protected streak = signal(0);
  protected best = signal(this.loadNum(BEST_KEY, 0, 0, 1e6));
  protected coach = signal<{ ok: boolean; text: string } | null>(null);

  protected hits = computed(() => PATTERNS[this.shownPk()].hits);
  protected liftAt = computed(() => (this.mode() === 'lift' ? LIFT_SLOT : -1));
  protected status = computed(() =>
    this.countIn() !== null ? 'Count-in' : this.running() ? modeLabel(this.mode()) : 'Press Start'
  );

  private pending: { t: number; s: number }[] = [];
  private raf = 0;
  private flashTimer: ReturnType<typeof setTimeout> | undefined;

  private clock = new SlotClock<Shown>(this.audio, {
    slotSec: () => 60 / this.bpm() / 2,
    schedule: (i, t) => {
      if (i < 8) {
        if (i % 2 === 0) this.audio.click(t, i === 0, 0.8);
        return { count: i / 2 + 1 };
      }
      const m = i - 8, bar = Math.floor(m / 8), s = m % 8, pk = patternForBar(this.mode(), bar);
      if (s % 2 === 0) this.audio.click(t, s === 0, this.guitar() ? 0.35 : 0.8);
      if (this.guitar() && PATTERNS[pk].hits[s]) {
        this.audio.strum('G', s % 2 ? 'up' : 'down', t, s === 0 ? 1.1 : 0.95, this.mode() === 'lift' && s === LIFT_SLOT);
      }
      // every arrow is judged, gray ones too: the hand keeps moving
      this.pending.push({ t, s });
      return { bar, s, pk };
    },
    show: e => {
      if ('count' in e) { this.countIn.set(e.count); return; }
      this.countIn.set(null);
      this.shownPk.set(e.pk);
      this.active.set(e.s);
      this.marks.update(m => { const n = { ...m }; delete n[e.s]; return n; });
    },
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => { this.stop(); this.cam.stop(); });
  }

  protected setMode(m: StrumMode) {
    this.mode.set(m);
    if (!this.running()) this.shownPk.set(patternForBar(m, 0));
  }

  protected setBpm(v: number) {
    this.bpm.set(v);
    try { localStorage.setItem(BPM_KEY, String(v)); } catch { /* private mode */ }
  }

  protected async toggle() {
    if (this.running() || this.starting()) { this.stop(); return; }
    this.audio.ensure(); // inside the tap, so the browser lets sound start
    this.starting.set(true);
    const ok = await this.cam.start(this.video().nativeElement, this.dots().nativeElement);
    if (!this.starting()) return; // stopped while the camera loaded
    this.starting.set(false);
    if (!ok) return;
    this.right.set(0); this.wrong.set(0); this.streak.set(0);
    this.coach.set(null);
    this.marks.set({});
    this.pending = [];
    this.clock.start();
    this.running.set(this.clock.running);
    this.raf = requestAnimationFrame(this.judgeLoop);
  }

  private stop() {
    this.starting.set(false);
    this.clock.stop();
    cancelAnimationFrame(this.raf);
    this.pending = [];
    const wasRunning = this.running();
    this.running.set(false);
    this.countIn.set(null);
    this.active.set(-1);
    this.shownPk.set(patternForBar(this.mode(), 0));
    const tot = this.right() + this.wrong();
    if (wasRunning && tot) {
      this.coach.set({ ok: this.right() >= this.wrong(), text: `Right way ${this.right()} of ${tot} times. Best streak: ${this.best()}.` });
    }
  }

  /** wait until the camera has seen the whole stroke, then judge it */
  private judgeLoop = () => {
    const slotMs = 60000 / this.bpm() / 2;
    while (this.pending.length) {
      const j = this.pending[0], at = this.audio.toPerfMs(j.t);
      if (performance.now() < at + 0.35 * slotMs + 150) break;
      this.pending.shift();
      if (!this.cam.watching()) continue;
      const got = judgeStroke(this.cam.samples(), at, slotMs);
      if (got === 'none') continue; // no hand seen then: no mark, no blame
      this.mark(j.s, got === (j.s % 2 ? 'up' : 'down'), got === 'still');
    }
    if (this.running()) this.raf = requestAnimationFrame(this.judgeLoop);
  };

  private mark(s: number, ok: boolean, still: boolean) {
    this.marks.update(m => ({ ...m, [s]: ok }));
    this.flash.set(ok);
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.flash.set(null), 350);
    if (ok) {
      this.right.update(n => n + 1);
      this.streak.update(n => n + 1);
      if (this.streak() > this.best()) {
        this.best.set(this.streak());
        try { localStorage.setItem(BEST_KEY, String(this.best())); } catch { /* private mode */ }
      }
      this.coach.set(this.streak() >= 8 ? { ok: true, text: 'Nice and steady!' } : null);
      return;
    }
    this.wrong.update(n => n + 1);
    this.streak.set(0);
    this.coach.set({ ok: false, text: still ? 'Keep your hand moving!' : s % 2 ? 'Up on the &s!' : 'Down on the numbers!' });
  }

  private loadNum(key: string, dflt: number, min: number, max: number) {
    try {
      const v = parseInt(localStorage.getItem(key) ?? '', 10);
      if (v >= min && v <= max) return v;
    } catch { /* private mode */ }
    return dflt;
  }
}
