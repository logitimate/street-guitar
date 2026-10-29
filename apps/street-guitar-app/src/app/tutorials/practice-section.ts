import { Component, computed, input, linkedSignal } from '@angular/core';
import { ChordWheels } from './chord-wheels/chord-wheels';
import { PuttinItTogether } from './puttin-it-together/puttin-it-together';
import { StrumAlong } from './strum-along/strum-along';
import { StrumCheck } from './strum-check/strum-check';
import { TUTORIALS, TutorialId } from './tutorials';

/** "Practice with it": the interactive apps that go with the lesson video. */
@Component({
  selector: 'app-practice-section',
  imports: [ChordWheels, StrumAlong, StrumCheck, PuttinItTogether],
  template: `
    <section class="practice" aria-labelledby="practice-h">
      <p class="eyebrow" id="practice-h">Practice with it</p>

      @if (items().length > 1) {
        <div class="tabs" role="tablist">
          @for (t of items(); track t.id) {
            <button type="button" role="tab" class="tab" [attr.aria-selected]="t.id === selected()" (click)="selected.set(t.id)">
              {{ t.title }}
            </button>
          }
        </div>
      }

      @if (meta(); as m) {
        <header class="sg-sign">
          <img class="sg-logo" src="street-guitar.svg" alt="Street Guitar" />
          <div>
            <div class="sg-eyebrow">{{ m.eyebrow }}</div>
            <h2>{{ m.title }}</h2>
          </div>
        </header>

        <div class="body">
          @switch (m.id) {
            @case ('chord-wheels') { <app-chord-wheels /> }
            @case ('strum-along-g') { <app-strum-along /> }
            @case ('strum-check') { <app-strum-check /> }
            @case ('puttin-it-together') { <app-puttin-it-together /> }
          }
        </div>
      }
    </section>
  `,
  styles: `
    .practice { padding: 8px 48px 64px; max-width: 1240px; display: flex; flex-direction: column; gap: 16px; }
    .eyebrow { margin-bottom: 0; }
    .tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .tab {
      font: inherit; font-size: 13px; font-weight: 700; letter-spacing: .5px; cursor: pointer;
      padding: 10px 16px; border-radius: 10px; border: 2px solid var(--sg-line);
      background: var(--bg-card); color: var(--text-2);
    }
    .tab[aria-selected='true'] { background: var(--sg-green); border-color: var(--sg-green); color: #fff; }
    .body { display: block; }
    @media (max-width: 860px) { .practice { padding: 8px 20px 48px; } }
  `,
})
export class PracticeSection {
  tutorials = input.required<TutorialId[]>();

  protected items = computed(() => this.tutorials().map(id => TUTORIALS[id]));
  /** resets to the first tutorial whenever the lesson changes */
  protected selected = linkedSignal(() => this.tutorials()[0]);
  protected meta = computed(() => TUTORIALS[this.selected()]);
}
