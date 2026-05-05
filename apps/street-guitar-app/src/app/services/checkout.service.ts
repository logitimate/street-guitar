import { Injectable } from '@angular/core';
import { getAuth } from 'firebase/auth';
import { environment } from '../../environments/environment';

const CHECKOUT_URL = `https://us-central1-${environment.firebase.projectId}.cloudfunctions.net/createCheckoutSession`;

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  async startCheckout(): Promise<string | null> {
    const user = getAuth().currentUser;
    if (!user) throw new Error('Not authenticated');

    const token    = await user.getIdToken();
    const response = await fetch(CHECKOUT_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Checkout failed (${response.status}): ${text}`);
    }

    const data = await response.json();
    return data.url ?? null;
  }
}
