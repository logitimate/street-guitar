import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ChordChart } from '../chord-chart';
import { GuitarAudioService } from '../guitar-audio.service';
import { CHORDS, CHORD_LABEL, ChordName, STRING_NAMES, fingersOf, listWords, moves } from '../open-chords';

type Question = 'cf' | 'gf';
interface Step { hub: ChordName; to: ChordName; }

// G first, then A, then alphabetical: the same order around every wheel (David's order).
const ORDER: ChordName[] = ['G', 'A', 'Am', 'C', 'D', 'Dm', 'E', 'Em'];
const HUBS = ORDER.slice(0, -1);
const SPOKES = Object.fromEntries(HUBS.map((h, i) => [h, ORDER.slice(i + 1)])) as Record<ChordName, ChordName[]>;
// every hub switches to every chord after it: the book's 28 switches
const STEPS: Step[] = HUBS.flatMap(hub => SPOKES[hub].map(to => ({ hub, to })));
const questionsOf = (s: Step): Question[] => {
  const m = moves(s.hub, s.to);
  return (['cf', 'gf'] as const).filter(k => m[k].length > 0);
};
const TOTAL = STEPS.reduce((n, s) => n + questionsOf(s).length, 0);

const ASK: Record<Question, { ask: string; hint: string; term: string }> = {
  cf: { ask: 'common finger', term: 'common finger', hint: 'The common finger stays on the same string and the same fret in both chords.' },
  gf: { ask: 'guide finger', term: 'guide finger', hint: 'The guide finger stays on the same string but slides to a new fret.' },
};

const STORE_KEY = 'sg.chordWheels';
interface Records { cycles: number; bestCycle: number; bestStreak: number; }

const GAP_MS = 1400;

@Component({
  selector: 'app-chord-wheels',
  templateUrl: './chord-wheels.html',
  styleUrl: './chord-wheels.css',
  imports: [ChordChart],
})
export class ChordWheels {
  private audio = inject(GuitarAudioService);

  protected readonly hubs = HUBS;
  protected readonly total = TOTAL;
  protected readonly label = CHORD_LABEL;

  protected i = signal(0);
  /** how many of this switch's questions are answered */
  protected q = signal(0);
  protected picked = signal<number[]>([]);
  protected msg = signal<{ tone: 'good' | 'bad' | 'info'; html: string }[]>([]);
  protected playing = signal<number | null>(null);
  protected pop = signal(false);

  protected right = signal(0);
  protected wrong = signal(0);
  protected streak = signal(0);
  private firstTry: Record<number, boolean[]> = {};
  private done = new Set<number>();
  protected records = signal<Records>(this.load());

