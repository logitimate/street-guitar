import { Component, inject } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor() {
    // router anchor scrolling (#pricing etc.) lands below the fixed home nav
    inject(ViewportScroller).setOffset([0, 72]);
  }
}
