import { Injectable } from '@angular/core';
import { getFunctions, httpsCallable } from 'firebase/functions';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private _fns = getFunctions();

  async startCheckout(): Promise<string | null> {
    const createSession = httpsCallable<void, { url: string | null }>(
      this._fns,
      'createCheckoutSession',
    );
    const result = await createSession();
    return result.data.url;
  }
}
