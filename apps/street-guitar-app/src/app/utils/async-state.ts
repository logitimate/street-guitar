import { signal } from '@angular/core';

export class AsyncState {
  readonly loading = signal(false);
  readonly error   = signal('');
}
