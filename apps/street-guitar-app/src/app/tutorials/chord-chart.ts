import { Component, computed, input } from '@angular/core';
import { CHORDS, ChordName } from './open-chords';

type Mark =
  | { kind: 'x' | 'o'; x: number }
  | { kind: 'dot'; x: number; y: number; finger: number; tone: 'cf' | 'gf' | 'pen'; num: boolean };

const L = 25, GAP = 44, TOP = 58, FH = 54, FRETS = 4;

/** A chord box drawn like the book: black pen on paper, optional finger numbers and CF/GF colors. */
@Component({
  selector: 'app-chord-chart',
  template: `
    <svg [attr.viewBox]="'0 0 270 ' + height" aria-hidden="true">
      <rect [attr.x]="L" [attr.y]="TOP - 5" [attr.width]="GAP * 5" height="10" fill="currentColor" />
      @for (f of fretLines; track f) {
        <line [attr.x1]="L" [attr.x2]="L + GAP * 5" [attr.y1]="f" [attr.y2]="f" stroke="currentColor" stroke-width="3" />
      }
      @for (x of stringLines; track x) {
        <line [attr.x1]="x" [attr.x2]="x" [attr.y1]="TOP" [attr.y2]="TOP + FRETS * FH" stroke="currentColor" stroke-width="3" />
      }
      @for (m of marks(); track $index) {
        @switch (m.kind) {
          @case ('x') {
            <text [attr.x]="m.x" [attr.y]="TOP - 17" text-anchor="middle" font-size="28" font-weight="800" fill="currentColor">×</text>
          }
          @case ('o') {
            <circle [attr.cx]="m.x" [attr.cy]="TOP - 26" r="10" fill="none" stroke="currentColor" stroke-width="3.5" />
          }
          @case ('dot') {
            @if (m.kind === 'dot') {
              <g [class.pop]="m.num && pop()" [style.transform-origin]="m.x + 'px ' + m.y + 'px'">
                <circle [attr.cx]="m.x" [attr.cy]="m.y" r="22" [attr.fill]="toneFill[m.tone]" />
                @if (m.num) {
                  <text [attr.x]="m.x" [attr.y]="m.y + 10" text-anchor="middle" font-size="30" font-weight="800" fill="var(--sg-paper)">{{ m.finger }}</text>
                }
                @if (m.tone === 'gf') {
                  <text [attr.x]="m.x + 16" [attr.y]="m.y - 16" font-size="26" fill="var(--gf)">★</text>
                }
              </g>
            }
          }
        }
      }
    </svg>
  `,
  styles: `
    :host { display: block; color: var(--sg-pen); }
    svg { display: block; width: 100%; height: auto; }
    .pop { animation: pop .5s ease-out both; }
    @keyframes pop { 0% { transform: scale(.3); opacity: 0 } 70% { transform: scale(1.25); opacity: 1 } 100% { transform: scale(1) } }
    @media (prefers-reduced-motion: reduce) { .pop { animation: none; } }
  `,
})
export class ChordChart {
  chord = input.required<ChordName>();
  /** show every finger number */
  numbers = input(false);
  /** fingers to color green (common) — these always show their number */
  cf = input<number[]>([]);
  /** fingers to color blue with a star (guide) — these always show their number */
  gf = input<number[]>([]);
  /** animate numbers popping in */
  pop = input(false);

  protected readonly L = L;
  protected readonly GAP = GAP;
  protected readonly TOP = TOP;
  protected readonly FRETS = FRETS;
  protected readonly FH = FH;
  protected readonly height = TOP + FRETS * FH + 12;
  protected readonly fretLines = Array.from({ length: FRETS }, (_, i) => TOP + (i + 1) * FH);
  protected readonly stringLines = Array.from({ length: 6 }, (_, k) => L + k * GAP);
  protected readonly toneFill = { cf: 'var(--cf)', gf: 'var(--gf)', pen: 'currentColor' };

  protected marks = computed<Mark[]>(() =>
    CHORDS[this.chord()].map((p, k): Mark => {
      const x = L + k * GAP;
      if (p === null) return { kind: 'x', x };
      if (p === 0) return { kind: 'o', x };
      const [fret, finger] = p;
      const tone = this.cf().includes(finger) ? 'cf' : this.gf().includes(finger) ? 'gf' : 'pen';
      return { kind: 'dot', x, y: TOP + (fret - 0.5) * FH, finger, tone, num: this.numbers() || tone !== 'pen' };
    }),
  );
}
