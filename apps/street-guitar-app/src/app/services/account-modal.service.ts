import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AccountModalService {
  readonly isOpen = signal(false);
  open()  { this.isOpen.set(true); }
  close() { this.isOpen.set(false); }
}
