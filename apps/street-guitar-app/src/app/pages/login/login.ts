import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
  imports: [RouterLink],
})
export class Login {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  loading = signal(false);
  error   = signal('');

  async signInWithGoogle() {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.signInWithGoogle();
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] ?? '/learn';
      this.router.navigateByUrl(returnUrl);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      const cancelled = msg.includes('popup-closed-by-user') ||
                        msg.includes('cancelled-popup-request');
      if (!cancelled) this.error.set('Sign-in failed. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
