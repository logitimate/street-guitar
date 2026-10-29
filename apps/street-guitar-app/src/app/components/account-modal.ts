import { Component, EventEmitter, HostListener, Output, computed, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { CheckoutService } from '../services/checkout.service';

@Component({
  selector: 'app-account-modal',
  templateUrl: './account-modal.html',
  styleUrl: './account-modal.css',
})
export class AccountModal {
  @Output() close = new EventEmitter<void>();

  auth     = inject(AuthService);
  checkout = inject(CheckoutService);

  confirmCancel  = signal(false);
  cancelling     = signal(false);
  cancelError    = signal('');
  cancelled      = signal(false);
  subscribing    = signal(false);
  subscribeError = signal('');
  linkCopied     = signal(false);

  cancelAtPeriodEnd = computed(() => this.auth.user()?.cancelAtPeriodEnd ?? false);

  subscriptionEndDate = computed(() => {
    const ts = this.auth.user()?.subscriptionEndDate;
    if (!ts) return null;
    return new Date(ts * 1000).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  });

  referralLink = computed(() => {
    const code = this.auth.user()?.referralCode;
    if (!code) return '';
    return `${document.baseURI}?ref=${code}`;
  });

  @HostListener('document:keydown.escape')
  onEscape() { this.close.emit(); }

  async confirmCancelSubscription() {
    this.cancelling.set(true);
    this.cancelError.set('');
    try {
      await this.checkout.cancelSubscription();
      await this.auth.refreshUser();
      this.confirmCancel.set(false);
      this.cancelled.set(true);
    } catch (e) {
      this.cancelError.set((e as Error).message ?? 'Something went wrong.');
    } finally {
      this.cancelling.set(false);
    }
  }

  async startSubscribe() {
    this.subscribing.set(true);
    this.subscribeError.set('');
    try {
      const url = await this.checkout.startCheckout();
      if (url) window.location.href = url;
    } catch (e) {
      this.subscribeError.set((e as Error).message ?? 'Something went wrong.');
    } finally {
      this.subscribing.set(false);
    }
  }

  async copyReferralLink() {
    const link = this.referralLink();
    if (!link) return;
    await navigator.clipboard.writeText(link);
    this.linkCopied.set(true);
    setTimeout(() => this.linkCopied.set(false), 2000);
  }
}
