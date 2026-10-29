import { Component, ViewEncapsulation, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { AccountModalService } from '../services/account-modal.service';

@Component({
  selector: 'app-nav-user-chip',
  template: `
    <button class="nav-avatar nav-avatar--btn" (click)="modal.open()" title="Account">
      {{ auth.user()!.name[0] }}
    </button>
  `,
  styles: [`
    app-nav-user-chip { display: flex; align-items: center; gap: 10px; }
    .nav-avatar--btn { border: none; cursor: pointer; transition: opacity 0.15s; }
    .nav-avatar--btn:hover { opacity: 0.8; }
  `],
  encapsulation: ViewEncapsulation.None,
})
export class NavUserChip {
  auth  = inject(AuthService);
  modal = inject(AccountModalService);
}
