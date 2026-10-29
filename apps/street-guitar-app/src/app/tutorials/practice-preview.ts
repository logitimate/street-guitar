import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PracticeSection } from './practice-section';

/** SPIKE: dev-only page showing every Ch 2 practice app without the subscription guard. */
@Component({
  selector: 'app-practice-preview',
  imports: [PracticeSection, RouterLink],
  template: `
    <nav class="nav" style="position: sticky">
      <div class="container nav-inner">
        <a routerLink="/" class="nav-logo">
          <img class="nav-sign" src="street-guitar.svg" alt="" />
          <span>STREET</span><span class="accent">GUITAR</span>
        </a>
      </div>
    </nav>
    <app-practice-section [tutorials]="['chord-wheels', 'strum-along-g', 'strum-check', 'puttin-it-together']" />
  `,
  styles: `app-practice-section { display: block; margin: 32px auto 0; max-width: 1240px; }`,
})
export class PracticePreview {}
