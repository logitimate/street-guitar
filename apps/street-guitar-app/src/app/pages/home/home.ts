import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CheckoutService } from '../../services/checkout.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  imports: [RouterLink],
})
export class Home {
  auth     = inject(AuthService);
  private checkout = inject(CheckoutService);
  private router   = inject(Router);

  checkoutLoading = false;
  checkoutError   = '';

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }

  async startCheckout() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.checkoutLoading = true;
    this.checkoutError   = '';
    try {
      const url = await this.checkout.startCheckout();
      if (url) window.location.href = url;
    } catch {
      this.checkoutError = 'Something went wrong. Please try again.';
    } finally {
      this.checkoutLoading = false;
    }
  }
}