  private playToken = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];

  protected step = computed(() => STEPS[this.i()]);
  protected m = computed(() => moves(this.step().hub, this.step().to));
  protected qs = computed(() => questionsOf(this.step()));
  protected answered = computed(() => this.q() >= this.qs().length);
  protected current = computed(() => this.qs()[this.q()] as Question | undefined);
  protected ask = computed(() => { const c = this.current(); return c ? ASK[c] : null; });
  protected choices = computed(() => {
    const b = fingersOf(this.step().to);
    return fingersOf(this.step().hub).filter(f => b.includes(f));
  });
  protected position = computed(() => {
    const s = this.step();
    const first = STEPS.findIndex(x => x.hub === s.hub);
    return `The ${CHORD_LABEL[s.hub]} wheel · switch ${this.i() - first + 1} of ${SPOKES[s.hub].length}`;
  });
  /** which fingers each chart colors so far: CF lights after its question, GF after all */
  protected cfShown = computed(() => {
    const qi = this.qs().indexOf('cf');
    return qi >= 0 && this.q() > qi ? this.m().cf : [];
  });
  protected gfShown = computed(() => (this.answered() ? this.m().gf : []));
  protected isLast = computed(() => this.i() === STEPS.length - 1);

  protected wheel = computed(() => {
    const s = this.step(), spokes = SPOKES[s.hub], n = spokes.length;
    return spokes.map((c, j) => {
      const a = ((90 - (j * 360) / n) * Math.PI) / 180;
      const mk = moves(s.hub, c);
      const bold = mk.cf.length > 0, star = mk.gf.length > 0;
      return {
        c, bold, star, on: c === s.to,
        x: 170 + 114 * Math.cos(a), y: 170 - 114 * Math.sin(a),
        w: (c.length + (star ? 1 : 0)) * 26 + 26,
      };
    });
  });

  protected switchWords = computed(() => {
    const { hub: a, to: b } = this.step(), m = this.m();
    const spot = (c: ChordName, f: number) => CHORDS[c].some(p => p && p[1] === f);
    const lift: number[] = [], off: number[] = [], on: number[] = [];
    for (const f of [1, 2, 3, 4]) {
      const p = spot(a, f), q = spot(b, f);
      if ((!p && !q) || m.cf.includes(f) || m.gf.includes(f)) continue;
      (p && q ? lift : p ? off : on).push(f);
    }
    const w: string[] = [];
    if (m.cf.length) w.push(`<span class="cfw">${m.cf.length > 1 ? `Fingers ${listWords(m.cf)} stay` : `Finger ${m.cf[0]} stays`}</span> down.`);
    for (const f of m.gf) w.push(`<span class="gfw">★ Finger ${f} slides</span> along the ${STRING_NAMES[m.gs[f]]} string.`);
    if (lift.length) w.push(`${lift.length > 1 ? `Fingers ${listWords(lift)} lift and land` : `Finger ${lift[0]} lifts and lands`} in ${b}.`);
    if (off.length) w.push(`${off.length > 1 ? `Fingers ${listWords(off)} come` : `Finger ${off[0]} comes`} off.`);
    if (on.length) w.push(`${on.length > 1 ? `Fingers ${listWords(on)} go` : `Finger ${on[0]} goes`} down.`);
    return w.join(' ');
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopBack());
  }

  protected hear(idx: number) {
    this.stopBack();
    const s = this.step();
    this.sound(idx === 0 ? s.hub : s.to);
  }

  protected toggle(f: number) {
    this.picked.update(p => (p.includes(f) ? p.filter(x => x !== f) : [...p, f].sort()));
  }

  protected primary() {
    if (!this.answered()) this.check();
    else this.next();
  }

  protected pickHub(h: ChordName) { this.jump(h, SPOKES[h][0]); }

  protected jump(h: ChordName, c: ChordName) {
    const idx = STEPS.findIndex(s => s.hub === h && s.to === c);
    if (idx >= 0) this.go(idx);
  }

  protected playBack() {
    this.stopBack();
    this.audio.ensure();
    const tok = this.playToken, s = this.step();
    [0, 1, 0, 1].forEach((j, n) => {
      this.timers.push(setTimeout(() => {
        if (tok !== this.playToken) return;
        this.playing.set(j);
        this.sound(j ? s.to : s.hub);
        if (n === 3) this.timers.push(setTimeout(() => tok === this.playToken && this.playing.set(null), GAP_MS));
      }, n * GAP_MS));
    });
  }

  private check() {
    const k = this.current()!;
    const want = this.m()[k];
    const ok = JSON.stringify(this.picked()) === JSON.stringify(want);
    const tries = (this.firstTry[this.i()] ??= []);
    if (tries[this.q()] === undefined) tries[this.q()] = ok;
    this.picked.set([]);

    // wrong: try again, and nothing else (no reveal, no sound)
    if (!ok) {
      this.wrong.update(n => n + 1);
      this.streak.set(0);
      this.stopBack();
      this.msg.set([{ tone: 'bad', html: 'Try again.' }]);
      return;
    }

    this.right.update(n => n + 1);
    this.streak.update(n => n + 1);
    if (this.streak() > this.records().bestStreak) this.save({ ...this.records(), bestStreak: this.streak() });

    const m = this.m();
    let html = want.length > 1
      ? `Fingers <b>${listWords(want)}</b> are both ${ASK[k].term}s.`
      : `Finger <b>${want[0]}</b> is the ${ASK[k].term}.`;
    if (this.q() === this.qs().length - 1) {
      if (m.cf.length) html += ` Keep ${m.cf.length > 1 ? 'the common fingers' : 'the common finger'} down.`;
      if (m.gf.length) html += ` Slide the guide finger along the ${STRING_NAMES[m.gs[m.gf[0]]]} string. Don't lift it.`;
    }
    const prev = this.q() > 0 ? this.msg().filter(x => x.tone === 'good') : [];
    this.msg.set([...prev, { tone: 'good', html: `<span class="good">Right!</span> ${html}` }]);

    this.q.update(n => n + 1);
    if (this.answered()) this.done.add(this.i());
    this.pop.set(true);
    setTimeout(() => this.pop.set(false), 600);
    this.playBack();
  }

  private next() {
    if (!this.isLast()) { this.go(this.i() + 1); return; }
    // the book: do the whole cycle every time
    const missed = STEPS.length - this.done.size;
    const first = Object.values(this.firstTry).flat().filter(Boolean).length;
    let html: string;
    if (missed) {
      html = `Not counted: ${missed} switch${missed > 1 ? 'es' : ''} skipped. The book says <b>do the whole cycle every time</b>. Start again at G.`;
    } else {
      const r = this.records();
      this.save({ ...r, cycles: r.cycles + 1, bestCycle: Math.max(r.bestCycle, first) });
      html = `<b>Whole cycle done!</b> ${first} out of ${TOTAL} right the first time, ${this.wrong()} wrong. Start again at G.`;
    }
    this.firstTry = {};
    this.done.clear();
    this.right.set(0);
    this.wrong.set(0);
    this.streak.set(0);
    this.go(0);
    this.msg.set([{ tone: 'info', html }]);
  }

  private go(idx: number) {
    this.stopBack();
    this.audio.damp();
    this.i.set(idx);
    this.picked.set([]);
    this.msg.set([]);
    const n = questionsOf(STEPS[idx]).length;
    this.q.set(this.done.has(idx) ? n : 0);
    // nothing to ask: the visualization prompt shows and the switch counts as seen
    if (!n) this.done.add(idx);
  }

  private stopBack() {
    this.playToken++;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.playing.set(null);
  }

  private sound(c: ChordName) {
    if (this.audio.ensure()) this.audio.strum(c);
  }

  private load(): Records {
    try {
      const r = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
      if (r && typeof r.cycles === 'number') return r;
    } catch { /* private mode */ }
    return { cycles: 0, bestCycle: 0, bestStreak: 0 };
  }

  private save(r: Records) {
    this.records.set(r);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(r)); } catch { /* private mode */ }
  }
}
