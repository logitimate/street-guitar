import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CheckoutService } from '../../services/checkout.service';
import { NavUserChip } from '../../components/nav-user-chip';
import { AccountModal } from '../../components/account-modal';
import { AccountModalService } from '../../services/account-modal.service';
import { AsyncState } from '../../utils/async-state';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  imports: [RouterLink, NavUserChip, AccountModal],
  host: { '(document:keydown.escape)': 'menuOpen.set(false)' },
})
export class Home {
  auth             = inject(AuthService);
  accountModal     = inject(AccountModalService);
  private checkout = inject(CheckoutService);
  private router   = inject(Router);

  /** phone nav dropdown */
  menuOpen = signal(false);

  private _checkout   = new AsyncState();
  checkoutLoading = this._checkout.loading;
  checkoutError   = this._checkout.error;

  async startCheckout() {
    if (this.checkoutLoading()) return;
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.checkoutLoading.set(true);
    this.checkoutError.set('');
    try {
      const url = await this.checkout.startCheckout();
      if (url) window.location.href = url;
    } catch {
      this.checkoutError.set('Something went wrong. Please try again.');
    } finally {
      this.checkoutLoading.set(false);
    }
  }
}
