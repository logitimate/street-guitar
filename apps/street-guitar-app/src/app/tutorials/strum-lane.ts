import { Component, input } from '@angular/core';
import { COUNTS } from './slot-clock';

/**
 * One bar of strum arrows: black = hit the strings, gray = keep the hand moving but miss,
 * red "Lift off" = fingers off, strum the open strings. Even slots are down, odd are up.
 */
@Component({
  selector: 'app-strum-lane',
  template: `
    <div class="lane" [style.grid-template-columns]="'repeat(' + hits().length + ', 1fr)'">
      @for (h of hits(); track $index; let i = $index) {
        <div class="col" [class.ghost]="!h" [class.lift]="i === liftAt()" [class.on]="i === active()">
          <span class="count">{{ counts[i] }}</span>
          <svg class="arrow" viewBox="0 0 40 56" aria-hidden="true">
            <g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"
               [attr.transform]="i % 2 ? 'rotate(180 20 28)' : null">
              <path d="M20 4 V44 M6 32 L20 50 L34 32" />
            </g>
          </svg>
          @if (i === liftAt()) { <span class="liftword">Lift off</span> }
          @if (marks(); as mk) {
            <span class="mark" [class.ok]="mk[i] === true" [class.no]="mk[i] === false">{{ mk[i] === true ? '✓' : mk[i] === false ? '✗' : '' }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; color: var(--sg-pen); }
    .lane { display: grid; }
    .col { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 0; border-radius: 12px; transition: background .06s; }
    .col.on { background: var(--hi); }
    .col.on.ghost { background: var(--hi-soft); }
    .count { font-family: var(--font-display); font-size: clamp(22px, 4vw, 34px); line-height: 1; }
    .arrow { width: clamp(26px, 5vw, 42px); height: auto; }
    .ghost .count, .ghost .arrow { color: var(--sg-ghost); }
    .lift .arrow, .liftword { color: var(--lift); }
    .liftword { font-family: var(--font-display); font-size: clamp(12px, 2.2vw, 16px); text-transform: uppercase; }
    .mark { font-size: clamp(20px, 4vw, 30px); font-weight: 900; line-height: 1; min-height: 1em; }
    .mark.ok { color: var(--cf); }
    .mark.no { color: var(--lift); }
    .col.on:not(.ghost) .arrow { animation: hit .18s ease-out; }
    @keyframes hit { from { transform: scale(1.35) } to { transform: scale(1) } }
    @media (prefers-reduced-motion: reduce) { .col.on .arrow { animation: none; } }
  `,
})
export class StrumLane {
  hits = input.required<readonly number[]>();
  active = input(-1);
  liftAt = input(-1);
  /** camera verdicts per slot (Strum Check): true ✓, false ✗, missing = no mark */
  marks = input<Record<number, boolean> | null>(null);
  protected readonly counts = COUNTS;
}
